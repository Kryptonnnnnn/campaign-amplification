import React from 'react';
import { ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { CoverImage } from '../../../src/components/CoverImage';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Expandable, Notice, Row, StickyBar, Txt } from '../../../src/components/ui';
import { StoryView } from '../../../src/components/StoryView';
import { FundingPanel } from '../../../src/components/FundingPanel';
import { SocialFeedPreview } from '../../../src/components/AdPreview';
import { useDraft } from '../../../src/draft/DraftContext';
import { api, Campaign, imageUrl, Meta } from '../../../src/lib/api';
import { useAsync } from '../../../src/lib/useAsync';
import { estimateAtGoal } from '../../../src/lib/estimate';
import { money } from '../../../src/lib/format';
import { colors, space } from '../../../src/theme';

/** Read-only audience view of the draft, exactly as it would appear once published. */
export default function Preview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { draft, goalText } = useDraft();
  const meta = useAsync(() => api<Meta>('/meta'), [], { refetchOnFocus: false });
  const goal = Math.round(parseFloat(goalText) * 100) || 0;
  const est = meta.data && goal ? estimateAtGoal(goal, meta.data.assumptions) : null;
  const c: Campaign = { ...draft, goalCents: goal || null, raisedCents: 0, percentFunded: 0, backersCount: 0, estimatedReachAtGoal: est?.reach ?? null, daysLeft: 30 };
  const v = draft.visuals;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl, gap: space.xl }}>
        <View style={{ backgroundColor: colors.ink, padding: space.md, flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <Badge label="PREVIEW" tone="primary" />
          <Txt v="small" color="#fff" style={{ flex: 1 }}>Not published. Nobody else can see this yet.</Txt>
        </View>
        <CoverImage uri={draft.coverImage} style={{ height: 200 }} />
        <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
          {draft.category && <Badge label={draft.category} tone="primary" />}
          <Txt v="display" style={{ fontSize: 28, lineHeight: 34 }}>{draft.title || 'Untitled campaign'}</Txt>
          <Txt v="small" color={colors.muted}>by <Txt v="small" style={{ fontWeight: '700' }}>{draft.creatorName}</Txt> · {draft.creatorType}</Txt>
          <Txt color={colors.muted}>{draft.summary}</Txt>
        </View>
        <View style={{ paddingHorizontal: space.lg }}><FundingPanel c={c} /></View>
        <View style={{ paddingHorizontal: space.lg }}><StoryView c={c} /></View>
        <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
          <Expandable icon="people-outline" title="Audience & distribution" defaultOpen>
            <Row label="Locations" value={draft.reach.locations.join(', ') || '—'} />
            <Row label="Interests" value={draft.reach.interests.join(', ') || 'Broad'} />
            <Row label="Channels" value={draft.reach.channels.join(', ') || '—'} />
            <Row label="Promotion length" value={`${draft.reach.durationDays} days`} />
          </Expandable>
          <Txt v="h3" style={{ marginTop: space.md }}>How the ad may look</Txt>
          <SocialFeedPreview image={v.adImages[0] ?? draft.coverImage ?? undefined} headline={v.headline || draft.title.slice(0, 40)} description={v.description} cta={v.cta} creator={draft.creatorName} />
          {est && <Notice tone="info" title="Estimated numbers">At your {money(goal)} goal: {money(est.advertising)} for advertising, {money(est.platformFee)} platform fee, about {est.reach.toLocaleString()} people (estimate, not a guarantee).</Notice>}
        </View>
      </ScrollView>
      <StickyBar>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Button title="Back to editing" kind="secondary" onPress={() => router.replace(`/draft/${id}/submit`)} style={{ flex: 1 }} />
        </View>
      </StickyBar>
    </View>
  );
}
