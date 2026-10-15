import { Router } from 'express';
import { z } from 'zod';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { requireAuth, type Req } from '../auth.js';
import { all, audit, id, now, notify, one, run } from '../db.js';
import { DraftPatchSchema, serialize, validateForSubmit } from '../campaign.js';
import { ASSUMPTIONS, CATEGORIES, CHANNELS, estimateReach, feeBreakdown } from '../config.js';
import { BACKABLE, BACKER_VISIBLE, canTransition, EDITABLE, PUBLIC, type Status } from '../lifecycle.js';

export const campaigns = Router();

/** Lazily close funding periods that have passed their deadline. */
export function settleDeadlines() {
  const due = all<any>(`SELECT id,owner_id,title FROM campaigns WHERE status='funding' AND deadline < ?`, now());
  for (const c of due) {
    run(`UPDATE campaigns SET status='funding_ended', updated_at=? WHERE id=?`, now(), c.id);
    audit(c.id, null, 'funding_period_ended', 'funding', 'funding_ended');
    notify(c.owner_id, 'funding', 'Funding period ended', `"${c.title}" is now waiting for distribution preparation.`, c.id);
  }
}

const inPlaceholders = (xs: string[]) => xs.map(() => '?').join(',');

campaigns.get('/meta', (_req, res) => {
  res.json({ categories: CATEGORIES, channels: CHANNELS, assumptions: ASSUMPTIONS, perDollarReach: estimateReach(Math.round(100 * (1 - ASSUMPTIONS.platformFeePct / 100))) });
});

// ---------- Discovery ----------
campaigns.get('/campaigns', (req, res) => {
  settleDeadlines();
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const category = String(req.query.category ?? '');
  const sort = String(req.query.sort ?? 'trending');
  const open = req.query.open === '1';
  const maxGoal = Number(req.query.maxGoalCents) || null;
  const where = [`status IN (${inPlaceholders(PUBLIC)})`];
  const params: any[] = [...PUBLIC];
  if (open) where.push(`status='funding'`);
  if (category && category !== 'All') { where.push('category=?'); params.push(category); }
  if (maxGoal) { where.push('goal_cents<=?'); params.push(maxGoal); }
  if (q) {
    where.push('(LOWER(title) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(creator_name) LIKE ? OR LOWER(category) LIKE ?)');
    params.push(...Array(4).fill(`%${q}%`));
  }
  const order: Record<string, string> = {
    trending: 'backers_count DESC, raised_cents DESC',
    newest: 'published_at DESC',
    ending: `CASE WHEN status='funding' THEN 0 ELSE 1 END, deadline ASC`,
    funded: '(CAST(raised_cents AS REAL)/goal_cents) DESC',
  };
  const rows = all(`SELECT * FROM campaigns WHERE ${where.join(' AND ')} ORDER BY ${order[sort] ?? order.trending} LIMIT 60`, ...params);
  res.json({ items: rows.map((r) => serialize(r)), total: rows.length });
});

campaigns.get('/campaigns/featured', (_req, res) => {
  settleDeadlines();
  const rows = all(`SELECT * FROM campaigns WHERE status='funding' ORDER BY raised_cents DESC LIMIT 5`);
  res.json({ items: rows.map((r) => serialize(r)) });
});

// ---------- Creator: list own ----------
campaigns.get('/me/campaigns', requireAuth, (req: Req, res) => {
  settleDeadlines();
  const rows = all('SELECT * FROM campaigns WHERE owner_id=? ORDER BY updated_at DESC', req.user!.id);
  res.json({ items: rows.map((r) => serialize(r, { full: true })) });
});

// ---------- Detail ----------
campaigns.get('/campaigns/:id', (req: Req, res) => {
  settleDeadlines();
  const c = one<any>('SELECT * FROM campaigns WHERE id=?', req.params.id);
  const isOwner = c && req.user && (c.owner_id === req.user.id || req.user.role === 'admin');
  const isBacker = c && req.user && BACKER_VISIBLE.includes(c.status) && !!one('SELECT 1 FROM contributions WHERE user_id=? AND campaign_id=?', req.user.id, c.id);
  if (!c || (!PUBLIC.includes(c.status) && !isOwner && !isBacker)) return res.status(404).json({ error: 'Campaign not found' });
  const updates = all('SELECT id,title,body,created_at AS createdAt FROM updates WHERE campaign_id=? ORDER BY created_at DESC', c.id);
  // Backers are private by default; only those who opted in are named.
  const backers = all<any>(
    `SELECT display_name,public,amount_cents FROM contributions WHERE campaign_id=? AND status='succeeded' ORDER BY created_at DESC LIMIT 8`, c.id)
    .map((b) => ({ name: b.public && b.display_name ? b.display_name : 'Anonymous backer', amountCents: b.amount_cents }));
  const state = req.user ? {
    saved: !!one('SELECT 1 FROM follows WHERE user_id=? AND campaign_id=? AND kind=?', req.user.id, c.id, 'save'),
    following: !!one('SELECT 1 FROM follows WHERE user_id=? AND campaign_id=? AND kind=?', req.user.id, c.id, 'follow'),
    backed: !!one(`SELECT 1 FROM contributions WHERE user_id=? AND campaign_id=? AND status='succeeded'`, req.user.id, c.id),
    isOwner: c.owner_id === req.user.id,
  } : { saved: false, following: false, backed: false, isOwner: false };
  res.json({
    campaign: serialize(c, { full: !!isOwner }), updates, backers, state,
    useOfFunds: feeBreakdown(100_00),
    canBack: BACKABLE.includes(c.status),
  });
});

campaigns.post('/campaigns/:id/follow', requireAuth, (req: Req, res) => {
  const p = z.object({ kind: z.enum(['follow', 'save']), on: z.boolean() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid request' });
  const c = one('SELECT id FROM campaigns WHERE id=?', req.params.id);
  if (!c) return res.status(404).json({ error: 'Campaign not found' });
  if (p.data.on) run('INSERT OR IGNORE INTO follows (user_id,campaign_id,kind) VALUES (?,?,?)', req.user!.id, req.params.id, p.data.kind);
  else run('DELETE FROM follows WHERE user_id=? AND campaign_id=? AND kind=?', req.user!.id, req.params.id, p.data.kind);
  res.json({ ok: true });
});

// "Did the visuals make you continue? Did the message change your mind?"
campaigns.post('/campaigns/:id/feedback', (req: Req, res) => {
  const opt = z.enum(['No', 'Somewhat', 'Yes']);
  const p = z.object({ visuals: opt, persuaded: opt }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Choose No, Somewhat or Yes' });
  if (!one('SELECT id FROM campaigns WHERE id=?', req.params.id)) return res.status(404).json({ error: 'Campaign not found' });
  run('INSERT INTO feedback (id,campaign_id,user_id,visuals,persuaded,created_at) VALUES (?,?,?,?,?,?)',
    id(), req.params.id, req.user?.id ?? null, p.data.visuals, p.data.persuaded, now());
  res.status(201).json({ ok: true });
});

// ---------- Report ----------
campaigns.get('/campaigns/:id/report', (req: Req, res) => {
  const c = one<any>('SELECT * FROM campaigns WHERE id=?', req.params.id);
  if (!c || !PUBLIC.includes(c.status)) return res.status(404).json({ error: 'Campaign not found' });
  const r = one<any>('SELECT * FROM reports WHERE campaign_id=?', c.id);
  const platformFee = Math.round(c.raised_cents * ASSUMPTIONS.platformFeePct / 100);
  const adBudget = c.raised_cents - platformFee;
  const fb = all<any>('SELECT visuals,persuaded FROM feedback WHERE campaign_id=?', c.id);
  const tally = (k: 'visuals' | 'persuaded') => ({ No: 0, Somewhat: 0, Yes: 0, ...Object.fromEntries(['No', 'Somewhat', 'Yes'].map((o) => [o, fb.filter((f) => f[k] === o).length])) });
  res.json({
    campaignId: c.id, status: c.status,
    // Funding facts
    fundsRaisedCents: c.raised_cents, platformFeeCents: platformFee, advertisingBudgetCents: adBudget,
    // Estimates are model output; measured figures only exist once delivery has started.
    estimated: { reach: estimateReach(adBudget), basis: `$${ASSUMPTIONS.cpmCents / 100} CPM, ${ASSUMPTIONS.avgFrequency} avg. frequency (demo assumptions)` },
    measured: r ? {
      adSpendCents: r.ad_spend_cents, impressions: r.impressions, reach: r.measured_reach, clicks: r.clicks,
      ctr: r.impressions ? +(r.clicks / r.impressions * 100).toFixed(2) : 0, final: !!r.final, updatedAt: r.updated_at,
    } : null,
    audienceFeedback: { total: fb.length, visuals: tally('visuals'), persuaded: tally('persuaded') },
    note: r ? 'Measured figures come from advertising platform delivery data (simulated in this prototype).' : 'Promotion has not started. No delivery has been measured yet.',
  });
});

// ---------- Creator: drafts ----------
function loadOwned(req: Req, res: any) {
  const c = one<any>('SELECT * FROM campaigns WHERE id=?', req.params.id);
  if (!c || (c.owner_id !== req.user!.id)) { res.status(404).json({ error: 'Campaign not found' }); return null; }
  return c;
}

campaigns.post('/campaigns', requireAuth, (req: Req, res) => {
  const cid = id();
  run(`INSERT INTO campaigns (id,owner_id,creator_name,created_at,updated_at) VALUES (?,?,?,?,?)`, cid, req.user!.id, req.user!.name, now(), now());
  audit(cid, req.user!.id, 'draft_created');
  res.status(201).json({ campaign: serialize(one('SELECT * FROM campaigns WHERE id=?', cid), { full: true }) });
});

// Autosave target. Accepts partial bodies; only editable states may change.
campaigns.put('/campaigns/:id', requireAuth, (req: Req, res) => {
  const c = loadOwned(req, res); if (!c) return;
  if (!EDITABLE.includes(c.status)) return res.status(409).json({ error: 'This campaign is locked while it is under review or live. Material changes need a new review.' });
  const p = DraftPatchSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues[0].path.join('.') + ': ' + p.error.issues[0].message });
  const d = p.data;
  const sets: string[] = []; const vals: any[] = [];
  const set = (col: string, v: any) => { sets.push(`${col}=?`); vals.push(v); };
  if (d.step !== undefined) set('step', d.step);
  if (d.title !== undefined) set('title', d.title);
  if (d.category !== undefined) set('category', d.category);
  if (d.creatorName !== undefined) set('creator_name', d.creatorName);
  if (d.creatorType !== undefined) set('creator_type', d.creatorType);
  if (d.summary !== undefined) set('summary', d.summary);
  if (d.coverImage !== undefined) set('cover_image', d.coverImage);
  if (d.story !== undefined) set('story', JSON.stringify(d.story));
  if (d.visuals !== undefined) set('visuals', JSON.stringify(d.visuals));
  if (d.reach !== undefined) set('reach', JSON.stringify(d.reach));
  // The funding goal is only ever set by the creator, explicitly, in this field.
  if (d.goalCents !== undefined) set('goal_cents', d.goalCents);
  if (sets.length) run(`UPDATE campaigns SET ${sets.join(',')}, updated_at=? WHERE id=?`, ...vals, now(), c.id);
  res.json({ campaign: serialize(one('SELECT * FROM campaigns WHERE id=?', c.id), { full: true }), savedAt: now() });
});

campaigns.delete('/campaigns/:id', requireAuth, (req: Req, res) => {
  const c = loadOwned(req, res); if (!c) return;
  if (c.status !== 'draft') return res.status(409).json({ error: 'Only drafts can be deleted' });
  run('DELETE FROM audit_log WHERE campaign_id=?', c.id);
  run('DELETE FROM campaigns WHERE id=?', c.id);
  res.json({ ok: true });
});

campaigns.post('/campaigns/:id/submit', requireAuth, (req: Req, res) => {
  const c = loadOwned(req, res); if (!c) return;
  if (!canTransition(c.status as Status, 'submitted')) return res.status(409).json({ error: `A campaign that is "${c.status}" can't be submitted` });
  if (req.body?.acceptedRules !== true) return res.status(400).json({ error: 'Confirm the campaign rules to submit', fields: { rules: 'Please confirm the campaign rules' } });
  const errors = validateForSubmit(c);
  if (Object.keys(errors).length) return res.status(422).json({ error: 'Some details are missing', fields: errors });
  run(`UPDATE campaigns SET status='submitted', submitted_at=?, updated_at=?, version=version+1, reviewer_note=NULL WHERE id=?`, now(), now(), c.id);
  audit(c.id, req.user!.id, 'submitted', c.status, 'submitted');
  notify(req.user!.id, 'review', 'Submission received', `"${c.title}" is in the review queue. We usually respond within 2 business days.`, c.id);
  res.json({ campaign: serialize(one('SELECT * FROM campaigns WHERE id=?', c.id), { full: true }) });
});

campaigns.post('/campaigns/:id/updates', requireAuth, (req: Req, res) => {
  const c = loadOwned(req, res); if (!c) return;
  if (!PUBLIC.includes(c.status)) return res.status(409).json({ error: 'Updates can be posted once the campaign is live' });
  const p = z.object({ title: z.string().trim().min(1).max(100), body: z.string().trim().min(1).max(1000) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Add a title and a message' });
  run('INSERT INTO updates (id,campaign_id,title,body,created_at) VALUES (?,?,?,?,?)', id(), c.id, p.data.title, p.data.body, now());
  for (const f of all<any>(`SELECT user_id FROM follows WHERE campaign_id=? AND kind='follow'`, c.id))
    notify(f.user_id, 'updates', `Update: ${c.title}`, p.data.title, c.id);
  res.status(201).json({ ok: true });
});

// ---------- Uploads (basic validation; stored locally for the prototype) ----------
const UPLOAD_DIR = join(process.cwd(), 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

campaigns.post('/uploads', requireAuth, (req: Req, res) => {
  const p = z.object({ mime: z.string(), data: z.string().max(5_000_000) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid upload' });
  const ext = EXT[p.data.mime];
  if (!ext) return res.status(415).json({ error: 'Only JPG, PNG or WebP images are supported' });
  const buf = Buffer.from(p.data.data, 'base64');
  if (buf.length > 3_500_000) return res.status(413).json({ error: 'Image must be under 3.5 MB' });
  if (buf.length < 1000) return res.status(400).json({ error: 'That image looks empty or corrupted' });
  const name = `${id()}.${ext}`;
  writeFileSync(join(UPLOAD_DIR, name), buf);
  res.status(201).json({ url: `/uploads/${name}` });
});

// ---------- AI-assisted drafting (demo mode: deterministic heuristics, no external call) ----------
const KEYWORDS: Record<string, string[]> = {
  Environment: ['climate', 'forest', 'ocean', 'plastic', 'energy', 'wildlife', 'green', 'emission'],
  Health: ['health', 'mental', 'vaccine', 'clinic', 'disease', 'nutrition', 'sleep'],
  Science: ['research', 'study', 'science', 'space', 'lab'],
  Education: ['school', 'student', 'teacher', 'literacy', 'learn', 'education'],
  'Public Policy': ['law', 'vote', 'policy', 'government', 'rights', 'election'],
  'Economic Policy': ['tax', 'wage', 'inflation', 'trade', 'housing', 'economy'],
  Community: ['neighbor', 'community', 'local', 'volunteer', 'city'],
  'Arts & Culture': ['art', 'music', 'film', 'museum', 'culture', 'theatre'],
  Business: ['business', 'startup', 'market', 'customer'],
};
campaigns.post('/ai/draft', requireAuth, (req: Req, res) => {
  const p = z.object({ idea: z.string().trim().min(10, 'Tell us a little more (at least a sentence)').max(3000) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
  const idea = p.data.idea.replace(/\s+/g, ' ');
  const lower = idea.toLowerCase();
  const category = Object.entries(KEYWORDS).map(([k, ws]) => [k, ws.filter((w) => lower.includes(w)).length] as const).sort((a, b) => b[1] - a[1])[0];
  const firstSentence = idea.split(/(?<=[.!?])\s/)[0];
  const title = firstSentence.length <= 60 ? firstSentence.replace(/[.!?]$/, '') : firstSentence.slice(0, 57).replace(/\s+\S*$/, '') + '…';
  res.json({
    mode: 'demo',
    notice: 'Demo AI mode: suggestions are generated locally from your words. Edit anything before using it.',
    suggestion: {
      title, category: category[1] > 0 ? category[0] : 'Other',
      summary: idea.length > 280 ? idea.slice(0, 277) + '…' : idea,
      story: { intro: idea.slice(0, 600) },
    },
  });
});
