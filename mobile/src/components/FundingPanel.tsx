import React from 'react';
import { View } from 'react-native';
import { Card, ProgressBar, Txt } from './ui';
import { Campaign } from '../lib/api';
import { compact, money } from '../lib/format';
import { colors, space } from '../theme';

export function FundingPanel({ c }: { c: Campaign }) {
  return (
    <Card style={{ gap: space.md }}>
      <View>
        <Txt v="h1" style={{ fontSize: 28 }}>{money(c.raisedCents)}</Txt>
        <Txt v="small" color={colors.muted}>raised toward a {money(c.goalCents)} promotion goal</Txt>
      </View>
      <ProgressBar percent={c.percentFunded} height={10} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Stat label="Funded" value={`${c.percentFunded}%`} />
        <Stat label="Backers" value={String(c.backersCount)} />
        <Stat label="Time left" value={c.status === 'funding' && c.daysLeft != null ? `${c.daysLeft}d` : '—'} />
      </View>
      <View style={{ backgroundColor: colors.primarySoft, borderRadius: 12, padding: space.md }}>
        <Txt v="small" style={{ fontWeight: '700' }} color={colors.primaryDark}>Est. reach at goal: ~{compact(c.estimatedReachAtGoal)} people</Txt>
        <Txt v="caption" color={colors.muted}>An estimate from demo ad-price assumptions, not a guarantee. Sample figures are demonstration data.</Txt>
      </View>
    </Card>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <View><Txt v="h2">{value}</Txt><Txt v="caption" color={colors.muted}>{label}</Txt></View>
);
