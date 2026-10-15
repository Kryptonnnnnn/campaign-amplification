import { z } from 'zod';
import { ASSUMPTIONS, CATEGORIES, CHANNELS, estimateReach, feeBreakdown } from './config.js';

const isHttpUrl = (u: string) => { try { return ['http:', 'https:'].includes(new URL(u).protocol); } catch { return false; } };

export const StorySchema = z.object({
  headline: z.string().max(140).default(''),
  intro: z.string().max(600).default(''),
  sections: z.array(z.object({
    id: z.string(), type: z.enum(['heading', 'paragraph', 'image', 'quote']),
    text: z.string().max(4000).default(''),
    imageUrl: z.string().max(500).optional(), caption: z.string().max(200).optional(), credit: z.string().max(120).optional(),
  })).max(40).default([]),
  stats: z.array(z.object({ value: z.string().max(20), label: z.string().max(80) })).max(6).default([]),
  sources: z.array(z.object({ title: z.string().max(160), url: z.string().max(500) })).max(20).default([]), // strictly validated at submit
  actions: z.array(z.string().max(120)).max(5).default([]),
});

export const VisualsSchema = z.object({
  adImages: z.array(z.string().max(500)).max(6).default([]),
  videoUrl: z.string().max(500).optional(),
  headline: z.string().max(40).default(''),
  description: z.string().max(125).default(''),
  cta: z.string().max(25).default('Learn more'),
});

export const ReachSchema = z.object({
  locations: z.array(z.string().max(60)).max(20).default([]),
  interests: z.array(z.string().max(40)).max(15).default([]),
  channels: z.array(z.enum(CHANNELS)).max(4).default([]),
  allocation: z.record(z.string(), z.number().min(0).max(100)).default({}), // channel -> % of ad budget (creator's request; finalised in review)
  durationDays: z.number().int().min(ASSUMPTIONS.minDurationDays).max(ASSUMPTIONS.maxDurationDays).default(21),
});

/** Partial save: drafts may be incomplete, but every field present must be well-formed. */
export const DraftPatchSchema = z.object({
  step: z.number().int().min(1).max(5).optional(),
  title: z.string().max(60).optional(),
  category: z.enum(CATEGORIES).nullable().optional(),
  creatorName: z.string().max(80).optional(),
  creatorType: z.enum(['Individual', 'Creator', 'Nonprofit', 'Organization', 'Business', 'Community group']).optional(),
  summary: z.string().max(280).optional(),
  coverImage: z.string().max(500).nullable().optional(),
  story: StorySchema.optional(),
  visuals: VisualsSchema.optional(),
  reach: ReachSchema.optional(),
  goalCents: z.number().int().nullable().optional(),
});

/** Completeness check enforced server-side at submission. Returns field -> message. */
export function validateForSubmit(c: any): Record<string, string> {
  const e: Record<string, string> = {};
  if (!c.title.trim()) e.title = 'Add a campaign title';
  if (!c.category) e.category = 'Choose a category';
  if (!c.creator_name.trim()) e.creatorName = 'Add the creator or organization name';
  if (c.summary.trim().length < 20) e.summary = 'Write a short summary (at least 20 characters)';
  const story = JSON.parse(c.story || '{}');
  if (!story.intro || story.intro.trim().length < 40) e.story = 'Write an introduction of at least 40 characters';
  else if (!story.sources?.length) e.sources = 'Add at least one supporting source';
  else if (story.sources.some((x: any) => !x.title?.trim() || !isHttpUrl(x.url))) e.sources = 'Every source needs a title and a valid https:// link';
  const v = JSON.parse(c.visuals || '{}');
  if (!c.cover_image) e.coverImage = 'Add a campaign cover image';
  if (v.videoUrl && !/^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)\S+|^https:\/\/\S+\.mp4(\?\S*)?$/i.test(v.videoUrl)) e.videoUrl = 'Video must be a YouTube, Vimeo or .mp4 link';
  if (!v.adImages?.length) e.adImages = 'Add at least one advertising image';
  const r = JSON.parse(c.reach || '{}');
  if (!r.locations?.length) e.locations = 'Choose at least one location';
  if (!r.channels?.length) e.channels = 'Choose at least one distribution channel';
  else if (r.allocation && Object.keys(r.allocation).length && Math.round(Object.values<number>(r.allocation).reduce((a, b) => a + b, 0)) !== 100)
    e.allocation = 'Budget allocation across channels must add up to 100%';
  if (c.goal_cents == null) e.goal = 'Set your funding goal';
  else if (c.goal_cents < ASSUMPTIONS.minGoalCents || c.goal_cents > ASSUMPTIONS.maxGoalCents)
    e.goal = `Goal must be between $${ASSUMPTIONS.minGoalCents / 100} and $${ASSUMPTIONS.maxGoalCents / 100}`;
  return e;
}

/** Row -> API shape. `full` adds private creator-facing fields. */
export function serialize(c: any, opts: { full?: boolean } = {}) {
  const goal = c.goal_cents ?? 0;
  const goalFees = goal ? feeBreakdown(goal) : null;
  const out: any = {
    id: c.id, status: c.status, step: c.step, title: c.title, category: c.category,
    creatorName: c.creator_name, creatorType: c.creator_type, summary: c.summary, coverImage: c.cover_image,
    story: JSON.parse(c.story || '{}'), visuals: JSON.parse(c.visuals || '{}'), reach: JSON.parse(c.reach || '{}'),
    goalCents: c.goal_cents, raisedCents: c.raised_cents, backersCount: c.backers_count,
    percentFunded: goal ? Math.min(100, Math.round((c.raised_cents / goal) * 100)) : 0,
    estimatedReachAtGoal: goalFees ? goalFees.estimatedReach : null,
    estimatedReachSoFar: estimateReach(c.raised_cents - Math.round(c.raised_cents * ASSUMPTIONS.platformFeePct / 100)),
    daysLeft: c.deadline ? Math.max(0, Math.ceil((Date.parse(c.deadline) - Date.now()) / 86_400_000)) : null,
    deadline: c.deadline, publishedAt: c.published_at, submittedAt: c.submitted_at, updatedAt: c.updated_at,
  };
  if (!out.visuals.headline) out.visuals.headline = c.title.slice(0, 40); // title doubles as ad headline
  if (opts.full) { out.reviewerNote = c.reviewer_note; out.version = c.version; out.ownerId = c.owner_id; }
  return out;
}
