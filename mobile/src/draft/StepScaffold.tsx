import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Notice, StickyBar, Txt } from '../components/ui';
import { STEPS, useDraft, validateStep } from './DraftContext';
import { useToast } from '../store/toast';
import { colors, space } from '../theme';

/** Shared frame for steps 1-4: scrolling body plus Back / Save as Draft / Continue. */
export function StepScaffold({ index, title, intro, children }: { index: number; title: string; intro: string; children: React.ReactNode }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { draft, patch, flush, setErrors, errors, goalText } = useDraft();
  const toast = useToast();
  const scroller = React.useRef<ScrollView>(null);

  const saveDraft = async () => { const ok = await flush(); toast(ok ? 'Draft saved. Resume anytime from Create' : 'Couldn’t save. Check your connection', ok ? 'success' : 'error'); };

  const next = async () => {
    const e = validateStep(draft, index, goalText);
    setErrors(e);
    const n = Object.keys(e).length;
    if (n) { toast(`Fix ${n} ${n === 1 ? 'thing' : 'things'} to continue`, 'error'); scroller.current?.scrollTo({ y: 0, animated: true }); return; }
    patch({ step: Math.max(draft.step, index + 2) });
    const ok = await flush();
    if (!ok) return toast('Couldn’t save. Check your connection', 'error');
    router.replace(`/draft/${id}/${STEPS[index + 1]}`);
  };
  const back = async () => { await flush(); if (index === 0) router.replace('/create'); else router.replace(`/draft/${id}/${STEPS[index - 1]}`); };
  const errCount = Object.keys(errors).length;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }}>
        <View style={{ gap: 4 }}>
          <Txt v="h1">{title}</Txt>
          <Txt color={colors.muted}>{intro}</Txt>
        </View>
        {errCount > 0 && <Notice tone="danger" title="A few things need attention">Check the highlighted fields below.</Notice>}
        {children}
      </ScrollView>
      <StickyBar>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button title="Back" kind="ghost" onPress={back} style={{ flex: 1, paddingHorizontal: space.sm }} />
          <Button title="Save draft" kind="secondary" onPress={saveDraft} style={{ flex: 1.3, paddingHorizontal: space.sm }} />
          <Button title="Continue" onPress={next} style={{ flex: 1.3, paddingHorizontal: space.sm }} />
        </View>
      </StickyBar>
    </KeyboardAvoidingView>
  );
}
