import { all, audit, notify, one } from './db.js';

/** Sends one "deadline approaching" notice per campaign when funding ends within 3 days. Idempotent. */
export function sendDeadlineNotices() {
  const soon = new Date(Date.now() + 3 * 86_400_000).toISOString();
  const due = all<any>(`SELECT id,title,owner_id,deadline,goal_cents,raised_cents FROM campaigns WHERE status='funding' AND deadline > ? AND deadline <= ?`, new Date().toISOString(), soon);
  for (const c of due) {
    if (one(`SELECT 1 FROM audit_log WHERE campaign_id=? AND action='deadline_notice'`, c.id)) continue;
    const days = Math.max(1, Math.ceil((Date.parse(c.deadline) - Date.now()) / 86_400_000));
    const pct = Math.round((c.raised_cents / c.goal_cents) * 100);
    const audience = new Set<string>([c.owner_id, ...all<any>(`SELECT user_id FROM follows WHERE campaign_id=? AND kind='follow'`, c.id).map((f) => f.user_id)]);
    for (const uid of audience) notify(uid, 'funding', 'Funding ends soon', `"${c.title}" ends in ${days} ${days === 1 ? 'day' : 'days'} and is ${pct}% funded.`, c.id);
    audit(c.id, null, 'deadline_notice');
  }
}

export function startScheduler() {
  sendDeadlineNotices();
  setInterval(sendDeadlineNotices, 60 * 60 * 1000).unref();
}
