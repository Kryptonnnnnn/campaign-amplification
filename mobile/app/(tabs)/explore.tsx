import React, { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, CardSkeleton, Chip, EmptyState, ErrorState, Txt } from '../../src/components/ui';
import { CampaignCard } from '../../src/components/CampaignCard';
import { api, Campaign } from '../../src/lib/api';
import { useAsync } from '../../src/lib/useAsync';
import { colors, radius, space } from '../../src/theme';

const CATS = ['All', 'Environment', 'Health', 'Science', 'Education', 'Public Policy', 'Economic Policy', 'Community', 'Arts & Culture', 'Business', 'Other'];
const SORTS = [['trending', 'Trending'], ['newest', 'Newest'], ['ending', 'Ending soon'], ['funded', 'Most funded']] as const;
const GOALS = [[null, 'Any goal'], [200_000, 'Up to $2,000'], [500_000, 'Up to $5,000']] as const;

export default function Explore() {
  const { width } = useWindowDimensions();
  const featured = useAsync(() => api<{ items: Campaign[] }>('/campaigns/featured'), []);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState<string>('trending');
  const [openOnly, setOpenOnly] = useState(false);
  const [maxGoal, setMaxGoal] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(t); }, [q]);

  const params = new URLSearchParams({ sort });
  if (debounced) params.set('q', debounced);
  if (category !== 'All') params.set('category', category);
  if (openOnly) params.set('open', '1');
  if (maxGoal) params.set('maxGoalCents', String(maxGoal));
  const { data, loading, error, reload, refreshing, refresh } = useAsync(
    () => api<{ items: Campaign[] }>(`/campaigns?${params}`), [params.toString()]);

  const activeFilters = (openOnly ? 1 : 0) + (maxGoal ? 1 : 0) + (sort !== 'trending' ? 1 : 0);
  const clear = () => { setQ(''); setCategory('All'); setSort('trending'); setOpenOnly(false); setMaxGoal(null); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ padding: space.lg, paddingBottom: space.sm, gap: space.md }}>
        <Txt v="h1">Explore</Txt>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: space.md, minHeight: 48 }}>
            <Ionicons name="search" size={20} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search topics, creators, titles" placeholderTextColor="#8A93A1" returnKeyType="search"
              accessibilityLabel="Search campaigns" style={{ flex: 1, fontSize: 16, paddingHorizontal: space.sm, color: colors.text }} />
            {q.length > 0 && <Pressable onPress={() => setQ('')} accessibilityLabel="Clear search" hitSlop={10}><Ionicons name="close-circle" size={20} color={colors.muted} /></Pressable>}
          </View>
          <Pressable onPress={() => setSheet(true)} accessibilityRole="button" accessibilityLabel={`Sort and filter${activeFilters ? `, ${activeFilters} active` : ''}`}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: activeFilters ? colors.ink : colors.surface, borderWidth: 1.5, borderColor: activeFilters ? colors.ink : colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="options" size={22} color={activeFilters ? '#fff' : colors.ink} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {CATS.map((c) => <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />)}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ padding: space.lg, gap: space.lg }}><CardSkeleton /><CardSkeleton /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <FlatList data={data?.items ?? []} keyExtractor={(c) => c.id} onRefresh={refresh} refreshing={refreshing}
          contentContainerStyle={{ padding: space.lg, paddingTop: space.sm, gap: space.lg, flexGrow: 1 }}
          ListHeaderComponent={
            <View style={{ gap: space.md }}>
              {!debounced && category === 'All' && activeFilters === 0 && !!featured.data?.items.length && (
                <View style={{ gap: space.sm }}>
                  <Txt v="h2">Featured</Txt>
                  <FlatList horizontal data={featured.data.items} keyExtractor={(c) => 'f' + c.id} showsHorizontalScrollIndicator={false} snapToInterval={width * 0.72 + space.md} decelerationRate="fast"
                    contentContainerStyle={{ gap: space.md }} renderItem={({ item }) => <View style={{ width: width * 0.72 }}><CampaignCard c={item} compactCard /></View>} />
                  <Txt v="h2" style={{ marginTop: space.sm }}>All campaigns</Txt>
                </View>
              )}
              <Txt v="small" color={colors.muted}>{data?.items.length ?? 0} {data?.items.length === 1 ? 'campaign' : 'campaigns'}{debounced ? ` for “${debounced}”` : ''}</Txt>
            </View>}
          ListEmptyComponent={<EmptyState icon="search-outline" title="No campaigns found" body="Try a different search, category or filter to see more campaigns." action="Clear search and filters" onAction={clear} />}
          renderItem={({ item }) => <CampaignCard c={item} />} />
      )}

      <Modal visible={sheet} animationType="slide" transparent onRequestClose={() => setSheet(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(20,33,61,0.4)' }} onPress={() => setSheet(false)} accessibilityLabel="Close filters" />
        <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.xl, gap: space.lg }}>
          <Txt v="h1">Sort & filter</Txt>
          <Txt v="small" color={colors.muted} style={{ fontWeight: '700' }}>Sort by</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {SORTS.map(([k, label]) => <Chip key={k} label={label} selected={sort === k} onPress={() => setSort(k)} />)}
          </View>
          <Txt v="small" color={colors.muted} style={{ fontWeight: '700' }}>Status</Txt>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Chip label="All campaigns" selected={!openOnly} onPress={() => setOpenOnly(false)} />
            <Chip label="Open for backing" selected={openOnly} onPress={() => setOpenOnly(true)} />
          </View>
          <Txt v="small" color={colors.muted} style={{ fontWeight: '700' }}>Funding goal</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {GOALS.map(([v, label]) => <Chip key={label} label={label} selected={maxGoal === v} onPress={() => setMaxGoal(v)} />)}
          </View>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Button title="Reset" kind="secondary" onPress={() => { setSort('trending'); setOpenOnly(false); setMaxGoal(null); }} style={{ flex: 1 }} />
            <Button title="Show results" onPress={() => setSheet(false)} style={{ flex: 2 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
