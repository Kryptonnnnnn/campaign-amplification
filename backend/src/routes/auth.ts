import { Router } from 'express';
import { z } from 'zod';
import { hashPassword, requireAuth, signToken, verifyPassword, type Req } from '../auth.js';
import { all, id, now, notify, one, run } from '../db.js';
import { serialize } from '../campaign.js';

export const auth = Router();

const Creds = z.object({
  email: z.string().email().max(120).transform((s) => s.toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

auth.post('/auth/register', (req, res) => {
  const p = Creds.extend({ name: z.string().trim().min(1).max(80) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
  if (one('SELECT 1 FROM users WHERE email=?', p.data.email)) return res.status(409).json({ error: 'That email is already registered' });
  const uid = id();
  run('INSERT INTO users (id,email,name,password_hash,created_at) VALUES (?,?,?,?,?)', uid, p.data.email, p.data.name, hashPassword(p.data.password), now());
  const user = { id: uid, email: p.data.email, name: p.data.name, role: 'user' as const };
  notify(uid, 'security', 'Welcome to Amplify', 'Your account was created. Browsing, creating and backing all use this one account.');
  res.status(201).json({ token: signToken(user), user });
});

auth.post('/auth/login', (req, res) => {
  const p = Creds.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Enter a valid email and password' });
  const row = one<any>('SELECT * FROM users WHERE email=?', p.data.email);
  if (!row || !verifyPassword(p.data.password, row.password_hash)) return res.status(401).json({ error: 'Incorrect email or password' });
  const user = { id: row.id, email: row.email, name: row.name, role: row.role };
  // Security alerts matter, but one per day is enough: repeated sign-ins shouldn't flood the feed.
  const recent = one('SELECT 1 FROM notifications WHERE user_id=? AND title=? AND created_at > ?', row.id, 'New sign-in', new Date(Date.now() - 86_400_000).toISOString());
  if (!recent) notify(row.id, 'security', 'New sign-in', 'You signed in on a mobile device. If this wasn\'t you, change your password.');
  res.json({ token: signToken(user), user });
});

auth.get('/me', requireAuth, (req: Req, res) => res.json({ user: req.user }));

auth.put('/me', requireAuth, (req: Req, res) => {
  const p = z.object({ name: z.string().trim().min(1).max(80) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Enter a name' });
  run('UPDATE users SET name=? WHERE id=?', p.data.name, req.user!.id);
  res.json({ user: { ...req.user, name: p.data.name } });
});

// ---- Notifications & preferences ----
export const CATEGORIES_PREF = ['review', 'funding', 'contribution', 'promotion', 'updates', 'security'] as const;

auth.get('/me/notifications', requireAuth, (req: Req, res) => {
  const rows = all('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100', req.user!.id);
  res.json({
    unread: rows.filter((r) => !r.read).length,
    items: rows.map((r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, campaignId: r.campaign_id, read: !!r.read, createdAt: r.created_at })),
  });
});
auth.post('/me/notifications/read', requireAuth, (req: Req, res) => {
  const ids: string[] | undefined = Array.isArray(req.body?.ids) ? req.body.ids : undefined;
  if (ids) for (const i of ids) run('UPDATE notifications SET read=1 WHERE id=? AND user_id=?', i, req.user!.id);
  else run('UPDATE notifications SET read=1 WHERE user_id=?', req.user!.id);
  res.json({ ok: true });
});
auth.get('/me/prefs', requireAuth, (req: Req, res) => {
  const prefs = JSON.parse(one<any>('SELECT prefs FROM users WHERE id=?', req.user!.id)!.prefs);
  res.json(Object.fromEntries(CATEGORIES_PREF.map((k) => [k, prefs[k] !== false])));
});
auth.put('/me/prefs', requireAuth, (req: Req, res) => {
  const p = z.record(z.string(), z.boolean()).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid preferences' });
  const clean: Record<string, boolean> = {};
  for (const k of CATEGORIES_PREF) if (k in p.data) clean[k] = p.data[k];
  clean.security = true; // security alerts can't be muted
  run('UPDATE users SET prefs=? WHERE id=?', JSON.stringify(clean), req.user!.id);
  res.json(clean);
});

// ---- Profile lists ----
auth.get('/me/saved', requireAuth, (req: Req, res) => {
  const rows = all(
    `SELECT c.*, f.kind AS fkind FROM follows f JOIN campaigns c ON c.id=f.campaign_id WHERE f.user_id=?`, req.user!.id);
  res.json({
    saved: rows.filter((r) => r.fkind === 'save').map((r) => serialize(r)),
    following: rows.filter((r) => r.fkind === 'follow').map((r) => serialize(r)),
  });
});

auth.get('/me/contributions', requireAuth, (req: Req, res) => {
  const rows = all(
    `SELECT k.*, c.title, c.cover_image, c.status AS cstatus FROM contributions k JOIN campaigns c ON c.id=k.campaign_id
     WHERE k.user_id=? ORDER BY k.created_at DESC`, req.user!.id);
  res.json({
    items: rows.map((r) => ({
      id: r.id, campaignId: r.campaign_id, campaignTitle: r.title, coverImage: r.cover_image, campaignStatus: r.cstatus,
      amountCents: r.amount_cents, totalCents: r.total_cents, status: r.status, failureReason: r.failure_reason, createdAt: r.created_at, receiptNo: r.receipt_no,
    })),
  });
});
