export const money = (cents: number | null | undefined, opts: { exact?: boolean } = {}) => {
  const v = (cents ?? 0) / 100;
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: opts.exact || v % 1 ? 2 : 0, maximumFractionDigits: 2 });
};

export const compact = (n: number | null | undefined) => {
  const v = n ?? 0;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (v >= 10_000) return Math.round(v / 1000) + 'K';
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(v);
};

export const dateShort = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

export const timeAgo = (iso: string) => {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return dateShort(iso);
};

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', submitted: 'Under review', changes_requested: 'Changes requested', approved: 'Approved',
  funding: 'Funding', goal_reached: 'Goal reached', funding_ended: 'Funding ended', distribution_prep: 'Preparing distribution',
  promoting: 'Promoting', completed: 'Completed', rejected: 'Not approved', cancelled: 'Cancelled', refund_pending: 'Refund pending', refunded: 'Refunded', failed: 'Failed',
};

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export const STATUS_TONE: Record<string, Tone> = {
  draft: 'neutral', submitted: 'info', changes_requested: 'warning', approved: 'success', funding: 'primary', goal_reached: 'success',
  funding_ended: 'neutral', distribution_prep: 'info', promoting: 'success', completed: 'neutral', rejected: 'danger', cancelled: 'neutral',
  refund_pending: 'warning', refunded: 'info', failed: 'danger',
};

export const STATUS_HELP: Record<string, string> = {
  draft: 'Only you can see this. Finish the five steps and submit it for review.',
  submitted: 'A reviewer is checking your story, sources, visuals and targeting.',
  changes_requested: 'The reviewer asked for changes. Update your draft and resubmit.',
  funding: 'Live and open for backing. Ads have not started yet.',
  goal_reached: 'Fully funded. The team will prepare distribution. Ads have not started yet.',
  funding_ended: 'The funding period ended. The team will decide whether to proceed or refund.',
  distribution_prep: 'Ad accounts and creative are being set up with distribution partners.',
  promoting: 'Ads are running. Delivery figures update as partners report them.',
  completed: 'Promotion finished. The final report is available.',
  rejected: 'This campaign did not meet the campaign rules.',
  cancelled: 'This campaign was cancelled.',
  refund_pending: 'This campaign was cancelled. Contributions are being refunded in full.',
  refunded: 'This campaign was cancelled and all contributions have been refunded.',
};
