import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Field, IconButton, Notice, Txt } from '../src/components/ui';
import { useAuth } from '../src/store/auth';
import { useToast } from '../src/store/toast';
import { colors, space } from '../src/theme';

export default function Auth() {
  const { signIn, register } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ form?: string; name?: string; email?: string; password?: string }>({});

  const submit = async () => {
    const e: typeof err = {};
    if (mode === 'up' && !name.trim()) e.name = 'Enter your name';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Enter a valid email address';
    if (password.length < 8) e.password = 'Use at least 8 characters';
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      if (mode === 'in') await signIn(email.trim(), password); else await register(name.trim(), email.trim(), password);
      toast(mode === 'in' ? 'Welcome back' : 'Account created');
      router.back();
    } catch (x: any) { setErr({ form: x.message }); } finally { setBusy(false); }
  };

  const demo = async () => {
    setBusy(true);
    try { await signIn('demo@amplify.demo', 'demo1234'); toast('Signed in as demo user'); router.back(); }
    catch (x: any) { setErr({ form: x.message }); } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ alignItems: 'flex-end', padding: space.sm, paddingTop: space.xl }}><IconButton icon="close" label="Close" onPress={() => router.back()} /></View>
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }} keyboardShouldPersistTaps="handled">
        <Txt v="display">{mode === 'in' ? 'Welcome back' : 'Create your account'}</Txt>
        <Txt color={colors.muted}>One account lets you create campaigns, back them and follow progress. Browsing never needs an account.</Txt>
        {err.form && <Notice tone="danger">{err.form}</Notice>}
        {mode === 'up' && <Field label="Name" required value={name} onChangeText={(t) => { setName(t); setErr((e) => ({ ...e, name: undefined, form: undefined })); }} error={err.name} autoComplete="name" />}
        <Field label="Email" required value={email} onChangeText={(t) => { setEmail(t); setErr((e) => ({ ...e, email: undefined, form: undefined })); }} error={err.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <Field label="Password" required value={password} onChangeText={(t) => { setPassword(t); setErr((e) => ({ ...e, password: undefined, form: undefined })); }} error={err.password} secureTextEntry hint={mode === 'up' ? 'At least 8 characters' : undefined} />
        <Button title={mode === 'in' ? 'Sign in' : 'Create account'} onPress={submit} loading={busy} />
        <Button title={mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'} kind="ghost" onPress={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr({}); }} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <Notice tone="info" title="Trying the prototype?">Use the demo account to explore with sample history. Reviewer: admin@amplify.demo, creator: creator@amplify.demo (password demo1234).</Notice>
        <Button title="Continue as demo user" kind="secondary" onPress={demo} disabled={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
