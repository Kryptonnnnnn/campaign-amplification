import React, { useState } from 'react';
import { Alert, ScrollView, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, ErrorState, Expandable, Field, Header, Notice, ProgressBar, Row, Skeleton, Txt } from '../../src/components/ui';
import { Timeline } from '../../src/components/Timeline';
import { api, Campaign } from '../../src/lib/api';
import { useAsync } from '../../src/lib/useAsync';
import { useToast } from '../../src/store/toast';
import { compact, dateShort, money, STATUS_HELP, STATUS_LABEL, STATUS_TONE, timeAgo } from '../../src/lib/format';
import { colors, space } from '../../src/theme';

type Rep = { advertisingBudgetCents: number; estimated: { reach: number }; measured: null | { adSpendCents: number; impressions: number; reach: number; clicks: number; ctr: number; final: boolean } };

export default function Manage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api<{ campaign: Campaign; updates: any[]; state: { isOwner: boolean } }>(`/campaigns/${id}`), [id]);
  const pub = data && ['funding', 'goal_reached', 'funding_ended', 'distribution_prep', 'promoting', 'completed'].includes(data.campaign.status);
  const report = useAsync(async () => (pub ? api<Rep>(`/campaigns/${id}/report`) : null), [id, pub]);
  const act = useAsync(async () => (pub ? api<{ items: { amountCents: number; status: string; createdAt: string }[] }>(`/campaigns/${id}/activity`) : null), [id, pub]);
  const crs = useAsync(async () => (pub ? api<{ items: { id: string; note: string; status: string; resolutionNote: string | null; createdAt: string }[] }>(`/campaigns/${id}/change-requests`) : null), [id, pub]);
  const [crNote, setCrNote] = useState('');
  const [crBusy, setCrBusy] = useState(false);
  const [uTitle, setUTitle] = useState('');
  const [uBody, setUBody] = useState('');
  const [posting, setPosting] = useState(false);

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Header title="Manage" /><View style={{ padding: space.lg, gap: space.md }}><Skeleton h={80} /><Skeleton h={220} /></View></View>;
  if (error || !data) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Header title="Manage" /><ErrorState message={error ?? 'Not found'} onRetry={reload} /></View>;
  const c = data.campaign;
  const editable = c.status === 'draft' || c.status === 'changes_requested';
  const r = report.data;
  const budget = r?.advertisingBudgetCents ?? 0;

  const cancelCampaign = () => Alert.alert('Cancel this campaign?',
    c.status === 'draft' || c.status === 'changes_requested' ? 'It will be closed. This can’t be undone.' : 'Ads will not run. Every backer will be refunded in full. This can’t be undone.',
    [{ text: 'Keep campaign', style: 'cancel' }, { text: 'Cancel campaign', style: 'destructive', onPress: async () => {
      try { const r = await api<{ status: string }>(`/campaigns/${id}/cancel`, { method: 'POST', body: {} }); toast(r.status === 'refund_pending' ? 'Cancelled. Backers will be refunded' : 'Campaign cancelled', 'info'); reload(); }
      catch (e: any) { toast(e.message, 'error'); } } }]);
  const submitCr = async () => {
    setCrBusy(true);
    try { await api(`/campaigns/${id}/change-requests`, { method: 'POST', body: { note: crNote } }); setCrNote(''); toast('Change request sent for review'); crs.reload(); }
    catch (e: any) { toast(e.message, 'error'); } finally { setCrBusy(false); }
  };
  const postUpdate = async () => {
    setPosting(true);
    try { await api(`/campaigns/${id}/updates`, { method: 'POST', body: { title: uTitle, body: uBody } }); setUTitle(''); setUBody(''); toast('Update posted. Followers will be notified'); reload(); }
    catch (e: any) { toast(e.message, 'error'); } finally { setPosting(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Manage campaign" />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }}>
        <View style={{ gap: space.sm }}>
          <Badge label={STATUS_LABEL[c.status]} tone={STATUS_TONE[c.status]} />
          <Txt v="h1">{c.title || 'Untitled campaign'}</Txt>
          {STATUS_HELP[c.status] && <Txt color={colors.muted}>{STATUS_HELP[c.status]}</Txt>}
        </View>

        {c.status === 'changes_requested' && c.reviewerNote && <Notice tone="warning" title="Reviewer feedback">{c.reviewerNote}</Notice>}
        {c.status === 'rejected' && <Notice tone="danger" title="Not approved">{c.reviewerNote ?? 'This campaign did not meet the campaign rules.'}</Notice>}

        <View style={{ gap: space.sm }}>
          {editable && <Button title={c.status === 'draft' ? 'Continue editing' : 'Edit and resubmit'} icon="create-outline" onPress={() => router.push(`/draft/${c.id}`)} />}
          {c.status !== 'draft' && <Button title="View public page" icon="eye-outline" kind="secondary" onPress={() => router.push(`/campaign/${c.id}`)} />}
          {pub && <Button title="Share campaign link" icon="share-outline" kind="secondary" onPress={() => Share.share({ message: `${c.title}\namplify://campaign/${c.id}` })} />}
          {r && <Button title={r.measured?.final ? 'Open final report' : 'Open distribution report'} icon="bar-chart-outline" kind="secondary" onPress={() => router.push(`/report/${c.id}`)} />}
        </View>

        {!editable && <Notice tone="info" icon="lock-closed-outline" title="Content is locked">Submitted and published campaigns can’t be edited directly. Material changes go back through review before any advertising is updated.</Notice>}

        {pub && (
          <Card style={{ gap: space.md }}>
            <Txt v="h2">Funding</Txt>
            <ProgressBar percent={c.percentFunded} height={10} />
            <Row label="Raised" value={money(c.raisedCents)} bold />
            <Row label="Goal" value={money(c.goalCents)} />
            <Row label="Backers" value={String(c.backersCount)} />
            {c.deadline && <Row label="Funding ends" value={dateShort(c.deadline)} />}
          </Card>
        )}

        {pub && r && (
          <Card style={{ gap: space.md }}>
            <Txt v="h2">Analytics</Txt>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Badge label="Estimated" tone="warning" /><Txt v="small" color={colors.muted}>Model output, not delivery</Txt></View>
            <Row label="Ad budget allocated" value={money(budget, { exact: true })} />
            <Row label="Est. reach (full budget)" value={`~${compact(r.estimated.reach)}`} />
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Badge label="Measured" tone="success" /><Txt v="small" color={colors.muted}>From ad platform reports</Txt></View>
            {r.measured ? (<>
              <Row label="Ad spend" value={money(r.measured.adSpendCents, { exact: true })} />
              <Row label="Impressions" value={compact(r.measured.impressions)} />
              <Row label="People reached" value={compact(r.measured.reach)} />
              <Row label="Clicks (CTR)" value={`${compact(r.measured.clicks)} (${r.measured.ctr}%)`} />
            </>) : <Txt v="small" color={colors.muted}>No delivery yet. Measured numbers appear once ads start.</Txt>}
          </Card>
        )}

        <Card style={{ gap: space.md }}><Txt v="h2">Campaign progress</Txt><Timeline status={c.status} /></Card>

        {pub && act.data && act.data.items.length > 0 && (
          <Card style={{ gap: space.sm }}>
            <Txt v="h2">Backer activity</Txt>
            <Txt v="caption" color={colors.muted}>Backers are anonymous to you. You see amounts and timing only.</Txt>
            {act.data.items.slice(0, 6).map((a, i) => <Row key={i} label={`Anonymous backer · ${timeAgo(a.createdAt)}${a.status !== 'succeeded' ? ` · ${a.status}` : ''}`} value={money(a.amountCents)} />)}
          </Card>
        )}

        {pub && c.status !== 'completed' && (
          <Expandable icon="create-outline" title="Request a change" summary="Material edits go back through review">
            <Txt v="small" color={colors.muted}>Live campaigns are locked. Describe what you’d like changed (for example a corrected statistic or new ad image). Reviewers decide, and ads aren’t updated until it’s approved.</Txt>
            <Field label="What should change?" required multiline value={crNote} onChangeText={setCrNote} maxLength={1000} />
            <Button small title="Send change request" onPress={submitCr} loading={crBusy} disabled={crNote.trim().length < 10} />
            {(crs.data?.items ?? []).map((r) => (
              <Card key={r.id} style={{ gap: 2 }}>
                <Badge label={r.status === 'pending' ? 'Waiting for review' : r.status === 'accepted' ? 'Accepted' : 'Declined'} tone={r.status === 'pending' ? 'info' : r.status === 'accepted' ? 'success' : 'neutral'} />
                <Txt v="small">{r.note}</Txt>
                {r.resolutionNote && <Txt v="caption" color={colors.muted}>Reviewer: {r.resolutionNote}</Txt>}
              </Card>
            ))}
          </Expandable>
        )}

        {pub && (
          <Expandable icon="chatbubble-ellipses-outline" title="Post a campaign update" summary="Followers and backers are notified">
            <Field label="Title" required value={uTitle} onChangeText={setUTitle} maxLength={100} />
            <Field label="Message" required multiline value={uBody} onChangeText={setUBody} maxLength={1000} />
            <Button small title="Post update" onPress={postUpdate} loading={posting} disabled={!uTitle.trim() || !uBody.trim()} />
          </Expandable>
        )}
        {['draft', 'changes_requested', 'funding'].includes(c.status) && <Button title="Cancel campaign" kind="danger" onPress={cancelCampaign} />}
        {data.updates.length > 0 && (
          <View style={{ gap: space.sm }}>
            <Txt v="h3">Posted updates</Txt>
            {data.updates.map((u) => <Card key={u.id} style={{ gap: 2 }}><Txt v="small" style={{ fontWeight: '700' }}>{u.title}</Txt><Txt v="small" color={colors.muted}>{u.body}</Txt></Card>)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
