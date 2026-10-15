import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space } from '../theme';

type Kind = 'success' | 'error' | 'info';
const Ctx = createContext<(msg: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; kind: Kind } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const insets = useSafeAreaInsets();

  const show = useCallback((msg: string, kind: Kind = 'success') => {
    clearTimeout(timer.current);
    setToast({ msg, kind });
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    timer.current = setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null)), 2600);
  }, [opacity]);

  const bg = toast?.kind === 'error' ? colors.danger : toast?.kind === 'info' ? colors.ink : colors.success;
  return (
    <Ctx.Provider value={show}>
      {children}
      {toast && (
        <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" style={[s.wrap, { top: insets.top + space.sm, opacity }]}>
          <View style={[s.pill, { backgroundColor: bg }]}>
            <Ionicons name={toast.kind === 'error' ? 'alert-circle' : 'checkmark-circle'} size={20} color="#fff" />
            <Text style={s.text}>{toast.msg}</Text>
          </View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center', zIndex: 100 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.pill, maxWidth: '100%' },
  text: { color: '#fff', fontSize: 14, fontWeight: '600', flexShrink: 1 },
});
