import React, { useEffect, useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ErrorState, Notice, ProgressBar, Row, Skeleton, Txt } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { useAsync } from '../../src/lib/useAsync';
import { useAuth } from '../../src/store/auth';
import { useToast } from '../../src/store/toast';
import { compact, dateShort, money } from '../../src/lib/format';
import { colors, space } from '../../src/theme';

type R = {
  contribution: { id: string; campaignId: string; status: string; failureReason: string | null; amountCents: number; platformFeeCents: number; processingFeeCents: number; totalCents: number; receiptNo: string; createdAt: string; estimatedReach: number };
  campaignTitle: string; progress: { raisedCents: number; goalCents: number; percent: number }; statement: string;
};

const HEAD: Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string; title: string; body: string }> = {
  succeeded: { icon: 'checkmark-circle', color: colors.success, bg: colors.successSoft, title: 'Payment confirmed', body: 'Thank you. Your contribution is now part of this campaign’s advertising budget.' },
  pending: { icon: 'time', color: colors.warning, bg: colors.warningSoft, title: 'Payment pending', body: 'Your bank hasn’t confirmed yet. This usually takes a few seconds. Nothing is counted toward the campaign until it’s confirmed.' },
  failed: { icon: 'close-circle', color: colors.danger, bg: colors.dangerSoft, title: 'Payment didn’t go through', body: 'You haven’t been charged.' },
  rejected: { icon: 'shield-half', color: colors.danger, bg: colors.dangerSoft, title: 'Payment rejected', body: 'You haven’t been charged. Try another card or contact your bank.' },
  refunded: { icon: 'return-down-back', color: colors.info, bg: colors.infoSoft, title: 'Payment refunded', body: 'This contribution was refunded in full.' },
  cancelled: { icon: 'remove-circle', color: colors.muted, bg: '#EDEBE4', title: 'Payment cancelled', body: 'You cancelled this payment. You haven’t been charged.' },
};

export default function Receipt() {
  const { id, token } = useLocalSearchParams<{ id: string; token?: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useAsync(() => api<R>(`/contributions/${id}${token ? `?token=${token}` : ''}`), [id, token]);
  const [cancelling, setCancelling] = useState(false);

  // Poll while pending so the screen updates when the bank confirms.
  const status = data?.contribution.status;
  useEffect(() => {
    if (status !== 'pending') return;
    const t = setInterval(reload, 3000);
    return () => clearInterval(t);
  }, [status, reload]);

  if (loading && !data) return <View style={{ flex: 1, backgroundColor: colors.bg, padding: space.xl, paddingTop: 48, gap: space.md }}><Skeleton h={80} /><Skeleton h={160} /></View>;
  if (error || !data) return <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 80 }}><ErrorState message={error ?? 'Receipt not found'} onRetry={reload} /></View>;

  const k = data.contribution;
  const h = HEAD[k.status] ?? HEAD.failed;

  const cancel = async () => {
    setCancelling(true);
    try { await api(`/contributions/${id}/cancel${token ? `?token=${token}` : ''}`, { method: 'POST' }); await reload(); toast('Payment cancelled', 'info'); }
    catch (e: any) { toast(e.message, 'error'); } finally { setCancelling(false); }
  };

  const follow = async () => {
    if (!user) return router.push('/auth');
    try { await api(`/campaigns/${k.campaignId}/follow`, { method: 'POST', body: { kind: 'follow', on: true } }); toast('Following. You’ll see progress in Activity'); router.replace('/activity'); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space.xl, paddingTop: 48, gap: space.lg, paddingBottom: 56 }}>
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: h.bg, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={h.icon} size={52} color={h.color} /></View>
        <Txt v="h1" center>{h.title}</Txt>
        <Txt color={colors.muted} center>{(k.status === 'failed' || k.status === 'rejected') && k.failureReason ? `${k.failureReason} ${h.body}` : h.body}</Txt>
      </View>

      <Card style={{ gap: space.sm }}>
        <Txt v="caption" color={colors.muted} style={{ fontWeight: '800' }}>RECEIPT {k.receiptNo}</Txt>
        <Txt v="h3">{data.campaignTitle}</Txt>
        <Row label="Date" value={dateShort(k.createdAt)} />
        <Row label="Contribution" value={money(k.amountCents, { exact: true })} />
        <Row label="Platform fee (included)" value={money(k.platformFeeCents, { exact: true })} />
        <Row label="Processing fee" value={money(k.processingFeeCents, { exact: true })} />
        <Row label="Total" value={money(k.totalCents, { exact: true })} bold />
        {k.status === 'succeeded' && <Row label="Est. reach (estimate)" value={`~${compact(k.estimatedReach)} people`} />}
      </Card>

      {k.status === 'succeeded' && (
        <Card style={{ gap: space.sm }}>
          <Txt v="h3">Campaign progress</Txt>
          <ProgressBar percent={data.progress.percent} height={10} />
          <Txt v="small" color={colors.muted}>{money(data.progress.raisedCents)} of {money(data.progress.goalCents)} ({data.progress.percent}%)</Txt>
        </Card>
      )}
      <Notice tone="info">{data.statement}</Notice>
      {!user && k.status === 'succeeded' && <Notice tone="warning" title="Guest receipt">Keep this receipt number. Create an account to track this campaign and see your payment history.</Notice>}

      {k.status === 'succeeded' && (<>
        <Button title="Track this campaign" icon="notifications-outline" onPress={follow} />
        <Button title="Share campaign" icon="share-outline" kind="secondary" onPress={() => Share.share({ message: `I just backed “${data.campaignTitle}” on Amplify.\namplify://campaign/${k.campaignId}` })} />
      </>)}
      {k.status === 'pending' && <Button title="Cancel payment" kind="danger" loading={cancelling} onPress={cancel} />}
      {(k.status === 'failed' || k.status === 'cancelled' || k.status === 'rejected') && <Button title="Try again" onPress={() => router.replace(`/back/${k.campaignId}`)} />}
      <Button title="Back to campaign" kind="ghost" onPress={() => router.replace(`/campaign/${k.campaignId}`)} />
    </ScrollView>
  );
}
