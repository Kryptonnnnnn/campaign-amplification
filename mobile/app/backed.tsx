import React from 'react';
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { AuthGate } from '../src/components/AuthGate';
import { Badge, Button, Card, EmptyState, ErrorState, Header, Skeleton, Txt } from '../src/components/ui';
import { api } from '../src/lib/api';
import { useAsync } from '../src/lib/useAsync';
import { money, STATUS_LABEL, STATUS_TONE } from '../src/lib/format';
import { colors, space } from '../src/theme';

type Item = { id: string; campaignId: string; campaignTitle: string; campaignStatus: string; amountCents: number; status: string };

function Body() {
  const { data, loading, error, reload, refresh, refreshing } = useAsync(() => api<{ items: Item[] }>('/me/contributions'), []);
  // One row per campaign, summing confirmed contributions only.
  const byCampaign = new Map<string, Item & { total: number; count: number }>();
  for (const i of data?.items ?? []) {
    if (i.status !== 'succeeded') continue;
    const cur = byCampaign.get(i.campaignId);
    if (cur) { cur.total += i.amountCents; cur.count += 1; } else byCampaign.set(i.campaignId, { ...i, total: i.amountCents, count: 1 });
  }
  const rows = [...byCampaign.values()];
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Backed campaigns" />
      {loading ? <View style={{ padding: space.lg, gap: space.md }}>{[0, 1].map((i) => <Skeleton key={i} h={120} r={18} />)}</View> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <FlatList data={rows} keyExtractor={(i) => i.campaignId} onRefresh={refresh} refreshing={refreshing} contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState icon="heart-outline" title="You haven’t backed a campaign yet" body="Backing pays for advertising so a message can reach more people." action="Explore campaigns" onAction={() => router.push('/explore')} />}
          renderItem={({ item: i }) => (
            <Card style={{ gap: space.sm }}>
              <Badge label={STATUS_LABEL[i.campaignStatus]} tone={STATUS_TONE[i.campaignStatus]} />
              <Txt v="h3" numberOfLines={2}>{i.campaignTitle}</Txt>
              <Txt v="small" color={colors.muted}>You contributed {money(i.total)} across {i.count} {i.count === 1 ? 'payment' : 'payments'}.</Txt>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Button small kind="secondary" title="Campaign" onPress={() => router.push(`/campaign/${i.campaignId}`)} style={{ flex: 1 }} />
                {['promoting', 'completed'].includes(i.campaignStatus) && <Button small title="Report" icon="bar-chart-outline" onPress={() => router.push(`/report/${i.campaignId}`)} style={{ flex: 1 }} />}
              </View>
            </Card>
          )} />
      )}
    </View>
  );
}
export default function Backed() { return <AuthGate icon="heart-outline" title="Backed campaigns" body="Sign in to track campaigns you’ve helped promote."><Body /></AuthGate>; }
