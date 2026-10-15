import React from 'react';
import { View } from 'react-native';
import { CoverImage } from './CoverImage';
import { router } from 'expo-router';
import { Badge, Button, Card, ProgressBar, Txt } from './ui';
import { colors, space } from '../theme';
import { Campaign } from '../lib/api';
import { compact, money, STATUS_LABEL, STATUS_TONE } from '../lib/format';

export function CampaignCard({ c, compactCard }: { c: Campaign; compactCard?: boolean }) {
  const open = c.status === 'funding';
  const open_ = () => router.push(`/campaign/${c.id}`);
  return (
    <Card onPress={open_} accessibilityLabel={`${c.title} by ${c.creatorName}. ${c.percentFunded}% funded.`} style={{ padding: 0, overflow: 'hidden' }}>
      <CoverImage uri={c.coverImage} style={{ height: compactCard ? 120 : 168 }} />
      <View style={{ padding: space.lg, gap: space.sm }}>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center', flexWrap: 'wrap' }}>
          {c.category && <Badge label={c.category} tone="primary" />}
          {!open && <Badge label={STATUS_LABEL[c.status]} tone={STATUS_TONE[c.status]} />}
        </View>
        <Txt v="h1" style={{ fontSize: 20, lineHeight: 26 }} numberOfLines={3}>{c.title}</Txt>
        <Txt v="small" color={colors.muted}>by {c.creatorName}</Txt>
        {!compactCard && <Txt v="small" numberOfLines={3}>{c.summary}</Txt>}
        <View style={{ gap: 6, marginTop: space.xs }}>
          <ProgressBar percent={c.percentFunded} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt v="small" style={{ fontWeight: '700' }}>{money(c.raisedCents)} <Txt v="small" color={colors.muted}>of {money(c.goalCents)}</Txt></Txt>
            <Txt v="small" color={colors.muted}>{c.percentFunded}% funded</Txt>
          </View>
          <Txt v="caption" color={colors.muted}>Est. reach at goal: ~{compact(c.estimatedReachAtGoal)} people (estimate)</Txt>
        </View>
        {open && <Button title="Back This Campaign" onPress={() => router.push(`/back/${c.id}`)} style={{ marginTop: space.xs }} />}
      </View>
    </Card>
  );
}

