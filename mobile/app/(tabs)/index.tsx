import React from 'react';
import { RefreshControl, ScrollView, View, FlatList, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, CardSkeleton, ErrorState, Notice, SectionTitle, Txt } from '../../src/components/ui';
import { CampaignCard } from '../../src/components/CampaignCard';
import { api, Campaign, Meta } from '../../src/lib/api';
import { useAsync } from '../../src/lib/useAsync';
import { colors, radius, space } from '../../src/theme';

const STEPS = [
  { icon: 'create-outline', title: 'Create', body: 'Creators write a clear story, add sources and ad visuals, and choose who it should reach.' },
  { icon: 'shield-checkmark-outline', title: 'Review', body: 'Our reviewers check the content, sources and targeting before anything goes live.' },
  { icon: 'megaphone-outline', title: 'Amplify', body: 'Backers pool money toward ad costs so the message reaches people beyond the creator’s network.' },
] as const;

export default function Home() {
  const { width } = useWindowDimensions();
  const meta = useAsync(() => api<Meta>('/meta'), [], { refetchOnFocus: false });
  const feed = useAsync(() => api<{ items: Campaign[] }>('/campaigns?sort=trending'), []);
  const featured = feed.data?.items.filter((c) => c.status === 'funding').slice(0, 4) ?? [];
  const perDollar = meta.data?.perDollarReach;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: space.xxl }}
        refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} />}>
        {/* Hero */}
        <View style={{ backgroundColor: colors.ink, borderRadius: radius.xl, padding: space.xl, gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="megaphone" size={18} color={colors.accent} />
            <Txt v="caption" color={colors.accent} style={{ letterSpacing: 1, fontWeight: '800', flexShrink: 0, paddingRight: 6 }}>AMPLIFY</Txt>
          </View>
          <Txt v="display" color="#fff">Help important messages travel further.</Txt>
          <Txt color="#D5DAE5">Creators share a message. Backers chip in toward the cost of promoting it to people beyond the creator’s own followers.</Txt>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.md, padding: space.md }}>
            <Txt v="small" color="#fff" style={{ fontWeight: '700' }}>
              {perDollar ? `Roughly ${perDollar} people reached per $1 (estimate)` : 'Estimated reach per dollar loading…'}
            </Txt>
            <Txt v="caption" color="#B8C0D0">Based on demo assumptions for ad prices. Not a guarantee. Real delivery varies.</Txt>
          </View>
          <View style={{ gap: space.sm, marginTop: space.xs }}>
            <Button title="Explore Campaigns" kind="accent" onPress={() => router.push('/explore')} />
            <Button title="Start a Campaign" kind="outlineLight" onPress={() => router.push('/create')} />
          </View>
        </View>

        {/* Featured */}
        <View style={{ gap: space.md }}>
          <SectionTitle title="Featured campaigns" action="See all" onAction={() => router.push('/explore')} />
          {feed.loading ? <CardSkeleton /> : feed.error ? <ErrorState message={feed.error} onRetry={feed.reload} /> : (
            <FlatList horizontal data={featured} keyExtractor={(c) => c.id} showsHorizontalScrollIndicator={false}
              snapToInterval={width * 0.82 + space.md} decelerationRate="fast" contentContainerStyle={{ gap: space.md }}
              renderItem={({ item }) => <View style={{ width: width * 0.82 }}><CampaignCard c={item} compactCard /></View>} />
          )}
        </View>

        {/* How it works */}
        <View style={{ gap: space.md }}>
          <SectionTitle title="How it works" action="Learn more" onAction={() => router.push('/info/how-it-works')} />
          <Card style={{ gap: space.lg }}>
            {STEPS.map((st, i) => (
              <View key={st.title} style={{ flexDirection: 'row', gap: space.md }}>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={st.icon} size={20} color={colors.primary} />
                  </View>
                  {i < STEPS.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4 }} />}
                </View>
                <View style={{ flex: 1, paddingBottom: i < STEPS.length - 1 ? space.sm : 0 }}>
                  <Txt v="h3">{i + 1}. {st.title}</Txt>
                  <Txt v="small" color={colors.muted}>{st.body}</Txt>
                </View>
              </View>
            ))}
          </Card>
          <Notice tone="warning" icon="information-circle" title="This is not a donation">
            Your contribution pays for advertising that spreads the message. It does not go to the person, cause or organization in the message.
          </Notice>
        </View>

        {/* Feed */}
        <View style={{ gap: space.md }}>
          <SectionTitle title="Campaign feed" />
          {feed.loading ? [0, 1].map((i) => <CardSkeleton key={i} />) : (feed.data?.items ?? []).map((c) => <CampaignCard key={c.id} c={c} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
