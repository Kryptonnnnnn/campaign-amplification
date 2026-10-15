import React from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card, Txt } from '../../src/components/ui';
import { Group, NavRow } from '../../src/components/NavRow';
import { useAuth } from '../../src/store/auth';
import { useToast } from '../../src/store/toast';
import { colors, space } from '../../src/theme';

export default function Profile() {
  const { user, signOut } = useAuth();
  const toast = useToast();
  const go = (p: string) => () => router.push(p as never);
  const needAuth = (p: string) => () => (user ? router.push(p as never) : router.push('/auth'));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: space.xxl }}>
        <Txt v="h1">Profile</Txt>
        {user ? (
          <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Txt v="h1" color="#fff">{user.name.slice(0, 1).toUpperCase()}</Txt></View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="h3">{user.name}</Txt><Txt v="small" color={colors.muted}>{user.email}</Txt>
              {user.role === 'admin' && <Badge label="Reviewer" tone="info" icon="shield-checkmark" />}
            </View>
          </Card>
        ) : (
          <Card style={{ gap: space.md }}>
            <Txt v="h3">You’re browsing as a guest</Txt>
            <Txt v="small" color={colors.muted}>Create an account to start campaigns, track what you back and get updates. One account works as audience, creator and backer.</Txt>
            <Button title="Sign in or create account" onPress={() => router.push('/auth')} />
          </Card>
        )}

        <Group title="My activity">
          <NavRow icon="megaphone-outline" label="Created campaigns" detail="Dashboard, drafts and reports" onPress={needAuth('/my-campaigns')} />
          <NavRow icon="heart-outline" label="Backed campaigns" detail="Track what you’ve helped promote" onPress={needAuth('/backed')} />
          <NavRow icon="bookmark-outline" label="Saved campaigns" onPress={needAuth('/saved')} />
          <NavRow icon="receipt-outline" label="Payment history" detail="Receipts and statuses" onPress={needAuth('/payments')} last />
        </Group>

        <Group title="Account">
          <NavRow icon="settings-outline" label="Account settings" detail="Name, notifications, connection" onPress={needAuth('/settings')} />
          <NavRow icon="help-circle-outline" label="Help" onPress={go('/info/help')} last />
        </Group>

        <Group title="About Amplify">
          <NavRow icon="compass-outline" label="How it works" onPress={go('/info/how-it-works')} />
          <NavRow icon="information-circle-outline" label="About" onPress={go('/info/about')} />
          <NavRow icon="business-outline" label="Partners" onPress={go('/info/partners')} />
          <NavRow icon="chatbubbles-outline" label="FAQs" onPress={go('/info/faqs')} />
          <NavRow icon="mail-outline" label="Contact" onPress={go('/info/contact')} last />
        </Group>

        <Group title="Legal & community">
          <NavRow icon="document-text-outline" label="Terms" onPress={go('/info/terms')} />
          <NavRow icon="lock-closed-outline" label="Privacy" onPress={go('/info/privacy')} />
          <NavRow icon="people-outline" label="Community guidelines" onPress={go('/info/community-guidelines')} last />
        </Group>

        {user && <Button title="Sign out" kind="danger" onPress={() => Alert.alert('Sign out?', 'You can sign back in anytime.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: async () => { await signOut(); toast('Signed out', 'info'); } }])} />}
        <Txt v="caption" color={colors.muted} center>Amplify prototype · demo data only</Txt>
      </ScrollView>
    </SafeAreaView>
  );
}
