import React, { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthGate } from '../../src/components/AuthGate';
import { CampaignCard } from '../../src/components/CampaignCard';
import { Button, CardSkeleton, EmptyState, ErrorState, Skeleton, Txt } from '../../src/components/ui';
import { api, Campaign } from '../../src/lib/api';
import { useAsync } from '../../src/lib/useAsync';
import { useAuth } from '../../src/store/auth';
import { timeAgo } from '../../src/lib/format';
import { colors, radius, space } from '../../src/theme';

type N = { id: string; kind: string; title: string; body: string; campaignId: string | null; read: boolean; createdAt: string };
type IconName = React.ComponentProps<typeof Ionicons>['name'];
const KIND: Record<string, { icon: IconName; color: string; bg: string }> = {
  review: { icon: 'shield-checkmark', color: colors.info, bg: colors.infoSoft },
  funding: { icon: 'trending-up', color: colors.primary, bg: colors.primarySoft },
  contribution: { icon: 'card', color: colors.success, bg: colors.successSoft },
  promotion: { icon: 'megaphone', color: colors.warning, bg: colors.warningSoft },
  updates: { icon: 'chatbubble-ellipses', color: colors.info, bg: colors.infoSoft },
  security: { icon: 'lock-closed', color: colors.danger, bg: colors.dangerSoft },
};

function Body() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'all' | 'following'>('all');
  const notes = useAsync(() => api<{ unread: number; items: N[] }>('/me/notifications'), [user?.id]);
  const saved = useAsync(() => api<{ following: Campaign[] }>('/me/saved'), [user?.id]);

  const open = async (n: N) => {
    if (!n.read) { api('/me/notifications/read', { method: 'POST', body: { ids: [n.id] } }).catch(() => {}); }
    if (n.campaignId) router.push(n.kind === 'review' ? `/manage/${n.campaignId}` : `/campaign/${n.campaignId}`);
    notes.reload();
  };
  const readAll = async () => { await api('/me/notifications/read', { method: 'POST', body: {} }); notes.reload(); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ padding: space.lg, gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Txt v="h1">Activity</Txt>
          {tab === 'all' && !!notes.data?.unread && <Button small kind="ghost" title="Mark all read" onPress={readAll} />}
        </View>
        <View style={{ flexDirection: 'row', backgroundColor: '#EDEBE4', borderRadius: radius.pill, padding: 4 }}>
          {([['all', `Notifications${notes.data?.unread ? ` (${notes.data.unread})` : ''}`], ['following', 'Following']] as const).map(([k, label]) => (
            <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}
              style={{ flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === k ? colors.surface : 'transparent' }}>
              <Txt v="small" style={{ fontWeight: '700' }} color={tab === k ? colors.ink : colors.muted}>{label}</Txt>
            </Pressable>
          ))}
        </View>
      </View>

      {tab === 'all' ? (
        notes.loading ? <View style={{ padding: space.lg, gap: space.md }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={72} r={radius.md} />)}</View>
        : notes.error ? <ErrorState message={notes.error} onRetry={notes.reload} />
        : (
          <FlatList data={notes.data!.items} keyExtractor={(n) => n.id} onRefresh={notes.refresh} refreshing={notes.refreshing}
            contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.sm, flexGrow: 1 }}
            ListEmptyComponent={<EmptyState icon="notifications-off-outline" title="You’re all caught up" body="Funding milestones, review decisions and campaign updates will show up here." action="Explore campaigns" onAction={() => router.push('/explore')} />}
            renderItem={({ item: n }) => {
              const k = KIND[n.kind] ?? KIND.updates;
              return (
                <Pressable onPress={() => open(n)} accessibilityRole="button" accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}. ${n.body}`}
                  style={{ flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: n.read ? colors.surface : colors.primarySoft, borderWidth: 1, borderColor: n.read ? colors.border : colors.primarySoft }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: k.bg, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={k.icon} size={20} color={k.color} /></View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <Txt v="small" style={{ fontWeight: n.read ? '600' : '800', flex: 1 }}>{n.title}</Txt>
                      <Txt v="caption" color={colors.muted}>{timeAgo(n.createdAt)}</Txt>
                    </View>
                    <Txt v="small" color={colors.muted} numberOfLines={3}>{n.body}</Txt>
                  </View>
                  {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 }} />}
                </Pressable>
              );
            }} />
        )
      ) : (
        saved.loading ? <View style={{ padding: space.lg }}><CardSkeleton /></View>
        : saved.error ? <ErrorState message={saved.error} onRetry={saved.reload} />
        : (
          <FlatList data={saved.data!.following} keyExtractor={(c) => c.id} contentContainerStyle={{ padding: space.lg, gap: space.lg, flexGrow: 1 }}
            ListEmptyComponent={<EmptyState icon="heart-outline" title="Not following anything yet" body="Follow a campaign to see its funding progress and updates here." action="Explore campaigns" onAction={() => router.push('/explore')} />}
            renderItem={({ item }) => <CampaignCard c={item} compactCard />} />
        )
      )}
    </SafeAreaView>
  );
}

export default function Activity() {
  return (
    <AuthGate icon="notifications-outline" title="Stay in the loop" body="Sign in to get funding milestones, review decisions and updates on campaigns you follow.">
      <Body />
    </AuthGate>
  );
}
