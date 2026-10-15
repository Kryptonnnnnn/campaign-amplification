import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_URL =
  process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');

export let API_URL = DEFAULT_URL;
let token: string | null = null;

export const setToken = (t: string | null) => { token = t; };
export const setApiUrl = async (url: string | null) => {
  API_URL = (url?.trim().replace(/\/$/, '')) || DEFAULT_URL;
  if (url) await AsyncStorage.setItem('apiUrl', API_URL); else await AsyncStorage.removeItem('apiUrl');
};
export const loadApiUrl = async () => {
  const saved = await AsyncStorage.getItem('apiUrl');
  if (saved) API_URL = saved;
};

export class ApiError extends Error {
  constructor(message: string, public status: number, public fields?: Record<string, string>, public extra?: any) { super(message); }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.method ?? 'GET',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? 'Something went wrong', res.status, data.fields, data);
  return data as T;
}

/** Resolves server-relative upload paths; leaves absolute URLs untouched. */
export const imageUrl = (u?: string | null) => (!u ? undefined : u.startsWith('/') ? API_URL + u : u);

export type Campaign = {
  id: string; status: string; step: number; title: string; category: string | null; creatorName: string; creatorType: string;
  summary: string; coverImage: string | null;
  story: { headline: string; intro: string; sections: Section[]; stats: { value: string; label: string }[]; sources: { title: string; url: string }[]; actions: string[] };
  visuals: { adImages: string[]; videoUrl?: string; headline: string; description: string; cta: string };
  reach: { locations: string[]; interests: string[]; channels: string[]; allocation: Record<string, number>; durationDays: number };
  goalCents: number | null; raisedCents: number; backersCount: number; percentFunded: number;
  estimatedReachAtGoal: number | null; estimatedReachSoFar: number; daysLeft: number | null; deadline: string | null;
  publishedAt: string | null; submittedAt: string | null; updatedAt: string; reviewerNote?: string | null; ownerId?: string;
};
export type Section = { id: string; type: 'heading' | 'paragraph' | 'image' | 'quote'; text: string; imageUrl?: string; caption?: string; credit?: string };

export type Meta = {
  categories: string[]; channels: string[]; perDollarReach: number;
  assumptions: { platformFeePct: number; processingFeePct: number; processingFeeFixedCents: number; cpmCents: number; avgFrequency: number;
    minContributionCents: number; maxContributionCents: number; presetsCents: number[]; minGoalCents: number; maxGoalCents: number; minDurationDays: number; maxDurationDays: number };
};
