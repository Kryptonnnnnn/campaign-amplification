import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { CoverImage } from '../../../src/components/CoverImage';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Expandable, Field, Notice, Row, StickyBar, Txt } from '../../../src/components/ui';
import { STEP_OF_FIELD, STEPS, useDraft, validateStep } from '../../../src/draft/DraftContext';
import { api, ApiError, imageUrl, Meta } from '../../../src/lib/api';
import { useAsync } from '../../../src/lib/useAsync';
import { estimateAtGoal } from '../../../src/lib/estimate';
import { compact, money } from '../../../src/lib/format';
import { useToast } from '../../../src/store/toast';
import { colors, space } from '../../../src/theme';

const MESSAGES: Record<string, string> = { rules: 'Please confirm the campaign rules' };

function Block({ title, step, children }: { title: string; step: number; children: React.ReactNode }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { flush } = useDraft();
  return (
    <Card style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt v="h3">{title}</Txt>
        <Pressable onPress={async () => { await flush(); router.replace(`/draft/${id}/${STEPS[step]}`); }} accessibilityRole="link" accessibilityLabel={`Edit ${title}`} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
          <Txt v="small" color={colors.primary} style={{ fontWeight: '700' }}>Edit</Txt>
        </Pressable>
      </View>
      {children}
    </Card>
  );
}

export default function Submit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { draft, patch, flush, errors, setErrors, goalText, setGoalText } = useDraft();
  const toast = useToast();
  const meta = useAsync(() => api<Meta>('/meta'), [], { refetchOnFocus: false });
  const [rules, setRules] = useState(false);
  const [busy, setBusy] = useState(false);
  const scroller = React.useRef<ScrollView>(null);

  const a = meta.data?.assumptions;
  const goal = Math.round(parseFloat(goalText) * 100);
  const goalOk = Number.isFinite(goal) && a && goal >= a.minGoalCents && goal <= a.maxGoalCents;
  const est = goalOk && a ? estimateAtGoal(goal, a) : null;

  const onGoal = (t: string) => {
    const clean = t.replace(/[^0-9.]/g, '');
    setGoalText(clean);
    const n = Math.round(parseFloat(clean) * 100);
    patch({ goalCents: Number.isFinite(n) ? n : null }); // set only by the creator, never auto-filled
    if (errors.goal) { const { goal: _, ...rest } = errors; setErrors(rest); }
  };

  // Every step's problems, so the creator can jump straight to what's missing.
  const allErrors = () => {
    const out: Record<string, string> = {};
    for (let i = 0; i < 5; i++) Object.assign(out, validateStep(draft, i, goalText));
    return out;
  };
  // Client-side gaps plus anything the server rejected that the client didn't catch (e.g. state changed elsewhere).
  const clientIssues = allErrors();
  const issues = [...Object.entries(clientIssues), ...Object.entries(errors).filter(([k]) => !(k in clientIssues) && k !== 'rules')];

  const submit = async () => {
    const e = allErrors();
    if (!rules) e.rules = MESSAGES.rules;
    setErrors(e);
    if (Object.keys(e).length) {
      toast('Complete the items highlighted below', 'error');
      // Only the confirmation box is outstanding: it sits at the bottom, so take the creator there.
      if (Object.keys(e).every((k) => k === 'rules')) scroller.current?.scrollToEnd({ animated: true }); else scroller.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setBusy(true);
    try {
      if (!(await flush())) throw new Error('Couldn’t save your latest changes. Check your connection and try again.');
      await api(`/campaigns/${id}/submit`, { method: 'POST', body: { acceptedRules: true } });
      router.replace(`/submitted/${id}`);
    } catch (err: any) {
      if (err instanceof ApiError && err.fields) { setErrors(err.fields); scroller.current?.scrollTo({ y: 0, animated: true }); }
      toast(err.message, 'error');
    } finally { setBusy(false); }
  };

  const saveDraft = async () => { const ok = await flush(); toast(ok ? 'Draft saved. Resume anytime from Create' : 'Couldn’t save. Check your connection', ok ? 'success' : 'error'); };
  const v = draft.visuals;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }}>
        <View style={{ gap: 4 }}>
          <Txt v="h1">Review & submit</Txt>
          <Txt color={colors.muted}>Set your funding goal, check everything one last time, then send it to our reviewers.</Txt>
        </View>

        {issues.length > 0 && (
          <Notice tone="warning" title={`${issues.length} ${issues.length === 1 ? 'item' : 'items'} to finish before you can submit`}>
            {issues.map(([k, m]) => `• ${m}`).join('\n')}
          </Notice>
        )}

        <Card style={{ gap: space.md, borderColor: colors.primary, borderWidth: 1.5 }}>
          <Txt v="h2">Funding goal <Txt v="small" color={colors.danger}>*</Txt></Txt>
          <Notice tone="info" icon="hand-left-outline">You set this number. We never generate it with AI or change it for you. It’s the total backers can contribute toward your ads.</Notice>
          <Field label="Goal (USD)" required value={goalText} onChangeText={onGoal} keyboardType="decimal-pad" placeholder="e.g. 3000" error={errors.goal}
            hint={a ? `Between ${money(a.minGoalCents)} and ${money(a.maxGoalCents)}` : undefined} />
          {est && a && (
            <View style={{ gap: space.xs }}>
              <Row label={`Advertising budget (after ${a.platformFeePct}% platform fee)`} value={money(est.advertising, { exact: true })} />
              <Row label="Platform fee" value={money(est.platformFee, { exact: true })} />
              <Row label="Estimated reach at goal" value={`~${compact(est.reach)} people`} bold />
              <Txt v="caption" color={colors.muted}>Estimate based on demo assumptions: ${a.cpmCents / 100} per 1,000 impressions, ~{a.avgFrequency} views per person. Not a guarantee.</Txt>
            </View>
          )}
        </Card>

        <Block title="Campaign" step={0}>
          {draft.coverImage && <CoverImage uri={draft.coverImage} rounded={12} style={{ height: 120 }} />}
          <Txt v="h3">{draft.title || '—'}</Txt>
          <Txt v="small" color={colors.muted}>{draft.category ?? 'No category'} · by {draft.creatorName || '—'} ({draft.creatorType})</Txt>
          <Txt v="small">{draft.summary}</Txt>
        </Block>
        <Block title="Story & sources" step={1}>
          <Row label="Sections" value={String(draft.story.sections.length)} />
          <Row label="Statistics" value={String(draft.story.stats.length)} />
          <Row label="Sources (shown publicly)" value={String(draft.story.sources.length)} />
        </Block>
        <Block title="Ad visuals" step={2}>
          <Row label="Ad images" value={String(v.adImages.length)} />
          <Row label="Headline" value={v.headline || `${draft.title.slice(0, 40)} (from title)`} />
          <Row label="Button" value={v.cta} />
        </Block>
        <Block title="Reach" step={3}>
          <Row label="Locations" value={draft.reach.locations.join(', ') || '—'} />
          <Row label="Channels" value={draft.reach.channels.join(', ') || '—'} />
          <Row label="Duration" value={`${draft.reach.durationDays} days`} />
        </Block>

        <Expandable icon="receipt-outline" title="Fees & funding policies" defaultOpen>
          <Txt v="small">• A {a?.platformFeePct ?? 10}% platform fee is taken from each contribution. The rest funds advertising for this campaign only.</Txt>
          <Txt v="small">• Backers also pay a small payment-processing fee on top. It is not part of your budget.</Txt>
          <Txt v="small">• If your goal isn’t reached by the end of the 30-day funding period, we decide whether to run a smaller campaign or refund backers.</Txt>
          <Txt v="small">• Reaching the goal doesn’t start ads automatically. Ads begin only after approval, settled payments and ad setup checks.</Txt>
          <Txt v="small">• Funds are never paid out to you. They pay for distribution of your message.</Txt>
          <Txt v="small">• Material changes after publishing return to review before ads are updated.</Txt>
        </Expandable>

        <Pressable onPress={() => { setRules(!rules); if (errors.rules) { const { rules: _, ...rest } = errors; setErrors(rest); } }} accessibilityRole="checkbox" accessibilityState={{ checked: rules }}
          style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start', minHeight: 48 }}>
          <Ionicons name={rules ? 'checkbox' : 'square-outline'} size={26} color={rules ? colors.primary : errors.rules ? colors.danger : colors.muted} />
          <View style={{ flex: 1 }}>
            <Txt v="small">I confirm this campaign follows the <Txt v="small" color={colors.primary} style={{ fontWeight: '700' }} onPress={() => router.push('/info/community-guidelines')}>community guidelines</Txt> and <Txt v="small" color={colors.primary} style={{ fontWeight: '700' }} onPress={() => router.push('/info/terms')}>submission rules</Txt>, that my sources are accurate to the best of my knowledge, and that I have the rights to all images used.</Txt>
            {errors.rules && <Txt v="caption" color={colors.danger}>{errors.rules}</Txt>}
          </View>
        </Pressable>
      </ScrollView>

      <StickyBar>
        <View style={{ gap: space.sm }}>
          <Button title="Submit for review" icon="paper-plane" onPress={submit} loading={busy} />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button small kind="ghost" title="Back" onPress={async () => { await flush(); router.replace(`/draft/${id}/reach`); }} style={{ flex: 1 }} />
            <Button small kind="secondary" title="Save draft" onPress={saveDraft} style={{ flex: 1 }} />
            <Button small kind="secondary" title="Preview" icon="eye-outline" onPress={async () => { await flush(); router.replace(`/draft/${id}/preview`); }} style={{ flex: 1 }} />
          </View>
        </View>
      </StickyBar>
    </KeyboardAvoidingView>
  );
}
