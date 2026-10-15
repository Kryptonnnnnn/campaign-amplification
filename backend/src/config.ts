// Demo assumptions. Every reach figure in the product is derived from these
// and is labelled as an estimate in the UI.
export const PORT = Number(process.env.PORT ?? 4000);
export const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-secret-change-me';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) throw new Error('JWT_SECRET must be set in production');

export const ASSUMPTIONS = {
  currency: 'USD',
  platformFeePct: 10, // taken out of the contribution before ad spend
  processingFeePct: 2.9, // added on top, paid by the backer
  processingFeeFixedCents: 30,
  cpmCents: 800, // $8 per 1,000 impressions (demo)
  avgFrequency: 2.2, // impressions per unique person (demo)
  minContributionCents: 500,
  maxContributionCents: 500_000,
  presetsCents: [500, 1000, 2500, 5000, 10000],
  minGoalCents: 50_000,
  maxGoalCents: 5_000_000,
  minDurationDays: 7,
  maxDurationDays: 60,
};

export const CATEGORIES = [
  'Environment', 'Health', 'Science', 'Education', 'Public Policy',
  'Economic Policy', 'Community', 'Arts & Culture', 'Business', 'Other',
] as const;

export const CHANNELS = ['Meta (Facebook & Instagram)', 'Google Display', 'YouTube', 'X (Twitter)'] as const;

/** Estimated unique people reached for a given ad spend. Never a guarantee. */
export function estimateReach(adSpendCents: number): number {
  const impressions = (adSpendCents / ASSUMPTIONS.cpmCents) * 1000;
  return Math.round(impressions / ASSUMPTIONS.avgFrequency);
}

export function feeBreakdown(amountCents: number) {
  const platformFee = Math.round((amountCents * ASSUMPTIONS.platformFeePct) / 100);
  const adSpend = amountCents - platformFee;
  const processingFee = Math.round(
    (amountCents * ASSUMPTIONS.processingFeePct) / 100 + ASSUMPTIONS.processingFeeFixedCents,
  );
  return {
    amountCents,
    platformFeeCents: platformFee,
    advertisingCents: adSpend,
    processingFeeCents: processingFee,
    totalCents: amountCents + processingFee,
    estimatedReach: estimateReach(adSpend),
  };
}
