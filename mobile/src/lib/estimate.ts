import type { Meta } from './api';

/** Mirrors the server's reach model so previews match what the API will compute. */
export function estimateAtGoal(goalCents: number, a: Meta['assumptions']) {
  const platformFee = Math.round((goalCents * a.platformFeePct) / 100);
  const advertising = goalCents - platformFee;
  const reach = Math.round(((advertising / a.cpmCents) * 1000) / a.avgFrequency);
  return { platformFee, advertising, reach };
}
