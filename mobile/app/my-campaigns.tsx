import React, { useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { CoverImage } from '../src/components/CoverImage';
import { AuthGate } from '../src/components/AuthGate';
import { Badge, Card, Chip, EmptyState, ErrorState, Header, ProgressBar, Skeleton, Txt } from '../src/components/ui';
import { api, Campaign, imageUrl } from '../src/lib/api';
import { useAsync } from '../src/lib/useAsync';
import { compact, dateShort, money, STATUS_LABEL, STATUS_TONE } from '../src/lib/format';
import { colors, space } from '../src/theme';

const TABS: { key: string; label: string; statuses: string[] }[] = [
  { key: 'all', label: 'All', statuses: [] },
  { key: 'draft', label: 'Drafts', statuses: ['draft'] },
  { key: 'review', label: 'Under review', statuses: ['submitted'] },
  { key: 'funding', label: 'Published / Funding', statuses: ['funding', 'goal_reached'] },
  { key: 'promoting', label: 'Promoting', statuses: ['distribution_prep', 'promoting'] },
  { key: 'done', label: 'Completed', statuses: ['completed'] },
  { key: 'action', label: 'Requires action', statuses: ['changes_requested', 'funding_ended', 'rejected', 'failed', 'refund_pending'] },
];

function Body() {
  const [tab, setTab] = useState('all');
  const { data, loading, error, reload, refresh, refreshing } = useAsync(() => api<{ items: Campaign[] }>('/me/campaigns'), []);
  const items = (data?.items ?? []).filter((c) => tab === 'all' || TABS.find((t) => t.key === tab)!.statuses.includes(c.status));
  const count = (k: string) => (data?.items ?? []).filter((c) => k === 'all' || TABS.find((t) => t.key === k)!.statuses.includes(c.status)).length;
  const totalRaised = (data?.items ?? []).reduce((a, c) => a + c.raisedCents, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="My campaigns" />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm }}>
          {TABS.map((t) => <Chip key={t.key} label={`${t.label}${data ? ` · ${count(t.key)}` : ''}`} selected={tab === t.key} onPress={() => setTab(t.key)} />)}
        </ScrollView>
      </View>
      {loading ? <View style={{ padding: space.lg, gap: space.md }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={110} r={18} />)}</View>
        : error ? <ErrorState message={error} onRetry={reload} />
        : (
          <FlatList data={items} keyExtractor={(c) => c.id} onRefresh={refresh} refreshing={refreshing} contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
            ListHeaderComponent={totalRaised > 0 ? <Txt v="small" color={colors.muted}>{money(totalRaised)} raised across your campaigns</Txt> : null}
            ListEmptyComponent={<EmptyState icon="megaphone-outline" title={tab === 'all' ? 'No campaigns yet' : 'Nothing here'} body={tab === 'all' ? 'Start your first campaign. It takes five short steps.' : 'No campaigns in this state right now.'} action={tab === 'all' ? 'Start a campaign' : undefined} onAction={() => router.push('/create')} />}
            renderItem={({ item: c }) => (
              <Card onPress={() => router.push(`/manage/${c.id}`)} accessibilityLabel={`${c.title || 'Untitled'}, ${STATUS_LABEL[c.status]}`} style={{ gap: space.md }}>
                <View style={{ flexDirection: 'row', gap: space.md }}>
                  <CoverImage uri={c.coverImage} rounded={12} style={{ width: 72, height: 72 }} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Badge label={STATUS_LABEL[c.status]} tone={STATUS_TONE[c.status]} />
                    <Txt v="h3" numberOfLines={2}>{c.title || 'Untitled campaign'}</Txt>
                  </View>
                </View>
                {c.goalCents ? (<>
                  <ProgressBar percent={c.percentFunded} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Txt v="small" style={{ fontWeight: '700' }}>{money(c.raisedCents)} <Txt v="small" color={colors.muted}>of {money(c.goalCents)}</Txt></Txt>
                    <Txt v="small" color={colors.muted}>{c.status === 'funding' && c.deadline ? `Ends ${dateShort(c.deadline)}` : `${c.percentFunded}%`}</Txt>
                  </View>
                  <Txt v="caption" color={colors.muted}>Est. reach at goal ~{compact(c.estimatedReachAtGoal)} (estimate)</Txt>
                </>) : <Txt v="small" color={colors.muted}>Goal not set yet. You’ll set it in step 5.</Txt>}
                {c.status === 'changes_requested' && <Badge label="Reviewer asked for changes" tone="warning" icon="alert-circle" />}
              </Card>
            )} />
        )}
    </View>
  );
}

export default function MyCampaigns() {
  return <AuthGate icon="megaphone-outline" title="Your campaigns" body="Sign in to see drafts, review status and reports for campaigns you create."><Body /></AuthGate>;
}
