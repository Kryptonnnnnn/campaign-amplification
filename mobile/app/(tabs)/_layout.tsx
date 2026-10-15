import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/theme';

type Icon = React.ComponentProps<typeof Ionicons>['name'];
const TABS: { name: string; title: string; on: Icon; off: Icon }[] = [
  { name: 'index', title: 'Home', on: 'home', off: 'home-outline' },
  { name: 'explore', title: 'Explore', on: 'search', off: 'search-outline' },
  { name: 'create', title: 'Create', on: 'add-circle', off: 'add-circle-outline' },
  { name: 'activity', title: 'Activity', on: 'notifications', off: 'notifications-outline' },
  { name: 'profile', title: 'Profile', on: 'person', off: 'person-outline' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{
      headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted,
      tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 58 + insets.bottom, paddingTop: 6 },
    }}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{
          title: t.title,
          tabBarAccessibilityLabel: t.title,
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? t.on : t.off} size={t.name === 'create' ? 30 : 24} color={color} />,
        }} />
      ))}
    </Tabs>
  );
}
