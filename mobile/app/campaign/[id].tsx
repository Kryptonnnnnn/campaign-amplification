import React, { useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, ErrorState, Expandable, Header, IconButton, Notice, Row, Skeleton, StickyBar, Txt, Chip } from '../../src/components/ui';
import { StoryView } from '../../src/components/StoryView';
import { CoverImage } from '../../src/components/CoverImage';
import { Comments } from '../../src/components/Comments';
import { FundingPanel } from '../../src/components/FundingPanel';
import { api, ApiError, Campaign, imageUrl } from '../../src/lib/api';
import { useAsync } from '../../src/lib/useAsync';
import { useAuth } from '../../src/store/auth';
import { useToast } from '../../src/store/toast';
import { compact, dateShort, money, STATUS_HELP, STATUS_LABEL, STATUS_TONE, timeAgo } from '../../src/lib/format';
import { colors, space } from '../../src/theme';

type Detail = {
  campaign: Campaign; updates: { id: string; title: string; body: string; createdAt: string }[];
  backers: { name: string; amountCents: number }[];
  state: { saved: boolean; following: boolean; backed: boolean; isOwner: boolean };
  useOfFunds: { platformFeeCents: number; advertisingCents: number; amountCents: number; processingFeeCents: number }; canBack: boolean;
};

export default function CampaignDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useAsync(() => api<Detail>(`/campaigns/${id}`), [id, user?.id]);
  const [fb, setFb] = useState<{ visuals?: string; persuaded?: string; sent?: boolean }>({});

  const toggle = async (kind: 'save' | 'follow') => {
    if (!user) return router.push('/auth');
    if (!data) return;
    const key = kind === 'save' ? 'saved' : 'following';
    const on = !data.state[key];
    setData({ ...data, state: { ...data.state, [key]: on } }); // optimistic
    try {
      await api(`/campaigns/${id}/follow`, { method: 'POST', body: { kind, on } });
      toast(kind === 'save' ? (on ? 'Saved to your profile' : 'Removed from saved') : on ? 'Following. You’ll get progress updates' : 'Unfollowed', 'success');
    } catch (e: any) { setData(data); toast(e.message, 'error'); }
  };

  const share = () => {
    if (!data) return;
    Share.share({ message: `${data.campaign.title}, by ${data.campaign.creatorName}\namplify://campaign/${id}` });
  };

  const sendFeedback = async () => {
    try {
      await api(`/campaigns/${id}/feedback`, { method: 'POST', body: { visuals: fb.visuals, persuaded: fb.persuaded } });
      setFb({ ...fb, sent: true }); toast('Thanks for the feedback');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}><Header title="Campaign" />
      <View style={{ padding: space.lg, gap: space.md }}><Skeleton h={200} r={18} /><Skeleton h={14} w="30%" /><Skeleton h={30} /><Skeleton h={30} w="70%" /><Skeleton h={120} /></View></View>);
  if (error || !data) return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}><Header title="Campaign" /><ErrorState message={error ?? 'Campaign not found'} onRetry={reload} /></View>);

  const { campaign: c, state, updates, backers } = data;
  const ex = data.useOfFunds; // example on $100
  const live = ['promoting', 'completed'].includes(c.status);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Campaign" right={<IconButton icon="share-outline" label="Share campaign" onPress={share} />} />
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl, gap: space.xl }}>
        <CoverImage uri={c.coverImage} style={{ height: 220 }} />
        <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            {c.category && <Badge label={c.category} tone="primary" />}
            <Badge label={STATUS_LABEL[c.status]} tone={STATUS_TONE[c.status]} />
          </View>
          <Txt v="display" style={{ fontSize: 28, lineHeight: 34 }}>{c.title}</Txt>
          <Txt v="small" color={colors.muted}>
            by <Txt v="small" style={{ fontWeight: '700' }}>{c.creatorName}</Txt> · {c.creatorType}{c.publishedAt ? ` · Published ${dateShort(c.publishedAt)}` : c.submittedAt ? ` · Submitted ${dateShort(c.submittedAt)}` : ''}
          </Txt>
          <Txt color={colors.muted}>{c.summary}</Txt>
          {STATUS_HELP[c.status] && c.status !== 'funding' && <Notice tone="info">{STATUS_HELP[c.status]}</Notice>}
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button small kind="secondary" icon={state.saved ? 'bookmark' : 'bookmark-outline'} title={state.saved ? 'Saved' : 'Save'} onPress={() => toggle('save')} />
            <Button small kind="secondary" icon={state.following ? 'notifications' : 'notifications-outline'} title={state.following ? 'Following' : 'Follow'} onPress={() => toggle('follow')} />
            {state.isOwner && <Button small kind="ghost" icon="settings-outline" title="Manage" onPress={() => router.push(`/manage/${c.id}`)} />}
          </View>
        </View>

        <View style={{ paddingHorizontal: space.lg }}><FundingPanel c={c} /></View>

        <View style={{ paddingHorizontal: space.lg }}><StoryView c={c} /></View>

        {updates.length > 0 && (
          <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
            <Txt v="h2">Campaign updates</Txt>
            {updates.map((u) => (
              <Card key={u.id} style={{ gap: 4 }}>
                <Txt v="small" style={{ fontWeight: '700' }}>{u.title}</Txt>
                <Txt v="small" color={colors.muted}>{u.body}</Txt>
                <Txt v="caption" color={colors.muted}>{timeAgo(u.createdAt)}</Txt>
              </Card>
            ))}
          </View>
        )}

        <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
          <Txt v="h2">Before you back this</Txt>
          <Expandable icon="cash-outline" title="Use of funds" defaultOpen summary="Fees, ad budget, refunds">
            <Notice tone="warning" title="Funds promote the message, not the cause">
              Your contribution pays for advertising that spreads this message. It is not a donation to the person, cause or organization described.
            </Notice>
            <Txt v="small" style={{ fontWeight: '700', marginTop: space.xs }}>Example: a $100 contribution</Txt>
            <Row label="Advertising budget" value={money(ex.advertisingCents)} />
            <Row label="Platform fee (10%)" value={money(ex.platformFeeCents)} />
            <Row label="Payment processing (paid on top)" value={`~${money(ex.processingFeeCents, { exact: true })}`} />
            <Txt v="small" color={colors.muted}>
              <Txt v="small" style={{ fontWeight: '700' }}>Allocation: </Txt>the advertising budget is spent only on this campaign’s approved ads.{'\n'}
              <Txt v="small" style={{ fontWeight: '700' }}>Refunds: </Txt>if the goal isn’t reached or the campaign can’t be promoted (for example it fails review of ad setup), contributions are refunded.{'\n'}
              <Txt v="small" style={{ fontWeight: '700' }}>Unspent funds: </Txt>any advertising budget not spent by the end of the campaign is refunded to backers proportionally.
            </Txt>
          </Expandable>
          <Expandable icon="people-outline" title="Audience & distribution" summary={c.reach.locations.slice(0, 3).join(', ')}>
            <Row label="Locations" value={c.reach.locations.join(', ') || '—'} />
            <Row label="Interests" value={c.reach.interests.join(', ') || 'Broad'} />
            <Row label="Channels" value={c.reach.channels.join(', ') || '—'} />
            <Row label="Promotion length" value={`${c.reach.durationDays} days`} />
            <Txt v="small" color={colors.muted}>Final targeting is confirmed by our reviewers. Ads are labelled as paid promotion and use only the platforms’ standard, privacy-compliant audience tools. We never receive personal data about who saw an ad.</Txt>
            <Txt v="small" color={colors.muted}>Estimated reach depends on ad inventory, prices, targeting and performance. Nothing here is a promise of a fixed audience size.</Txt>
          </Expandable>
          <Expandable icon="shield-checkmark-outline" title="Review, trust & verification" summary="How this campaign was checked">
            <Txt v="small">Before a campaign can be backed, a reviewer checks the story, the listed sources, the ad images and the targeting against our community guidelines.</Txt>
            <Txt v="small" color={colors.muted}>Review confirms a campaign follows our rules. It is <Txt v="small" style={{ fontWeight: '700' }}>not</Txt> independent verification that every claim is true, so please read the sources above. We don’t publish a trust score.</Txt>
            <Txt v="small" color={colors.muted}>Distribution partners: {c.reach.channels.join(', ') || 'to be confirmed during review'}.</Txt>
            <Button small kind="ghost" title="Community guidelines" onPress={() => router.push('/info/community-guidelines')} />
          </Expandable>
        </View>

        {backers.length > 0 && (
          <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
            <Txt v="h2">Recent backers</Txt>
            <Txt v="small" color={colors.muted}>Backers are anonymous by default.</Txt>
            {backers.slice(0, 5).map((b, i) => <Row key={i} label={b.name} value={money(b.amountCents)} />)}
          </View>
        )}

        {live && (
          <View style={{ paddingHorizontal: space.lg }}>
            <Button title={c.status === 'completed' ? 'View final report' : 'View promotion progress'} icon="bar-chart-outline" kind="secondary" onPress={() => router.push(`/report/${c.id}`)} />
          </View>
        )}

        {['funding', 'goal_reached', 'funding_ended', 'distribution_prep', 'promoting', 'completed'].includes(c.status) && <View style={{ paddingHorizontal: space.lg }}><Comments campaignId={c.id} /></View>}

        <View style={{ paddingHorizontal: space.lg }}>
          <Card style={{ gap: space.md }}>
            <Txt v="h3">Quick feedback</Txt>
            {fb.sent ? <Txt v="small" color={colors.success}>Thanks. Your answers help creators improve their visuals and message.</Txt> : (
              <>
                <Txt v="small">Did the visuals make you want to keep reading?</Txt>
                <View style={{ flexDirection: 'row', gap: space.sm }}>{['No', 'Somewhat', 'Yes'].map((o) => <Chip key={o} label={o} selected={fb.visuals === o} onPress={() => setFb({ ...fb, visuals: o })} />)}</View>
                <Txt v="small">Did the message change your mind?</Txt>
                <View style={{ flexDirection: 'row', gap: space.sm }}>{['No', 'Somewhat', 'Yes'].map((o) => <Chip key={o} label={o} selected={fb.persuaded === o} onPress={() => setFb({ ...fb, persuaded: o })} />)}</View>
                <Button small title="Send feedback" disabled={!fb.visuals || !fb.persuaded} onPress={sendFeedback} />
              </>
            )}
          </Card>
        </View>
      </ScrollView>

      <StickyBar>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Txt v="small" style={{ fontWeight: '800' }}>{c.percentFunded}% funded</Txt>
            <Txt v="caption" color={colors.muted}>~{compact(c.estimatedReachAtGoal)} est. reach at goal</Txt>
          </View>
          {data.canBack ? <Button title="Back This Campaign" onPress={() => router.push(`/back/${c.id}`)} style={{ flex: 1.4 }} />
            : <Button title="Share Campaign" icon="share-outline" kind="secondary" onPress={share} style={{ flex: 1.4 }} />}
        </View>
      </StickyBar>
    </View>
  );
}
