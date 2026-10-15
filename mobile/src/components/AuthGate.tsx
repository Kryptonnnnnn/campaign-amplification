import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, EmptyState, Skeleton } from './ui';
import { useAuth } from '../store/auth';
import { colors, space } from '../theme';

/** Shows children for signed-in users; otherwise a friendly sign-in prompt (browsing never needs an account). */
export function AuthGate({ icon, title, body, children }: { icon: React.ComponentProps<typeof EmptyState>['icon']; title: string; body: string; children: React.ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <View style={{ padding: space.lg, gap: space.md }}><Skeleton h={60} /><Skeleton h={120} /></View>;
  if (!user) return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
      <EmptyState icon={icon} title={title} body={body} />
      <View style={{ paddingHorizontal: space.xl, gap: space.sm }}>
        <Button title="Sign in or create an account" onPress={() => router.push('/auth')} />
      </View>
    </View>
  );
  return <>{children}</>;
}
