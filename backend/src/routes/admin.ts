import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, type Req } from '../auth.js';
import { all, audit, now, notify, one, run } from '../db.js';
import { serialize } from '../campaign.js';
import { ASSUMPTIONS, estimateReach } from '../config.js';
import { canTransition, type Status } from '../lifecycle.js';

export const admin = Router();
admin.use('/admin', requireAdmin);

admin.get('/admin/queue', (req, res) => {
  const status = String(req.query.status ?? 'submitted');
  const rows = all('SELECT * FROM campaigns WHERE status=? ORDER BY submitted_at ASC', status);
  res.json({ items: rows.map((r) => serialize(r, { full: true })) });
});

admin.get('/admin/campaigns/:id', (req, res) => {
  const c = one<any>('SELECT * FROM campaigns WHERE id=?', req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const owner = one<any>('SELECT name,email FROM users WHERE id=?', c.owner_id);
  res.json({
    campaign: serialize(c, { full: true }), owner,
    audit: all('SELECT * FROM audit_log WHERE campaign_id=? ORDER BY created_at DESC', c.id),
    checks: distributionChecks(c),
  });
});

admin.post('/admin/campaigns/:id/decision', (req: Req, res) => {
  const p = z.object({ action: z.enum(['approve', 'request_changes', 'reject']), note: z.string().trim().max(1000).optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid decision' });
  if (p.data.action !== 'approve' && !p.data.note) return res.status(400).json({ error: 'A note is required so the creator knows what to fix' });
  const c = one<any>('SELECT * FROM campaigns WHERE id=?', req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const to: Status = { approve: 'approved', request_changes: 'changes_requested', reject: 'rejected' }[p.data.action] as Status;
  if (!canTransition(c.status, to)) return res.status(409).json({ error: `Can't ${p.data.action} a campaign that is "${c.status}"` });
  audit(c.id, req.user!.id, p.data.action, c.status, to, p.data.note);
  if (to === 'approved') {
    // Approval makes the campaign available for funding (recorded as two audited steps).
    const deadline = new Date(Date.now() + 30 * 86_400_000).toISOString();
    run(`UPDATE campaigns SET status='funding', published_at=?, deadline=?, reviewer_note=?, updated_at=? WHERE id=?`, now(), deadline, p.data.note ?? null, now(), c.id);
    audit(c.id, req.user!.id, 'published', 'approved', 'funding');
    notify(c.owner_id, 'review', 'Campaign approved', `"${c.title}" passed review and is now open for backing (30-day funding period).`, c.id);
  } else {
    run(`UPDATE campaigns SET status=?, reviewer_note=?, updated_at=? WHERE id=?`, to, p.data.note ?? null, now(), c.id);
    notify(c.owner_id, 'review', to === 'rejected' ? 'Campaign not approved' : 'Changes requested', `"${c.title}": ${p.data.note}`, c.id);
  }
  res.json({ campaign: serialize(one('SELECT * FROM campaigns WHERE id=?', c.id), { full: true }) });
});

/** Conditions that must hold before ads may run. Funding alone is never enough. */
function distributionChecks(c: any) {
  const v = JSON.parse(c.visuals || '{}'); const r = JSON.parse(c.reach || '{}');
  const paid = one<any>(`SELECT COUNT(*) n FROM contributions WHERE campaign_id=? AND status='succeeded'`, c.id)!.n;
  const pending = one<any>(`SELECT COUNT(*) n FROM contributions WHERE campaign_id=? AND status='pending'`, c.id)!.n;
  return {
    approved: !!c.published_at,
    paymentsSettled: paid > 0 && pending === 0,
    budgetAvailable: c.raised_cents > 0,
    adCreativeReady: !!v.adImages?.length,
    channelsConfigured: !!r.channels?.length,
  };
}

admin.post('/admin/campaigns/:id/advance', (req: Req, res) => {
  const p = z.object({ to: z.enum(['funding_ended', 'distribution_prep', 'promoting', 'completed', 'refund_pending', 'refunded', 'failed']) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid state' });
  const c = one<any>('SELECT * FROM campaigns WHERE id=?', req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (!canTransition(c.status, p.data.to)) return res.status(409).json({ error: `Can't move from "${c.status}" to "${p.data.to}"` });
  if (p.data.to === 'promoting') {
    const checks = distributionChecks(c);
    const missing = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
    if (missing.length) return res.status(422).json({ error: 'Distribution conditions not met', missing });
    run(`INSERT OR IGNORE INTO reports (campaign_id,ad_spend_cents,impressions,measured_reach,clicks,updated_at) VALUES (?,0,0,0,0,?)`, c.id, now());
  }
  if (p.data.to === 'completed') {
    // Finalise the demo report using the model's own numbers, with measured-style variance.
    const budget = c.raised_cents - Math.round(c.raised_cents * ASSUMPTIONS.platformFeePct / 100);
    const impressions = Math.round((budget / ASSUMPTIONS.cpmCents) * 1000 * 1.04);
    run(`INSERT INTO reports (campaign_id,ad_spend_cents,impressions,measured_reach,clicks,final,updated_at) VALUES (?,?,?,?,?,1,?)
         ON CONFLICT(campaign_id) DO UPDATE SET ad_spend_cents=excluded.ad_spend_cents, impressions=excluded.impressions, measured_reach=excluded.measured_reach, clicks=excluded.clicks, final=1, updated_at=excluded.updated_at`,
      c.id, budget, impressions, Math.round(estimateReach(budget) * 0.96), Math.round(impressions * 0.013), now());
  }
  if (p.data.to === 'refunded') {
    // Mark every settled contribution refunded and tell each backer. (Simulated: no real money moves.)
    const paid = all<any>(`SELECT id,user_id,total_cents FROM contributions WHERE campaign_id=? AND status='succeeded'`, c.id);
    run(`UPDATE contributions SET status='refunded' WHERE campaign_id=? AND status IN ('succeeded','pending')`, c.id);
    for (const k of paid) notify(k.user_id, 'contribution', 'Refund issued', `$${(k.total_cents / 100).toFixed(2)} was refunded for "${c.title}".`, c.id);
  }
  run('UPDATE campaigns SET status=?, updated_at=? WHERE id=?', p.data.to, now(), c.id);
  audit(c.id, req.user!.id, 'advance', c.status, p.data.to);
  const msg: Partial<Record<Status, [string, string, string]>> = {
    distribution_prep: ['promotion', 'Preparing distribution', `"${c.title}" is being set up with ad partners.`],
    promoting: ['promotion', 'Promotion has begun', `Ads for "${c.title}" are now running.`],
    completed: ['promotion', 'Campaign completed', `"${c.title}" has finished. The final report is available.`],
  };
  const m = msg[p.data.to];
  if (m) {
    const audience = new Set<string>([c.owner_id,
      ...all<any>(`SELECT DISTINCT user_id FROM contributions WHERE campaign_id=? AND status='succeeded' AND user_id IS NOT NULL`, c.id).map((x) => x.user_id),
      ...all<any>(`SELECT user_id FROM follows WHERE campaign_id=? AND kind='follow'`, c.id).map((x) => x.user_id)]);
    for (const uid of audience) notify(uid, m[0], m[1], m[2], c.id);
  }
  res.json({ campaign: serialize(one('SELECT * FROM campaigns WHERE id=?', c.id), { full: true }) });
});

// ---- Change requests on live campaigns ----
admin.get('/admin/change-requests', (_req, res) => {
  res.json({ items: all(`SELECT r.id,r.note,r.status,r.created_at AS createdAt,c.id AS campaignId,c.title,c.status AS campaignStatus FROM change_requests r JOIN campaigns c ON c.id=r.campaign_id WHERE r.status='pending' ORDER BY r.created_at ASC`) });
});
admin.post('/admin/change-requests/:id/resolve', (req: Req, res) => {
  const p = z.object({ action: z.enum(['accept', 'decline']), note: z.string().trim().min(3).max(500) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'A note is required so the creator knows the outcome' });
  const r = one<any>(`SELECT * FROM change_requests WHERE id=? AND status='pending'`, req.params.id);
  if (!r) return res.status(404).json({ error: 'Request not found or already resolved' });
  const c = one<any>('SELECT id,title,owner_id,status FROM campaigns WHERE id=?', r.campaign_id)!;
  run(`UPDATE change_requests SET status=?, resolution_note=?, resolved_at=? WHERE id=?`, p.data.action === 'accept' ? 'accepted' : 'declined', p.data.note, now(), r.id);
  audit(c.id, req.user!.id, `change_${p.data.action}ed`, c.status, c.status, p.data.note);
  notify(c.owner_id, 'review', p.data.action === 'accept' ? 'Change request accepted' : 'Change request declined', `"${c.title}": ${p.data.note}`, c.id);
  res.json({ ok: true });
});

// ---- Comment moderation ----
admin.get('/admin/comment-reports', (_req, res) => {
  res.json({ items: all(`SELECT r.id,r.reason,r.created_at AS createdAt,m.id AS commentId,m.body,m.status AS commentStatus,u.name AS author,c.title
    FROM comment_reports r JOIN comments m ON m.id=r.comment_id JOIN users u ON u.id=m.user_id JOIN campaigns c ON c.id=m.campaign_id WHERE r.status='open' ORDER BY r.created_at ASC`) });
});
admin.post('/admin/comment-reports/:id/resolve', (req: Req, res) => {
  const p = z.object({ action: z.enum(['hide', 'dismiss']) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid action' });
  const r = one<any>(`SELECT * FROM comment_reports WHERE id=? AND status='open'`, req.params.id);
  if (!r) return res.status(404).json({ error: 'Report not found' });
  if (p.data.action === 'hide') {
    run(`UPDATE comments SET status='hidden' WHERE id=?`, r.comment_id);
    run(`UPDATE comment_reports SET status='actioned' WHERE comment_id=?`, r.comment_id);
    audit('comment:' + r.comment_id, req.user!.id, 'comment_hidden');
  } else run(`UPDATE comment_reports SET status='dismissed' WHERE id=?`, r.id);
  res.json({ ok: true });
});

// Demo helper: simulate a batch of ad delivery while promoting.
admin.post('/admin/campaigns/:id/delivery', (req: Req, res) => {
  const c = one<any>('SELECT * FROM campaigns WHERE id=?', req.params.id);
  if (!c || c.status !== 'promoting') return res.status(409).json({ error: 'Campaign is not promoting' });
  const budget = c.raised_cents - Math.round(c.raised_cents * ASSUMPTIONS.platformFeePct / 100);
  const r = one<any>('SELECT * FROM reports WHERE campaign_id=?', c.id)!;
  const spend = Math.min(budget, r.ad_spend_cents + Math.round(budget * 0.25));
  const impressions = Math.round((spend / ASSUMPTIONS.cpmCents) * 1000);
  run(`UPDATE reports SET ad_spend_cents=?, impressions=?, measured_reach=?, clicks=?, updated_at=? WHERE campaign_id=?`,
    spend, impressions, Math.round(impressions / ASSUMPTIONS.avgFrequency), Math.round(impressions * 0.012), now(), c.id);
  if (spend / budget >= 0.5 && r.ad_spend_cents / budget < 0.5)
    notify(c.owner_id, 'promotion', 'Distribution progress', `"${c.title}" has delivered over half of its advertising budget.`, c.id);
  audit(c.id, req.user!.id, 'delivery_sync', 'promoting', 'promoting', `Spend ${spend}¢ of ${budget}¢`);
  res.json({ ok: true });
});
