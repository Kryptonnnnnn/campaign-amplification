import React from 'react';
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { AuthGate } from '../src/components/AuthGate';
import { Badge, Card, EmptyState, ErrorState, Header, Skeleton, Txt } from '../src/components/ui';
import { api } from '../src/lib/api';
import { useAsync } from '../src/lib/useAsync';
import { dateShort, money, Tone } from '../src/lib/format';
import { colors, space } from '../src/theme';

type Item = { id: string; campaignId: string; campaignTitle: string; amountCents: number; totalCents: number; status: string; failureReason: string | null; createdAt: string; receiptNo: string };
const TONE: Record<string, Tone> = { succeeded: 'success', pending: 'warning', failed: 'danger', rejected: 'danger', cancelled: 'neutral', refunded: 'info' };
const LABEL: Record<string, string> = { succeeded: 'Paid', pending: 'Pending', failed: 'Failed', rejected: 'Rejected', cancelled: 'Cancelled', refunded: 'Refunded' };

function Body() {
  const { data, loading, error, reload, refresh, refreshing } = useAsync(() => api<{ items: Item[] }>('/me/contributions'), []);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Payment history" />
      {loading ? <View style={{ padding: space.lg, gap: space.md }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={84} r={18} />)}</View> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <FlatList data={data!.items} keyExtractor={(i) => i.id} onRefresh={refresh} refreshing={refreshing} contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
          ListHeaderComponent={<Txt v="small" color={colors.muted}>Contributions pay for advertising, not donations to a cause. Tap a payment for its receipt.</Txt>}
          ListEmptyComponent={<EmptyState icon="receipt-outline" title="No payments yet" body="When you back a campaign, your receipt appears here." action="Explore campaigns" onAction={() => router.push('/explore')} />}
          renderItem={({ item: i }) => (
            <Card onPress={() => router.push(`/receipt/${i.id}`)} accessibilityLabel={`${i.campaignTitle}, ${money(i.totalCents, { exact: true })}, ${LABEL[i.status]}`} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Badge label={LABEL[i.status] ?? i.status} tone={TONE[i.status] ?? 'neutral'} /><Txt v="caption" color={colors.muted}>{dateShort(i.createdAt)}</Txt></View>
              <Txt v="h3" numberOfLines={2}>{i.campaignTitle}</Txt>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt v="small" color={colors.muted}>{i.receiptNo}</Txt><Txt v="small" style={{ fontWeight: '800' }}>{money(i.totalCents, { exact: true })}</Txt></View>
              {i.failureReason && <Txt v="caption" color={colors.danger}>{i.failureReason}</Txt>}
            </Card>
          )} />
      )}
    </View>
  );
}
export default function Payments() { return <AuthGate icon="receipt-outline" title="Payment history" body="Sign in to see receipts for campaigns you’ve backed."><Body /></AuthGate>; }
