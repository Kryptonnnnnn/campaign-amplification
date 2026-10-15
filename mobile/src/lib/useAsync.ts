import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/** Loads data, tracks loading/error, and re-fetches whenever the screen regains focus. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = [], opts: { refetchOnFocus?: boolean } = { refetchOnFocus: true }) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async (mode: 'initial' | 'refresh' | 'silent' = 'initial') => {
    const my = ++seq.current;
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    try {
      const r = await fn();
      if (my === seq.current) { setData(r); setError(null); }
    } catch (e: any) {
      if (my === seq.current) setError(e.message ?? 'Something went wrong');
    } finally {
      if (my === seq.current) { setLoading(false); setRefreshing(false); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const first = useRef(true);
  useEffect(() => { first.current = true; load('initial'); }, [load]);
  useFocusEffect(useCallback(() => {
    if (first.current) { first.current = false; return; }
    if (opts.refetchOnFocus !== false) load('silent');
  }, [load, opts.refetchOnFocus]));

  return { data, error, loading, refreshing, reload: () => load('initial'), refresh: () => load('refresh'), setData };
}
