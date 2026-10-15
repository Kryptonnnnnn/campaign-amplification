import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, ErrorState, Expandable, Field, Header, Notice, ProgressBar, Row, Skeleton, StickyBar, Txt } from '../../src/components/ui';
import { api, ApiError, Campaign, Meta } from '../../src/lib/api';
import { useAsync } from '../../src/lib/useAsync';
import { useAuth } from '../../src/store/auth';
import { compact, money } from '../../src/lib/format';
import { colors, space } from '../../src/theme';

type Quote = { amountCents: number; platformFeeCents: number; advertisingCents: number; processingFeeCents: number; totalCents: number; estimatedReach: number; progressAfterPct: number; disclaimer: string };
const STEP_LABELS = ['Amount', 'Review', 'Payment'];

export default function Back() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const meta = useAsync(() => api<Meta>('/meta'), [], { refetchOnFocus: false });
  const camp = useAsync(() => api<{ campaign: Campaign; canBack: boolean }>(`/campaigns/${id}`), [id], { refetchOnFocus: false });

  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState<number>(2500);
  const [custom, setCustom] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [card, setCard] = useState('4242 4242 4242 4242');
  const [terms, setTerms] = useState(false);
  const [showName, setShowName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payErr, setPayErr] = useState<string | null>(null);

  const a = meta.data?.assumptions;
  const valid = !!a && amount >= a.minContributionCents && amount <= a.maxContributionCents;

  // Live estimate: re-quote whenever the amount changes.
  useEffect(() => {
    if (!valid) { setQuote(null); return; }
    let live = true;
    const t = setTimeout(async () => {
      try { const q = await api<Quote>(`/campaigns/${id}/quote?amountCents=${amount}`); if (live) { setQuote(q); setQuoteErr(null); } }
      catch (e: any) { if (live) setQuoteErr(e.message); }
    }, 150);
    return () => { live = false; clearTimeout(t); };
  }, [amount, valid, id]);

  const onCustom = (t: string) => {
    const clean = t.replace(/[^0-9.]/g, '');
    setCustom(clean);
    const n = Math.round(parseFloat(clean) * 100);
    setAmount(Number.isFinite(n) ? n : 0);
  };

  const pay = async () => {
    setPayErr(null);
    if (!user && !/^\S+@\S+\.\S+$/.test(email.trim())) return setPayErr('Enter an email address for your receipt.');
    if (!terms) return setPayErr('Please confirm you understand how your contribution is used.');
    setBusy(true);
    try {
      const r = await api<any>('/contributions', { method: 'POST', body: { campaignId: id, amountCents: amount, guestEmail: user ? undefined : email.trim(), cardNumber: card, showName, acceptedTerms: true } });
      router.replace({ pathname: '/receipt/[id]', params: { id: r.contribution.id, token: r.receiptToken } });
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 402) {
        // Payment declined: show a dedicated failure result with a clear next step.
        router.replace({ pathname: '/receipt/[id]', params: { id: e.extra.contribution.id, token: e.extra.receiptToken } });
      } else setPayErr(e.message);
    } finally { setBusy(false); }
  };

  if (camp.loading || meta.loading) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Header title="Back this campaign" /><View style={{ padding: space.lg, gap: space.md }}><Skeleton h={80} /><Skeleton h={200} /></View></View>;
  if (camp.error || !camp.data || !a) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Header title="Back this campaign" /><ErrorState message={camp.error ?? meta.error ?? 'Unavailable'} onRetry={camp.reload} /></View>;
  const c = camp.data.campaign;
  if (!camp.data.canBack) return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}><Header title="Back this campaign" />
      <View style={{ padding: space.lg, gap: space.lg }}><Notice tone="warning" title="Not open for backing">This campaign is no longer accepting contributions.</Notice><Button title="Back to campaign" onPress={() => router.back()} /></View></View>);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Back this campaign" onBack={() => (step > 0 ? setStep(step - 1) : router.back())} />
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: space.lg, paddingBottom: space.sm }} accessibilityLabel={`Step ${step + 1} of 3: ${STEP_LABELS[step]}`}>
        {STEP_LABELS.map((l, i) => (
          <View key={l} style={{ flex: 1, gap: 4 }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: i <= step ? colors.primary : colors.border }} />
            <Txt v="caption" color={i === step ? colors.primary : colors.muted} style={{ fontWeight: i === step ? '800' : '500' }}>{i + 1}. {l}</Txt>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: space.sm }}>
          <Txt v="h3" numberOfLines={2}>{c.title}</Txt>
          <ProgressBar percent={c.percentFunded} />
          <Txt v="caption" color={colors.muted}>{money(c.raisedCents)} of {money(c.goalCents)} · {c.percentFunded}% funded</Txt>
        </Card>

        <Notice tone="warning" icon="megaphone-outline" title="You are paying to spread this message">
          Your contribution funds advertising for this campaign. It is not a donation to the cause or organization.
        </Notice>

        {step === 0 && (
          <View style={{ gap: space.lg }}>
            <Txt v="h2">Choose an amount</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {a.presetsCents.map((p) => <Chip key={p} label={money(p)} selected={amount === p && !custom} onPress={() => { setAmount(p); setCustom(''); }} />)}
            </View>
            <Field label="Or enter a custom amount (USD)" value={custom} onChangeText={onCustom} keyboardType="decimal-pad" placeholder="e.g. 15"
              error={custom && !valid ? `Enter between ${money(a.minContributionCents)} and ${money(a.maxContributionCents)}` : undefined} />
            <Card style={{ gap: space.sm, backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
              <Txt v="caption" color={colors.primaryDark} style={{ fontWeight: '800' }}>ESTIMATED REACH FOR {valid ? money(amount) : 'THIS AMOUNT'}</Txt>
              <Txt v="display" color={colors.primaryDark}>{quote && valid ? `~${compact(quote.estimatedReach)} people` : '—'}</Txt>
              <Txt v="caption" color={colors.muted}>An estimate from demo assumptions (${a.cpmCents / 100} per 1,000 impressions, ~{a.avgFrequency} views per person). Not a guarantee.</Txt>
            </Card>
            {quoteErr && <Notice tone="danger">{quoteErr}</Notice>}
          </View>
        )}

        {step === 1 && quote && (
          <View style={{ gap: space.lg }}>
            <Txt v="h2">Review your contribution</Txt>
            <Card style={{ gap: space.sm }}>
              <Row label="Your contribution" value={money(quote.amountCents, { exact: true })} />
              <Row label={`  of which advertising`} value={money(quote.advertisingCents, { exact: true })} />
              <Row label={`  of which platform fee (${a.platformFeePct}%)`} value={money(quote.platformFeeCents, { exact: true })} />
              <Row label="Payment processing fee" value={money(quote.processingFeeCents, { exact: true })} />
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
              <Row label="Total payment" value={money(quote.totalCents, { exact: true })} bold />
              <Row label="Estimated reach" value={`~${compact(quote.estimatedReach)} people`} />
              <Row label="Campaign funding after this" value={`${quote.progressAfterPct}%`} />
            </Card>
            <Expandable icon="return-down-back-outline" title="Refunds & terms" defaultOpen>
              <Txt v="small">Contributions are refunded in full if the goal isn’t reached, or if the campaign can’t be promoted. Unspent advertising budget is refunded proportionally. The processing fee is refunded with a full refund.</Txt>
              <Txt v="small" color={colors.muted}>Funding the goal does not start ads automatically. Ads begin only after approval, payment and ad setup checks are complete.</Txt>
            </Expandable>
          </View>
        )}

        {step === 2 && quote && (
          <View style={{ gap: space.lg }}>
            <Txt v="h2">Payment</Txt>
            <Notice tone="info" icon="flask-outline" title="Simulated checkout">No real money moves. Test cards: 4242… succeeds · 4000 0000 0000 0341 stays pending · 4000 0000 0000 0002 is declined · 4000 0000 0000 0069 is rejected.</Notice>
            {!user && (
              <View style={{ gap: space.sm }}>
                <Field label="Email for your receipt" required value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" hint="Guest checkout. We only ask for what we need." />
                <Pressable onPress={() => router.push('/auth')} accessibilityRole="link"><Txt v="small" color={colors.primary} style={{ fontWeight: '700' }}>Have an account? Sign in to track this contribution</Txt></Pressable>
              </View>
            )}
            <Field label="Test card number" required value={card} onChangeText={setCard} keyboardType="number-pad" />
            {user && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={{ flex: 1 }}>
                  <Txt v="small" style={{ fontWeight: '700' }}>Show my name publicly</Txt>
                  <Txt v="caption" color={colors.muted}>Off by default. Payment records are kept either way.</Txt>
                </View>
                <Switch value={showName} onValueChange={setShowName} trackColor={{ true: colors.primary }} accessibilityLabel="Show my name publicly" />
              </View>
            )}
            <Pressable onPress={() => setTerms(!terms)} accessibilityRole="checkbox" accessibilityState={{ checked: terms }} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start', minHeight: 48 }}>
              <Ionicons name={terms ? 'checkbox' : 'square-outline'} size={26} color={terms ? colors.primary : colors.muted} />
              <Txt v="small" style={{ flex: 1 }}>I understand my {money(quote.totalCents, { exact: true })} pays for advertising this message and is not a donation to the cause.</Txt>
            </Pressable>
            {payErr && <Notice tone="danger">{payErr}</Notice>}
          </View>
        )}
      </ScrollView>

      <StickyBar>
        {step === 0 && <Button title={quote && valid ? `Continue with ${money(amount)}` : 'Choose an amount'} disabled={!valid || !quote} onPress={() => setStep(1)} />}
        {step === 1 && <Button title="Continue to payment" onPress={() => setStep(2)} />}
        {step === 2 && quote && <Button title={`Pay ${money(quote.totalCents, { exact: true })}`} loading={busy} onPress={pay} />}
      </StickyBar>
    </KeyboardAvoidingView>
  );
}
