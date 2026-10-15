import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

export const db = new DatabaseSync(process.env.DB_PATH ?? 'data.db');
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user',
  prefs TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'draft', step INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL DEFAULT '', category TEXT, creator_name TEXT NOT NULL DEFAULT '',
  creator_type TEXT NOT NULL DEFAULT 'Individual',
  summary TEXT NOT NULL DEFAULT '', cover_image TEXT,
  story TEXT NOT NULL DEFAULT '{}',   -- {headline,intro,sections[],stats[],sources[],actions[]}
  visuals TEXT NOT NULL DEFAULT '{}', -- {adImages[],headline,description,cta}
  reach TEXT NOT NULL DEFAULT '{}',   -- {locations[],interests[],channels[],durationDays}
  goal_cents INTEGER, raised_cents INTEGER NOT NULL DEFAULT 0, backers_count INTEGER NOT NULL DEFAULT 0,
  reviewer_note TEXT, version INTEGER NOT NULL DEFAULT 1,
  submitted_at TEXT, published_at TEXT, deadline TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  user_id TEXT REFERENCES users(id), guest_email TEXT,
  amount_cents INTEGER NOT NULL, platform_fee_cents INTEGER NOT NULL,
  processing_fee_cents INTEGER NOT NULL, total_cents INTEGER NOT NULL,
  status TEXT NOT NULL, -- pending | succeeded | failed | cancelled | refunded
  failure_reason TEXT, display_name TEXT, public INTEGER NOT NULL DEFAULT 0,
  receipt_no TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL,
  title TEXT NOT NULL, body TEXT NOT NULL, campaign_id TEXT, read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS follows (
  user_id TEXT NOT NULL, campaign_id TEXT NOT NULL, kind TEXT NOT NULL, -- follow | save
  PRIMARY KEY (user_id, campaign_id, kind)
);
CREATE TABLE IF NOT EXISTS updates (
  id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, actor_id TEXT, action TEXT NOT NULL,
  from_status TEXT, to_status TEXT, note TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, user_id TEXT, visuals TEXT, persuaded TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS change_requests (
  id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, user_id TEXT NOT NULL, note TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', resolution_note TEXT, created_at TEXT NOT NULL, resolved_at TEXT
);
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, user_id TEXT NOT NULL, parent_id TEXT,
  body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'visible', -- visible | hidden
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS comment_reports (
  id TEXT PRIMARY KEY, comment_id TEXT NOT NULL, user_id TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL,
  UNIQUE (comment_id, user_id)
);
CREATE TABLE IF NOT EXISTS reports (
  campaign_id TEXT PRIMARY KEY, ad_spend_cents INTEGER NOT NULL, impressions INTEGER NOT NULL,
  measured_reach INTEGER NOT NULL, clicks INTEGER NOT NULL, final INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
`);

export const id = () => randomUUID();
export const now = () => new Date().toISOString();

type Row = Record<string, any>;
export const one = <T = Row>(sql: string, ...p: any[]) => db.prepare(sql).get(...p) as T | undefined;
export const all = <T = Row>(sql: string, ...p: any[]) => db.prepare(sql).all(...p) as T[];
export const run = (sql: string, ...p: any[]) => db.prepare(sql).run(...p);

export function notify(userId: string | null | undefined, kind: string, title: string, body: string, campaignId?: string) {
  if (!userId) return;
  const u = one<{ prefs: string }>('SELECT prefs FROM users WHERE id=?', userId);
  const prefs = JSON.parse(u?.prefs || '{}');
  if (prefs[kind] === false) return; // user muted this category
  run('INSERT INTO notifications (id,user_id,kind,title,body,campaign_id,created_at) VALUES (?,?,?,?,?,?,?)',
    id(), userId, kind, title, body, campaignId ?? null, now());
}

export function audit(campaignId: string, actorId: string | null, action: string, from?: string, to?: string, note?: string) {
  run('INSERT INTO audit_log (id,campaign_id,actor_id,action,from_status,to_status,note,created_at) VALUES (?,?,?,?,?,?,?,?)',
    id(), campaignId, actorId, action, from ?? null, to ?? null, note ?? null, now());
}
