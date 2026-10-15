import React from 'react';
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { AuthGate } from '../src/components/AuthGate';
import { CampaignCard } from '../src/components/CampaignCard';
import { CardSkeleton, EmptyState, ErrorState, Header } from '../src/components/ui';
import { api, Campaign } from '../src/lib/api';
import { useAsync } from '../src/lib/useAsync';
import { colors, space } from '../src/theme';

function Body() {
  const { data, loading, error, reload, refresh, refreshing } = useAsync(() => api<{ saved: Campaign[] }>('/me/saved'), []);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Saved campaigns" />
      {loading ? <View style={{ padding: space.lg }}><CardSkeleton /></View> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <FlatList data={data!.saved} keyExtractor={(c) => c.id} onRefresh={refresh} refreshing={refreshing} contentContainerStyle={{ padding: space.lg, gap: space.lg, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState icon="bookmark-outline" title="Nothing saved yet" body="Tap Save on any campaign to keep it here for later." action="Explore campaigns" onAction={() => router.push('/explore')} />}
          renderItem={({ item }) => <CampaignCard c={item} />} />
      )}
    </View>
  );
}
export default function Saved() { return <AuthGate icon="bookmark-outline" title="Saved campaigns" body="Sign in to save campaigns and find them here."><Body /></AuthGate>; }
