import React from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Notice, Txt } from '../../src/components/ui';
import { Timeline } from '../../src/components/Timeline';
import { colors, space } from '../../src/theme';

export default function Submitted() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: space.xl, paddingTop: 48, gap: space.lg, paddingBottom: 56 }}>
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="paper-plane" size={44} color={colors.success} /></View>
        <Txt v="h1" center>Submitted for review</Txt>
        <Txt color={colors.muted} center>Thanks. Your campaign is locked while a reviewer checks it. We’ll notify you in Activity as soon as there’s news.</Txt>
      </View>
      <Card><Txt v="h2" style={{ marginBottom: space.md }}>What happens next</Txt><Timeline status="submitted" /></Card>
      <Notice tone="info">If changes are needed, you’ll get specific notes and can edit and resubmit. Nothing goes live or is advertised until approval.</Notice>
      <Button title="View campaign status" onPress={() => router.replace(`/manage/${id}`)} />
      <Button title="Go to Activity" kind="ghost" onPress={() => router.replace('/activity')} />
    </ScrollView>
  );
}
