import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, LayoutAnimation, Platform, Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, UIManager, View, ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, MIN_TOUCH, radius, shadow, space, type } from '../theme';
import type { Tone } from '../lib/format';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);
type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ---------- Text ----------
type TxtProps = React.ComponentProps<typeof Text> & { v?: keyof typeof type; color?: string; center?: boolean };
export function Txt({ v = 'body', color = colors.text, center, style, ...p }: TxtProps) {
  return <Text {...p} style={[type[v], { color }, center && { textAlign: 'center' }, style]} />;
}

// ---------- Button ----------
type BtnProps = {
  title: string; onPress?: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'outlineLight';
  icon?: IconName; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean; hint?: string;
};
export function Button({ title, onPress, kind = 'primary', icon, loading, disabled, style, small, hint }: BtnProps) {
  const palette = {
    primary: { bg: colors.primary, fg: '#fff', border: colors.primary },
    accent: { bg: colors.accent, fg: colors.ink, border: colors.accent },
    secondary: { bg: colors.surface, fg: colors.primary, border: colors.primary },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.surface, fg: colors.danger, border: colors.danger },
    outlineLight: { bg: 'transparent', fg: '#fff', border: '#fff' },
  }[kind];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={title} accessibilityHint={hint} accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        s.btn, small && { minHeight: 40, paddingHorizontal: space.md },
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: off ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }, style,
      ]}>
      {loading ? <ActivityIndicator color={palette.fg} /> : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 18} color={palette.fg} />}
          <Text style={{ color: palette.fg, fontSize: small ? 14 : 16, fontWeight: '700' }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, color = colors.ink, bg }: { icon: IconName; onPress: () => void; label: string; color?: string; bg?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4}
      style={({ pressed }) => [s.iconBtn, bg ? { backgroundColor: bg } : null, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={24} color={color} />
    </Pressable>
  );
}

// ---------- Badges & chips ----------
const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: '#EDEBE4', fg: colors.muted }, primary: { bg: colors.primarySoft, fg: colors.primaryDark },
  success: { bg: colors.successSoft, fg: colors.success }, warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger }, info: { bg: colors.infoSoft, fg: colors.info },
};
export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const t = TONES[tone];
  return (
    <View style={[s.badge, { backgroundColor: t.bg }]}>
      {icon && <Ionicons name={icon} size={12} color={t.fg} />}
      <Text style={{ color: t.fg, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} accessibilityLabel={label} onPress={onPress}
      style={[s.chip, selected && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
      {icon && <Ionicons name={icon} size={14} color={selected ? '#fff' : colors.muted} />}
      <Text style={{ color: selected ? '#fff' : colors.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

// ---------- Progress ----------
export function ProgressBar({ percent, height = 8, tone = colors.primary }: { percent: number; height?: number; tone?: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(anim, { toValue: Math.min(100, Math.max(0, percent)), duration: 600, useNativeDriver: false }).start(); }, [percent, anim]);
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
      style={{ height, backgroundColor: '#E8E5DC', borderRadius: radius.pill, overflow: 'hidden' }}>
      <Animated.View style={{ height, backgroundColor: tone, borderRadius: radius.pill, width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

// ---------- Cards & layout ----------
export function Card({ children, style, onPress, accessibilityLabel }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  const base = [s.card, shadow as ViewStyle, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [...base, pressed && { opacity: 0.92 }]}>{children}</Pressable>;
}

export function Notice({ tone = 'info', title, children, icon }: { tone?: Tone; title?: string; children: React.ReactNode; icon?: IconName }) {
  const t = TONES[tone];
  return (
    <View style={[s.notice, { backgroundColor: t.bg }]} accessibilityRole="alert">
      <Ionicons name={icon ?? (tone === 'danger' ? 'alert-circle' : tone === 'warning' ? 'warning' : 'information-circle')} size={20} color={t.fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        {title && <Txt v="small" color={t.fg} style={{ fontWeight: '700' }}>{title}</Txt>}
        <Txt v="small" color={colors.text}>{children}</Txt>
      </View>
    </View>
  );
}

export function Expandable({ title, icon, children, defaultOpen = false, summary }: { title: string; icon?: IconName; children: React.ReactNode; defaultOpen?: boolean; summary?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={s.expand}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={title}
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen(!open); }} style={s.expandHead}>
        {icon && <Ionicons name={icon} size={20} color={colors.primary} />}
        <View style={{ flex: 1 }}>
          <Txt v="h3">{title}</Txt>
          {summary && !open && <Txt v="small" color={colors.muted} numberOfLines={1}>{summary}</Txt>}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
      </Pressable>
      {open && <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm }}>{children}</View>}
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Txt v="h2">{title}</Txt>
      {action && <Pressable onPress={onAction} accessibilityRole="link" hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}><Txt v="small" color={colors.primary} style={{ fontWeight: '700' }}>{action}</Txt></Pressable>}
    </View>
  );
}

export function Row({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
      <Txt v="small" color={colors.muted} style={{ flex: 1 }}>{label}</Txt>
      <Txt v="small" color={tone ?? colors.text} style={{ fontWeight: bold ? '800' : '600' }}>{value}</Txt>
    </View>
  );
}

// ---------- Screen chrome ----------
export function Header({ title, onBack, right, back = true }: { title?: string; onBack?: () => void; right?: React.ReactNode; back?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.header, { paddingTop: insets.top + space.xs }]}>
      <View style={{ width: 48 }}>
        {back && <IconButton icon="chevron-back" label="Go back" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} />}
      </View>
      <Txt v="h3" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>{title}</Txt>
      <View style={{ width: 48, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function StickyBar({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[s.sticky, { paddingBottom: Math.max(insets.bottom, space.md) }]}>{children}</View>;
}

// ---------- Inputs ----------
type FieldProps = TextInputProps & { label: string; error?: string; hint?: string; counter?: number; required?: boolean };
export function Field({ label, error, hint, counter, required, style, value, ...p }: FieldProps) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Txt v="small" style={{ fontWeight: '700' }}>{label}{required ? <Text style={{ color: colors.danger }}> *</Text> : <Text style={{ color: colors.muted, fontWeight: '400' }}> (optional)</Text>}</Txt>
        {counter != null && <Txt v="caption" color={(value?.length ?? 0) >= counter ? colors.danger : colors.muted}>{value?.length ?? 0}/{counter}</Txt>}
      </View>
      <TextInput
        {...p} value={value} accessibilityLabel={label} placeholderTextColor="#8A93A1" maxLength={counter}
        onFocus={(e) => { setFocus(true); p.onFocus?.(e); }} onBlur={(e) => { setFocus(false); p.onBlur?.(e); }}
        style={[s.input, p.multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 }, focus && { borderColor: colors.primary }, !!error && { borderColor: colors.danger }, style]}
      />
      {error ? <Txt v="caption" color={colors.danger} accessibilityLiveRegion="polite">{error}</Txt> : hint ? <Txt v="caption" color={colors.muted}>{hint}</Txt> : null}
    </View>
  );
}

// ---------- States ----------
export function Skeleton({ h = 16, w = '100%', r = radius.sm, style }: { h?: number; w?: number | `${number}%`; r?: number; style?: StyleProp<ViewStyle> }) {
  const a = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(a, { toValue: 0.5, duration: 700, useNativeDriver: true })]));
    loop.start(); return () => loop.stop();
  }, [a]);
  return <Animated.View style={[{ height: h, width: w, borderRadius: r, backgroundColor: '#E4E1D7', opacity: a }, style]} />;
}
export function CardSkeleton() {
  return (
    <View style={[s.card, { gap: space.md }]} accessibilityLabel="Loading campaign">
      <Skeleton h={160} r={radius.md} /><Skeleton h={14} w="40%" /><Skeleton h={22} /><Skeleton h={14} w="80%" /><Skeleton h={8} />
    </View>
  );
}

export function EmptyState({ icon = 'sparkles-outline', title, body, action, onAction }: { icon?: IconName; title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <View style={s.state}>
      <View style={s.stateIcon}><Ionicons name={icon} size={28} color={colors.primary} /></View>
      <Txt v="h2" center>{title}</Txt>
      <Txt v="small" color={colors.muted} center style={{ maxWidth: 300 }}>{body}</Txt>
      {action && <Button title={action} onPress={onAction} kind="secondary" style={{ marginTop: space.sm }} />}
    </View>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.state}>
      <View style={[s.stateIcon, { backgroundColor: colors.dangerSoft }]}><Ionicons name="cloud-offline-outline" size={28} color={colors.danger} /></View>
      <Txt v="h2" center>Something went wrong</Txt>
      <Txt v="small" color={colors.muted} center style={{ maxWidth: 300 }}>{message}</Txt>
      {onRetry && <Button title="Try again" icon="refresh" onPress={onRetry} kind="secondary" style={{ marginTop: space.sm }} />}
    </View>
  );
}

const s = StyleSheet.create({
  btn: { minHeight: MIN_TOUCH, borderRadius: radius.pill, borderWidth: 1.5, paddingHorizontal: space.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  notice: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.md },
  expand: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  expandHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, minHeight: MIN_TOUCH },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, paddingBottom: space.xs, backgroundColor: colors.bg },
  sticky: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: space.lg, paddingTop: space.md },
  input: { minHeight: MIN_TOUCH, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: 16, color: colors.text, backgroundColor: colors.surface },
  state: { alignItems: 'center', gap: space.sm, padding: space.xxl },
  stateIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
});
