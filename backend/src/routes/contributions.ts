import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { requireAuth, type Req } from '../auth.js';
import { all, id, now, notify, one, run, audit } from '../db.js';
import { ASSUMPTIONS, feeBreakdown } from '../config.js';
import { BACKABLE } from '../lifecycle.js';
import { settleDeadlines } from './campaigns.js';

export const contributions = Router();

const amountOk = (n: number) => n >= ASSUMPTIONS.minContributionCents && n <= ASSUMPTIONS.maxContributionCents;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;

contributions.get('/campaigns/:id/quote', (req, res) => {
  const amount = Math.round(Number(req.query.amountCents));
  if (!Number.isFinite(amount) || !amountOk(amount))
    return res.status(400).json({ error: `Choose between ${money(ASSUMPTIONS.minContributionCents)} and ${money(ASSUMPTIONS.maxContributionCents)}` });
  const c = one<any>('SELECT id,goal_cents,raised_cents FROM campaigns WHERE id=?', req.params.id);
  if (!c) return res.status(404).json({ error: 'Campaign not found' });
  const fees = feeBreakdown(amount);
  res.json({
    ...fees, currency: ASSUMPTIONS.currency,
    progressAfterPct: Math.min(100, Math.round(((c.raised_cents + amount) / c.goal_cents) * 100)),
    disclaimer: 'Estimated reach is a model output, not a guarantee. Actual delivery depends on ad inventory, prices and targeting.',
  });
});

/** Simulated payment provider. Test cards only; card numbers are never stored. */
function simulateCharge(card: string): { outcome: 'succeeded' | 'pending' | 'failed' | 'rejected'; reason?: string } {
  switch (card.replace(/\s/g, '')) {
    case '4242424242424242': return { outcome: 'succeeded' };
    case '4000000000000341': return { outcome: 'pending' };
    case '4000000000000002': return { outcome: 'failed', reason: 'Your card was declined.' };
    case '4000000000009995': return { outcome: 'failed', reason: 'Insufficient funds.' };
    case '4000000000000069': return { outcome: 'rejected', reason: 'Your bank rejected this payment as a security precaution.' };
    default: return { outcome: 'failed', reason: 'Unrecognised test card. Use 4242 4242 4242 4242.' };
  }
}

function applySuccess(k: any) {
  const c = one<any>('SELECT * FROM campaigns WHERE id=?', k.campaign_id)!;
  const before = c.goal_cents ? c.raised_cents / c.goal_cents : 0;
  const raised = c.raised_cents + k.amount_cents;
  const after = c.goal_cents ? raised / c.goal_cents : 0;
  const reached = c.status === 'funding' && after >= 1;
  run(`UPDATE campaigns SET raised_cents=?, backers_count=backers_count+1, status=?, updated_at=? WHERE id=?`, raised, reached ? 'goal_reached' : c.status, now(), c.id);
  run(`UPDATE contributions SET status='succeeded' WHERE id=?`, k.id);
  notify(k.user_id, 'contribution', 'Contribution successful', `${money(k.total_cents)} paid toward promoting "${c.title}". Receipt ${k.receipt_no}.`, c.id);
  notify(c.owner_id, 'funding', 'New backer', `Someone backed "${c.title}". ${Math.min(100, Math.round(after * 100))}% funded.`, c.id);
  // Only meaningful milestones notify: 50% and 100%.
  if (before < 0.5 && after >= 0.5 && after < 1) {
    for (const uid of new Set([c.owner_id, ...all<any>(`SELECT user_id FROM follows WHERE campaign_id=? AND kind='follow'`, c.id).map((f) => f.user_id)]))
      notify(uid, 'funding', 'Halfway there', `"${c.title}" has reached 50% of its goal.`, c.id);
  }
  if (reached) {
    audit(c.id, null, 'goal_reached', 'funding', 'goal_reached', 'Funding goal reached. Awaiting distribution preparation; promotion has NOT started.');
    for (const uid of new Set([c.owner_id, ...all<any>(`SELECT user_id FROM follows WHERE campaign_id=? AND kind='follow'`, c.id).map((f) => f.user_id)]))
      notify(uid, 'funding', 'Goal reached', `"${c.title}" is fully funded. The team will now prepare distribution; promotion hasn't started yet.`, c.id);
  }
}

/** Pending payments settle after a short delay (simulating bank confirmation). */
function settlePending(k: any) {
  if (k.status === 'pending' && Date.now() - Date.parse(k.created_at) > 8000) { applySuccess(k); return one<any>('SELECT * FROM contributions WHERE id=?', k.id)!; }
  return k;
}

const view = (k: any) => ({
  id: k.id, campaignId: k.campaign_id, status: k.status, failureReason: k.failure_reason,
  amountCents: k.amount_cents, platformFeeCents: k.platform_fee_cents, processingFeeCents: k.processing_fee_cents, totalCents: k.total_cents,
  receiptNo: k.receipt_no, createdAt: k.created_at, public: !!k.public,
  estimatedReach: feeBreakdown(k.amount_cents).estimatedReach,
});

contributions.post('/contributions', (req: Req, res) => {
  settleDeadlines();
  const p = z.object({
    campaignId: z.string(), amountCents: z.number().int(),
    guestEmail: z.string().email().max(120).optional(),
    cardNumber: z.string().regex(/^[\d\s]{12,23}$/, 'Enter a card number'),
    showName: z.boolean().default(false), // private by default
    acceptedTerms: z.literal(true, { message: 'Please accept the terms to continue' }),
  }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
  const d = p.data;
  if (!amountOk(d.amountCents)) return res.status(400).json({ error: 'That amount is outside the allowed range' });
  if (!req.user && !d.guestEmail) return res.status(400).json({ error: 'Enter an email for your receipt, or sign in' });
  const c = one<any>('SELECT * FROM campaigns WHERE id=?', d.campaignId);
  if (!c) return res.status(404).json({ error: 'Campaign not found' });
  if (!BACKABLE.includes(c.status)) return res.status(409).json({ error: 'This campaign is no longer open for backing' });

  const fees = feeBreakdown(d.amountCents);
  const charge = simulateCharge(d.cardNumber);
  const kid = id();
  run(`INSERT INTO contributions (id,campaign_id,user_id,guest_email,amount_cents,platform_fee_cents,processing_fee_cents,total_cents,status,failure_reason,display_name,public,receipt_no,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    kid, c.id, req.user?.id ?? null, d.guestEmail ?? null, fees.amountCents, fees.platformFeeCents, fees.processingFeeCents, fees.totalCents,
    charge.outcome === 'succeeded' ? 'pending' : charge.outcome, charge.reason ?? null,
    d.showName && req.user ? req.user.name : null, d.showName && req.user ? 1 : 0,
    'RCP-' + randomBytes(4).toString('hex').toUpperCase(), now());
  let k = one<any>('SELECT * FROM contributions WHERE id=?', kid)!;
  if (charge.outcome === 'succeeded') { applySuccess(k); k = one<any>('SELECT * FROM contributions WHERE id=?', kid)!; }
  if (charge.outcome === 'failed' || charge.outcome === 'rejected') notify(req.user?.id, 'contribution', 'Contribution unsuccessful', `Your payment for "${c.title}" didn't go through: ${charge.reason}`, c.id);
  const campaign = one<any>('SELECT raised_cents,goal_cents,backers_count FROM campaigns WHERE id=?', c.id)!;
  res.status(charge.outcome === 'failed' || charge.outcome === 'rejected' ? 402 : 201).json({
    contribution: view(k), receiptToken: k.receipt_no,
    progress: { raisedCents: campaign.raised_cents, goalCents: campaign.goal_cents, percent: Math.min(100, Math.round(campaign.raised_cents / campaign.goal_cents * 100)) },
    error: charge.reason,
  });
});

// Receipt access: the signed-in owner, or a guest holding the receipt token.
function getAccessible(req: Req, res: any) {
  let k = one<any>('SELECT * FROM contributions WHERE id=?', req.params.id);
  const ok = k && ((req.user && k.user_id === req.user.id) || (req.query.token && req.query.token === k.receipt_no));
  if (!k || !ok) { res.status(404).json({ error: 'Receipt not found' }); return null; }
  return settlePending(k);
}

contributions.get('/contributions/:id', (req: Req, res) => {
  const k = getAccessible(req, res); if (!k) return;
  const c = one<any>('SELECT id,title,raised_cents,goal_cents,cover_image FROM campaigns WHERE id=?', k.campaign_id)!;
  res.json({
    contribution: view(k), campaignTitle: c.title, coverImage: c.cover_image,
    progress: { raisedCents: c.raised_cents, goalCents: c.goal_cents, percent: Math.min(100, Math.round(c.raised_cents / c.goal_cents * 100)) },
    statement: 'This payment funds the distribution of the campaign message. It is not a donation to the cause or organization described.',
  });
});

contributions.post('/contributions/:id/cancel', (req: Req, res) => {
  const k = getAccessible(req, res); if (!k) return;
  if (k.status !== 'pending') return res.status(409).json({ error: `A ${k.status} payment can't be cancelled` });
  run(`UPDATE contributions SET status='cancelled' WHERE id=?`, k.id);
  res.json({ contribution: view({ ...k, status: 'cancelled' }) });
});
