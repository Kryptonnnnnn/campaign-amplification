export type Status =
  | 'draft' | 'submitted' | 'changes_requested' | 'approved' | 'funding'
  | 'goal_reached' | 'funding_ended' | 'distribution_prep' | 'promoting' | 'completed'
  | 'rejected' | 'cancelled' | 'refund_pending' | 'refunded' | 'failed';

/** Allowed transitions. Funding completion never implies promotion: it goes to
 *  distribution_prep, which only an admin may advance once conditions are met. */
export const TRANSITIONS: Record<Status, Status[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['changes_requested', 'approved', 'rejected'],
  changes_requested: ['submitted', 'cancelled'],
  approved: ['funding'],
  funding: ['goal_reached', 'funding_ended', 'cancelled'],
  goal_reached: ['distribution_prep'],
  funding_ended: ['distribution_prep', 'refund_pending'],
  distribution_prep: ['promoting', 'failed', 'refund_pending'],
  promoting: ['completed', 'failed'],
  completed: [],
  rejected: [],
  cancelled: ['refund_pending'],
  refund_pending: ['refunded'],
  refunded: [],
  failed: ['refund_pending'],
};

export const canTransition = (from: Status, to: Status) => TRANSITIONS[from]?.includes(to) ?? false;

/** Statuses where backers (not the public) may still view the page, e.g. to follow a refund. */
export const BACKER_VISIBLE: Status[] = ['cancelled', 'refund_pending', 'refunded', 'failed'];
export const EDITABLE: Status[] = ['draft', 'changes_requested'];
export const PUBLIC: Status[] = [
  'funding', 'goal_reached', 'funding_ended', 'distribution_prep', 'promoting', 'completed',
];
export const BACKABLE: Status[] = ['funding'];
