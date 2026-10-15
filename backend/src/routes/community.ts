import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type Req } from '../auth.js';
import { all, audit, id, now, notify, one, run } from '../db.js';
import { canTransition, PUBLIC, type Status } from '../lifecycle.js';

export const community = Router();

const ownedBy = (cid: unknown, uid: string) => one<any>('SELECT * FROM campaigns WHERE id=? AND owner_id=?', String(cid), uid);

// ---------- Creator: cancel ----------
community.post('/campaigns/:id/cancel', requireAuth, (req: Req, res) => {
  const c = ownedBy(req.params.id, req.user!.id);
  if (!c) return res.status(404).json({ error: 'Campaign not found' });
  if (!canTransition(c.status as Status, 'cancelled'))
    return res.status(409).json({ error: `A campaign that is "${c.status}" can't be cancelled by its creator. Contact support if you need help.` });
  const paid = one<any>(`SELECT COUNT(*) n FROM contributions WHERE campaign_id=? AND status='succeeded'`, c.id)!.n;
  run(`UPDATE campaigns SET status='cancelled', updated_at=? WHERE id=?`, now(), c.id);
  audit(c.id, req.user!.id, 'cancelled_by_creator', c.status, 'cancelled', String(req.body?.reason ?? '').slice(0, 300));
  let finalStatus = 'cancelled';
  if (paid > 0) {
    // Backers have paid in: refunds are owed and tracked, never silently dropped.
    run(`UPDATE campaigns SET status='refund_pending' WHERE id=?`, c.id);
    audit(c.id, null, 'refund_required', 'cancelled', 'refund_pending', `${paid} contribution(s) to refund`);
    finalStatus = 'refund_pending';
    for (const b of all<any>(`SELECT DISTINCT user_id FROM contributions WHERE campaign_id=? AND status='succeeded' AND user_id IS NOT NULL`, c.id))
      notify(b.user_id, 'contribution', 'Campaign cancelled: refund on the way', `The creator cancelled "${c.title}". Your contribution will be refunded in full.`, c.id);
  }
  notify(req.user!.id, 'review', 'Campaign cancelled', `"${c.title}" was cancelled.${paid ? ' Backers will be refunded.' : ''}`, c.id);
  res.json({ status: finalStatus, refundsOwed: paid });
});

// ---------- Creator: backer activity (privacy-preserving) ----------
community.get('/campaigns/:id/activity', requireAuth, (req: Req, res) => {
  const c = ownedBy(req.params.id, req.user!.id);
  if (!c) return res.status(404).json({ error: 'Campaign not found' });
  const rows = all<any>(`SELECT amount_cents,status,created_at FROM contributions WHERE campaign_id=? ORDER BY created_at DESC LIMIT 20`, c.id);
  // Creators see amounts and timing only, never identities or payment details.
  res.json({ items: rows.map((r) => ({ amountCents: r.amount_cents, status: r.status, createdAt: r.created_at })) });
});

// ---------- Material change requests for live campaigns ----------
community.post('/campaigns/:id/change-requests', requireAuth, (req: Req, res) => {
  const c = ownedBy(req.params.id, req.user!.id);
  if (!c) return res.status(404).json({ error: 'Campaign not found' });
  if (!PUBLIC.includes(c.status) || c.status === 'completed') return res.status(409).json({ error: 'Change requests are for live campaigns' });
  const p = z.object({ note: z.string().trim().min(10, 'Describe the change in at least 10 characters').max(1000) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
  if (one('SELECT 1 FROM change_requests WHERE campaign_id=? AND status=?', c.id, 'pending')) return res.status(409).json({ error: 'You already have a change request waiting for review' });
  run('INSERT INTO change_requests (id,campaign_id,user_id,note,created_at) VALUES (?,?,?,?,?)', id(), c.id, req.user!.id, p.data.note, now());
  audit(c.id, req.user!.id, 'change_requested', c.status, c.status, p.data.note);
  notify(req.user!.id, 'review', 'Change request received', `Reviewers will look at your requested change to "${c.title}". Ads aren't updated until it's approved.`, c.id);
  res.status(201).json({ ok: true });
});

community.get('/campaigns/:id/change-requests', requireAuth, (req: Req, res) => {
  if (!ownedBy(req.params.id, req.user!.id)) return res.status(404).json({ error: 'Campaign not found' });
  res.json({ items: all('SELECT id,note,status,resolution_note AS resolutionNote,created_at AS createdAt,resolved_at AS resolvedAt FROM change_requests WHERE campaign_id=? ORDER BY created_at DESC', req.params.id) });
});

// ---------- Comments (moderated, privacy-preserving) ----------
const BLOCKED = /\b(fuck|shit|bitch|asshole|nazi|kill yourself)\b/i;
const publicName = (full: string) => { const [first, ...rest] = full.trim().split(/\s+/); return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first; };

community.get('/campaigns/:id/comments', (req: Req, res) => {
  const c = one<any>('SELECT status FROM campaigns WHERE id=?', req.params.id);
  if (!c || !PUBLIC.includes(c.status)) return res.status(404).json({ error: 'Campaign not found' });
  const rows = all<any>(
    `SELECT m.id,m.parent_id,m.body,m.created_at,m.user_id,u.name FROM comments m JOIN users u ON u.id=m.user_id
     WHERE m.campaign_id=? AND m.status='visible' ORDER BY m.created_at ASC LIMIT 200`, req.params.id);
  // Only first name + last initial is public; the id is only used to flag the viewer's own comments.
  res.json({
    items: rows.map((r) => ({ id: r.id, parentId: r.parent_id, body: r.body, author: publicName(r.name), mine: req.user?.id === r.user_id, createdAt: r.created_at })),
  });
});

const lastPost = new Map<string, number>();
community.post('/campaigns/:id/comments', requireAuth, (req: Req, res) => {
  const c = one<any>('SELECT status FROM campaigns WHERE id=?', req.params.id);
  if (!c || !PUBLIC.includes(c.status)) return res.status(404).json({ error: 'Campaign not found' });
  const p = z.object({ body: z.string().trim().min(2, 'Write a little more').max(500, 'Keep comments under 500 characters'), parentId: z.string().optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
  if (BLOCKED.test(p.data.body)) return res.status(422).json({ error: 'This comment breaks our community guidelines. Please rephrase it.' });
  if (/https?:\/\//i.test(p.data.body)) return res.status(422).json({ error: 'Links aren’t allowed in comments.' });
  const last = lastPost.get(req.user!.id) ?? 0;
  if (Date.now() - last < 5000) return res.status(429).json({ error: 'You’re posting too fast. Wait a few seconds.' });
  if (p.data.parentId) {
    const parent = one<any>('SELECT parent_id,campaign_id,user_id FROM comments WHERE id=?', p.data.parentId);
    if (!parent || parent.campaign_id !== req.params.id || parent.parent_id) return res.status(400).json({ error: 'You can reply to top-level comments only' });
    if (parent.user_id !== req.user!.id) notify(parent.user_id, 'updates', 'New reply to your comment', p.data.body.slice(0, 100), String(req.params.id));
  }
  lastPost.set(req.user!.id, Date.now());
  run('INSERT INTO comments (id,campaign_id,user_id,parent_id,body,created_at) VALUES (?,?,?,?,?,?)', id(), req.params.id, req.user!.id, p.data.parentId ?? null, p.data.body, now());
  res.status(201).json({ ok: true });
});

community.delete('/comments/:id', requireAuth, (req: Req, res) => {
  const m = one<any>('SELECT user_id FROM comments WHERE id=?', req.params.id);
  if (!m || m.user_id !== req.user!.id) return res.status(404).json({ error: 'Comment not found' });
  run(`UPDATE comments SET status='hidden' WHERE id=? OR parent_id=?`, req.params.id, req.params.id);
  res.json({ ok: true });
});

community.post('/comments/:id/report', requireAuth, (req: Req, res) => {
  const p = z.object({ reason: z.enum(['spam', 'abuse', 'misinformation', 'other']) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Choose a reason' });
  if (!one('SELECT 1 FROM comments WHERE id=?', req.params.id)) return res.status(404).json({ error: 'Comment not found' });
  run('INSERT OR IGNORE INTO comment_reports (id,comment_id,user_id,reason,created_at) VALUES (?,?,?,?,?)', id(), req.params.id, req.user!.id, p.data.reason, now());
  res.status(201).json({ ok: true });
});
