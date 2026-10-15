import React, { useEffect, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { Button, Card, Field, Header, Notice, Skeleton, Txt } from '../src/components/ui';
import { AuthGate } from '../src/components/AuthGate';
import { API_URL, api, setApiUrl } from '../src/lib/api';
import { useAsync } from '../src/lib/useAsync';
import { useAuth } from '../src/store/auth';
import { useToast } from '../src/store/toast';
import { colors, space } from '../src/theme';

const PREFS: [string, string, string][] = [
  ['review', 'Review decisions', 'Submission received, approved, or changes requested'],
  ['funding', 'Funding milestones', '50% funded, goal reached, deadline approaching'],
  ['contribution', 'Payments', 'Successful or unsuccessful contributions'],
  ['promotion', 'Promotion progress', 'Promotion start, meaningful progress, final report'],
  ['updates', 'Campaign updates', 'Posts from campaigns you follow or back'],
];

function Body() {
  const { user, rename } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [url, setUrl] = useState(API_URL);
  const prefs = useAsync(() => api<Record<string, boolean>>('/me/prefs'), [], { refetchOnFocus: false });
  const [p, setP] = useState<Record<string, boolean>>({});
  useEffect(() => { if (prefs.data) setP(prefs.data); }, [prefs.data]);

  const flip = async (k: string, v: boolean) => {
    const next = { ...p, [k]: v }; setP(next);
    try { await api('/me/prefs', { method: 'PUT', body: next }); } catch (e: any) { setP(p); toast(e.message, 'error'); }
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Account settings" />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: space.xxl }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: space.md }}>
          <Txt v="h3">Account</Txt>
          <Field label="Name" required value={name} onChangeText={setName} maxLength={80} />
          <Field label="Email" required value={user?.email ?? ''} editable={false} hint="Email can’t be changed in this prototype." />
          <Button small title="Save name" disabled={!name.trim() || name === user?.name} onPress={async () => { try { await rename(name.trim()); toast('Name updated'); } catch (e: any) { toast(e.message, 'error'); } }} style={{ alignSelf: 'flex-start' }} />
        </Card>
        <Card style={{ gap: space.md }}>
          <Txt v="h3">Notifications</Txt>
          <Txt v="small" color={colors.muted}>Choose what appears in your Activity feed. We keep notifications to meaningful events only.</Txt>
          {prefs.loading ? <Skeleton h={120} /> : PREFS.map(([k, label, hint]) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52 }}>
              <View style={{ flex: 1 }}><Txt v="small" style={{ fontWeight: '700' }}>{label}</Txt><Txt v="caption" color={colors.muted}>{hint}</Txt></View>
              <Switch value={p[k] !== false} onValueChange={(v) => flip(k, v)} trackColor={{ true: colors.primary }} accessibilityLabel={label} />
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52 }}>
            <View style={{ flex: 1 }}><Txt v="small" style={{ fontWeight: '700' }}>Account security</Txt><Txt v="caption" color={colors.muted}>Sign-ins and changes. Always on.</Txt></View>
            <Switch value disabled trackColor={{ true: colors.primary }} accessibilityLabel="Account security alerts, always on" />
          </View>
          <Txt v="caption" color={colors.muted}>Push and email delivery aren’t enabled in this prototype. Notifications appear in-app.</Txt>
        </Card>
        <Card style={{ gap: space.md }}>
          <Txt v="h3">Connection (developer)</Txt>
          <Field label="API server URL" value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" hint="Point the app at a different backend, for example your computer’s LAN IP on a physical phone." />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button small title="Save" onPress={async () => { await setApiUrl(url); toast('Server updated. Pull to refresh screens'); }} />
            <Button small kind="ghost" title="Reset" onPress={async () => { await setApiUrl(null); setUrl(API_URL); toast('Reset to default', 'info'); }} />
          </View>
        </Card>
        <Notice tone="info">This is a prototype with demo data. Payments are simulated and no real money moves.</Notice>
      </ScrollView>
    </View>
  );
}
export default function Settings() { return <AuthGate icon="settings-outline" title="Account settings" body="Sign in to manage your account and notifications."><Body /></AuthGate>; }
