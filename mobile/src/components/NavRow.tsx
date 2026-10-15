import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Txt } from './ui';
import { colors, space } from '../theme';

export function NavRow({ icon, label, detail, onPress, last }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; detail?: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingHorizontal: space.lg, backgroundColor: pressed ? '#F1EFE8' : colors.surface, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border })}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <View style={{ flex: 1 }}><Txt style={{ fontWeight: '600' }}>{label}</Txt>{detail && <Txt v="caption" color={colors.muted}>{detail}</Txt>}</View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

export function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      {title && <Txt v="caption" color={colors.muted} style={{ fontWeight: '800', letterSpacing: 0.8, paddingHorizontal: 4 }}>{title.toUpperCase()}</Txt>}
      <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>{children}</View>
    </View>
  );
}
