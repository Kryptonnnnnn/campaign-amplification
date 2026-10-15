import React from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Badge, Card, ErrorState, Header, Notice, ProgressBar, Row, Skeleton, Txt } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { useAsync } from '../../src/lib/useAsync';
import { compact, dateShort, money } from '../../src/lib/format';
import { colors, space } from '../../src/theme';

type Rep = {
  status: string; fundsRaisedCents: number; platformFeeCents: number; advertisingBudgetCents: number;
  estimated: { reach: number; basis: string };
  measured: null | { adSpendCents: number; impressions: number; reach: number; clicks: number; ctr: number; final: boolean; updatedAt: string };
  audienceFeedback: { total: number; visuals: Record<string, number>; persuaded: Record<string, number> }; note: string;
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <View style={{ flexGrow: 1, flexBasis: '45%', backgroundColor: colors.bg, borderRadius: 12, padding: space.md }}>
    <Txt v="h2">{value}</Txt><Txt v="caption" color={colors.muted}>{label}</Txt>
  </View>
);

export default function Report() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useAsync(() => api<Rep>(`/campaigns/${id}/report`), [id]);
  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Header title="Report" /><View style={{ padding: space.lg, gap: space.md }}><Skeleton h={120} /><Skeleton h={160} /></View></View>;
  if (error || !data) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Header title="Report" /><ErrorState message={error ?? 'No report'} onRetry={reload} /></View>;
  const m = data.measured;
  const spendPct = m && data.advertisingBudgetCents ? Math.round((m.adSpendCents / data.advertisingBudgetCents) * 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title={m?.final ? 'Final report' : 'Promotion progress'} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }}>
        <Notice tone="info">{data.note} Estimated and measured numbers are shown separately and never mixed.</Notice>

        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Txt v="h2">Funds</Txt><Badge label="Actual" tone="success" /></View>
          <Row label="Funds raised" value={money(data.fundsRaisedCents, { exact: true })} bold />
          <Row label="Platform fee" value={money(data.platformFeeCents, { exact: true })} />
          <Row label="Advertising budget" value={money(data.advertisingBudgetCents, { exact: true })} />
        </Card>

        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Txt v="h2">Estimated</Txt><Badge label="Model estimate" tone="warning" /></View>
          <Row label="Est. people reached with full budget" value={`~${compact(data.estimated.reach)}`} bold />
          <Txt v="caption" color={colors.muted}>Basis: {data.estimated.basis}. Not a guarantee.</Txt>
        </Card>

        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Txt v="h2">Measured delivery</Txt><Badge label={m ? (m.final ? 'Final' : 'In progress') : 'Not started'} tone={m ? 'success' : 'neutral'} /></View>
          {!m ? <Txt v="small" color={colors.muted}>No ads have been delivered yet. Measured figures appear here once promotion starts.</Txt> : (<>
            <View style={{ gap: 4 }}>
              <ProgressBar percent={spendPct} tone={colors.accent} />
              <Txt v="caption" color={colors.muted}>{money(m.adSpendCents, { exact: true })} of {money(data.advertisingBudgetCents, { exact: true })} spent ({spendPct}%)</Txt>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              <Metric label="Impressions" value={compact(m.impressions)} /><Metric label="People reached" value={compact(m.reach)} />
              <Metric label="Clicks" value={compact(m.clicks)} /><Metric label="Click-through rate" value={`${m.ctr}%`} />
            </View>
            <Txt v="caption" color={colors.muted}>Last synced {dateShort(m.updatedAt)}. Figures come from ad platform delivery reports (simulated in this prototype).</Txt>
          </>)}
        </Card>

        <Card style={{ gap: space.sm }}>
          <Txt v="h2">Audience feedback</Txt>
          {data.audienceFeedback.total === 0 ? <Txt v="small" color={colors.muted}>No feedback yet.</Txt> : (<>
            <Txt v="small" color={colors.muted}>{data.audienceFeedback.total} responses</Txt>
            <Row label="Visuals made them keep reading (Yes / Somewhat / No)" value={`${data.audienceFeedback.visuals.Yes} / ${data.audienceFeedback.visuals.Somewhat} / ${data.audienceFeedback.visuals.No}`} />
            <Row label="Message changed their mind (Yes / Somewhat / No)" value={`${data.audienceFeedback.persuaded.Yes} / ${data.audienceFeedback.persuaded.Somewhat} / ${data.audienceFeedback.persuaded.No}`} />
          </>)}
        </Card>
      </ScrollView>
    </View>
  );
}
