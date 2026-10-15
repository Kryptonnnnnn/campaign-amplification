import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, loadApiUrl, setToken } from '../lib/api';

export type User = { id: string; email: string; name: string; role: 'user' | 'admin' };
type AuthCtx = {
  user: User | null; ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  rename: (name: string) => Promise<void>;
};
const Ctx = createContext<AuthCtx>(null as never);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await loadApiUrl();
      const t = await AsyncStorage.getItem('token');
      if (t) {
        setToken(t);
        try { setUser((await api<{ user: User }>('/me')).user); }
        catch (e: any) { if (e.status === 401) { setToken(null); await AsyncStorage.removeItem('token'); } }
      }
      setReady(true);
    })();
  }, []);

  const finish = useCallback(async (r: { token: string; user: User }) => {
    setToken(r.token); await AsyncStorage.setItem('token', r.token); setUser(r.user);
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    user, ready,
    signIn: async (email, password) => finish(await api('/auth/login', { method: 'POST', body: { email, password } })),
    register: async (name, email, password) => finish(await api('/auth/register', { method: 'POST', body: { name, email, password } })),
    signOut: async () => { setToken(null); await AsyncStorage.removeItem('token'); setUser(null); },
    rename: async (name) => { await api('/me', { method: 'PUT', body: { name } }); setUser((u) => (u ? { ...u, name } : u)); },
  }), [user, ready, finish]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
