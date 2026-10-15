import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card, Notice, ProgressBar, SectionTitle, Txt } from '../../src/components/ui';
import { api, Campaign } from '../../src/lib/api';
import { useAsync } from '../../src/lib/useAsync';
import { useAuth } from '../../src/store/auth';
import { useToast } from '../../src/store/toast';
import { STATUS_LABEL, STATUS_TONE, timeAgo } from '../../src/lib/format';
import { colors, radius, space } from '../../src/theme';

const STEP_NAMES = ['Basics', 'Story', 'Visuals', 'Reach', 'Submit'];

export default function Create() {
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const mine = useAsync(async () => (user ? api<{ items: Campaign[] }>('/me/campaigns') : { items: [] }), [user?.id]);
  const drafts = (mine.data?.items ?? []).filter((c) => c.status === 'draft' || c.status === 'changes_requested');

  const start = async (voice = false) => {
    if (!user) return router.push('/auth');
    if (voice) return router.push('/voice');
    setBusy(true);
    try { const { campaign } = await api<{ campaign: Campaign }>('/campaigns', { method: 'POST' }); router.push(`/draft/${campaign.id}/basics`); }
    catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const remove = (c: Campaign) => Alert.alert('Delete this draft?', `“${c.title || 'Untitled campaign'}” will be permanently deleted.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await api(`/campaigns/${c.id}`, { method: 'DELETE' }); toast('Draft deleted', 'info'); mine.reload(); } catch (e: any) { toast(e.message, 'error'); } } },
  ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: space.xxl }}>
        <View style={{ gap: 4 }}>
          <Txt v="h1">Start a campaign</Txt>
          <Txt color={colors.muted}>Five short steps: Basics, Story, Visuals, Reach, Submit. Your work saves automatically.</Txt>
        </View>

        <View style={{ gap: space.md }}>
          <Card onPress={() => start(false)} accessibilityLabel="Create manually" style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="create-outline" size={26} color={colors.primary} /></View>
            <View style={{ flex: 1 }}><Txt v="h3">Create manually</Txt><Txt v="small" color={colors.muted}>A guided form with tips and a full preview before you submit.</Txt></View>
            <Ionicons name="chevron-forward" size={22} color={colors.muted} />
          </Card>
          <Card onPress={() => start(true)} accessibilityLabel="Create with your voice" style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="mic-outline" size={26} color={colors.warning} /></View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Txt v="h3">Create with your voice</Txt><Badge label="Beta" tone="warning" /></View>
              <Txt v="small" color={colors.muted}>Answer a few questions aloud. We turn them into an editable draft.</Txt>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.muted} />
          </Card>
          {busy && <Txt v="small" color={colors.muted} center>Creating your draft…</Txt>}
          {!user && <Notice tone="info">You’ll be asked to sign in so we can save your draft. Browsing and backing don’t need an account.</Notice>}
        </View>

        {user && (
          <View style={{ gap: space.md }}>
            <SectionTitle title="Your drafts" action="All my campaigns" onAction={() => router.push('/my-campaigns')} />
            {mine.loading ? <Txt color={colors.muted}>Loading…</Txt> : drafts.length === 0 ? (
              <Card><Txt v="small" color={colors.muted}>No drafts yet. Start one above and it will appear here so you can pick up where you left off.</Txt></Card>
            ) : drafts.map((c) => (
              <Card key={c.id} style={{ gap: space.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Badge label={STATUS_LABEL[c.status]} tone={STATUS_TONE[c.status]} />
                  <Txt v="caption" color={colors.muted}>Edited {timeAgo(c.updatedAt)}</Txt>
                </View>
                <Txt v="h3" numberOfLines={2}>{c.title || 'Untitled campaign'}</Txt>
                <ProgressBar percent={(Math.min(c.step, 5) / 5) * 100} height={6} />
                <Txt v="caption" color={colors.muted}>Step {Math.min(c.step, 5)} of 5: {STEP_NAMES[Math.min(c.step, 5) - 1]}</Txt>
                {c.status === 'changes_requested' && c.reviewerNote && <Notice tone="warning" title="Reviewer feedback">{c.reviewerNote}</Notice>}
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Button small title="Resume" onPress={() => router.push(`/draft/${c.id}`)} style={{ flex: 1 }} />
                  {c.status === 'draft' && <Button small kind="danger" title="Delete" onPress={() => remove(c)} />}
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
