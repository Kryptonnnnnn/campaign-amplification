import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { api, ApiError, Campaign } from '../lib/api';
import { useToast } from '../store/toast';

export type SaveState = 'saved' | 'dirty' | 'saving' | 'error';
export const STEPS = ['basics', 'story', 'visuals', 'reach', 'submit'] as const;
export const STEP_TITLES = ['Basics', 'Story', 'Visuals', 'Reach', 'Submit'];

type Patch = Partial<Pick<Campaign, 'title' | 'category' | 'creatorName' | 'creatorType' | 'summary' | 'coverImage' | 'story' | 'visuals' | 'reach' | 'step'>> & { goalCents?: number | null };
type Ctx = {
  draft: Campaign; saveState: SaveState; errors: Record<string, string>;
  patch: (p: Patch) => void; flush: () => Promise<boolean>; setErrors: (e: Record<string, string>) => void;
  goalText: string; setGoalText: (t: string) => void;
};
const DraftCtx = createContext<Ctx>(null as never);
export const useDraft = () => useContext(DraftCtx);

const withDefaults = (c: Campaign): Campaign => ({
  ...c,
  story: Object.assign({ headline: '', intro: '', sections: [], stats: [], sources: [], actions: [] }, c.story),
  visuals: Object.assign({ adImages: [], headline: '', description: '', cta: 'Learn more' }, c.visuals),
  reach: Object.assign({ locations: [], interests: [], channels: [], allocation: {}, durationDays: 21 }, c.reach),
});

/** Holds the working copy of a draft. Every edit is applied locally at once and saved to the server shortly after. */
export function DraftProvider({ initial, children }: { initial: Campaign; children: React.ReactNode }) {
  const toast = useToast();
  const [draft, setDraft] = useState<Campaign>(() => withDefaults(initial));
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [goalText, setGoalText] = useState(initial.goalCents != null ? String(initial.goalCents / 100) : '');
  const pending = useRef<Patch>({});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inflight = useRef<Promise<boolean> | null>(null);

  const send = useCallback(async (): Promise<boolean> => {
    const body = pending.current;
    if (!Object.keys(body).length) return true;
    pending.current = {};
    setSaveState('saving');
    try {
      await api(`/campaigns/${initial.id}`, { method: 'PUT', body });
      if (!Object.keys(pending.current).length) setSaveState('saved'); else setSaveState('dirty');
      return true;
    } catch (e: any) {
      pending.current = { ...body, ...pending.current }; // keep unsaved edits for retry
      setSaveState('error');
      if (e instanceof ApiError && e.status === 409) { toast(e.message, 'error'); router.replace(`/manage/${initial.id}`); }
      return false;
    }
  }, [initial.id, toast]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (inflight.current) await inflight.current;
    inflight.current = send();
    const ok = await inflight.current; inflight.current = null;
    return ok;
  }, [send]);

  const patch = useCallback((p: Patch) => {
    setDraft((d) => ({ ...d, ...p } as Campaign));
    pending.current = { ...pending.current, ...p };
    setSaveState('dirty');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { flush(); }, 800);
  }, [flush]);

  // Save anything still pending when leaving the flow.
  useEffect(() => () => { clearTimeout(timer.current); if (Object.keys(pending.current).length) { api(`/campaigns/${initial.id}`, { method: 'PUT', body: pending.current }).catch(() => {}); } }, [initial.id]);

  return <DraftCtx.Provider value={{ draft, saveState, errors, patch, flush, setErrors, goalText, setGoalText }}>{children}</DraftCtx.Provider>;
}

export const VIDEO_RE = /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)\S+$|^https:\/\/\S+\.mp4(\?\S*)?$/i;

/** Client-side mirror of the server's completeness rules, grouped by step. */
export function validateStep(d: Campaign, step: number, goalText = ''): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 0) {
    if (!d.title.trim()) e.title = 'Add a campaign title';
    if (!d.category) e.category = 'Choose a category';
    if (!d.creatorName.trim()) e.creatorName = 'Add the creator or organization name';
    if (d.summary.trim().length < 20) e.summary = 'Write a short summary (at least 20 characters)';
  }
  if (step === 1) {
    if (d.story.intro.trim().length < 40) e.intro = 'Write an introduction of at least 40 characters';
    if (!d.story.sources.length) e.sources = 'Add at least one supporting source';
    d.story.sources.forEach((s, i) => { if (!/^https?:\/\/\S+\.\S+/.test(s.url)) e[`source${i}`] = 'Enter a full link starting with https://'; });
  }
  if (step === 2) {
    if (!d.coverImage) e.coverImage = 'Add a campaign cover image';
    if (!d.visuals.adImages.length) e.adImages = 'Add at least one advertising image';
    if (d.visuals.videoUrl && !VIDEO_RE.test(d.visuals.videoUrl)) e.videoUrl = 'Video must be a YouTube, Vimeo or .mp4 link';
  }
  if (step === 3) {
    if (!d.reach.locations.length) e.locations = 'Choose at least one location';
    if (!d.reach.channels.length) e.channels = 'Choose at least one channel';
    else if (Math.round(d.reach.channels.reduce((a, c) => a + (d.reach.allocation[c] ?? 0), 0)) !== 100) e.allocation = 'Budget allocation must add up to 100%';
  }
  if (step === 4) {
    const g = parseFloat(goalText);
    if (!goalText.trim() || !Number.isFinite(g)) e.goal = 'Set your funding goal';
    else if (g < 500 || g > 50000) e.goal = 'Goal must be between $500 and $50,000';
  }
  return e;
}
export const STEP_OF_FIELD: Record<string, number> = { title: 0, category: 0, creatorName: 0, summary: 0, story: 1, intro: 1, sources: 1, coverImage: 2, adImages: 2, locations: 3, channels: 3, allocation: 3, goal: 4, rules: 4 };
