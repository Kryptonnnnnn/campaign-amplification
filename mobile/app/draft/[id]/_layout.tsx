import React from 'react';
import { Pressable, View } from 'react-native';
import { router, Stack, useLocalSearchParams, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState, IconButton, Skeleton, Txt } from '../../../src/components/ui';
import { api, Campaign } from '../../../src/lib/api';
import { useAsync } from '../../../src/lib/useAsync';
import { DraftProvider, STEPS, STEP_TITLES, useDraft, SaveState } from '../../../src/draft/DraftContext';
import { colors, radius, space } from '../../../src/theme';

const SAVE_LABEL: Record<SaveState, { text: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  saved: { text: 'Draft saved', icon: 'checkmark-circle', color: colors.success },
  dirty: { text: 'Unsaved changes…', icon: 'ellipse-outline', color: colors.muted },
  saving: { text: 'Saving…', icon: 'sync', color: colors.muted },
  error: { text: 'Couldn’t save. Tap to retry', icon: 'alert-circle', color: colors.danger },
};

function Chrome() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { draft, saveState, flush } = useDraft();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const last = segments[segments.length - 1];
  const current = STEPS.indexOf(last as (typeof STEPS)[number]);
  const isPreview = last === 'preview';
  const reached = Math.max(0, draft.step - 1);
  const save = SAVE_LABEL[saveState];

  const close = async () => { await flush(); router.replace('/create'); };
  const go = async (i: number) => { if (i === current || i > reached) return; await flush(); router.replace(`/draft/${id}/${STEPS[i]}`); };

  return (
    <View style={{ backgroundColor: colors.bg, paddingTop: insets.top + space.xs, paddingHorizontal: space.md, paddingBottom: space.sm, gap: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon="close" label="Save and close" onPress={close} />
        <View style={{ alignItems: 'center' }}>
          <Txt v="small" style={{ fontWeight: '700' }}>{isPreview ? 'Preview' : `Step ${current + 1} of 5: ${STEP_TITLES[Math.max(current, 0)]}`}</Txt>
          <Pressable onPress={saveState === 'error' ? flush : undefined} accessibilityRole={saveState === 'error' ? 'button' : 'text'} style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <Ionicons name={save.icon} size={12} color={save.color} /><Txt v="caption" color={save.color}>{save.text}</Txt>
          </Pressable>
        </View>
        <View style={{ width: 44 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {STEP_TITLES.map((t, i) => {
          const done = i < current || (isPreview && i < 5);
          const active = i === current;
          return (
            <Pressable key={t} onPress={() => go(i)} accessibilityRole="button" accessibilityLabel={`${t}${active ? ', current step' : done ? ', completed' : ''}`} style={{ flex: 1, gap: 4, minHeight: 36, justifyContent: 'center' }}>
              <View style={{ height: 5, borderRadius: radius.pill, backgroundColor: active ? colors.primary : done || i <= reached ? colors.primary + '88' : colors.border }} />
              <Txt v="caption" color={active ? colors.primary : colors.muted} style={{ fontWeight: active ? '800' : '500' }} numberOfLines={1}>{i + 1}. {t}</Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function DraftLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useAsync(() => api<{ campaign: Campaign }>(`/campaigns/${id}`), [id], { refetchOnFocus: false });

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bg, padding: space.lg, paddingTop: 80, gap: space.md }}><Skeleton h={40} /><Skeleton h={56} /><Skeleton h={56} /><Skeleton h={120} /></View>;
  if (error || !data) return <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 80 }}><ErrorState message={error ?? 'Draft not found'} onRetry={reload} /></View>;

  return (
    <DraftProvider initial={data.campaign}>
      <Chrome />
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.bg } }} />
    </DraftProvider>
  );
}
