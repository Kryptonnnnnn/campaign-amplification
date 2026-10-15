import { Platform } from 'react-native';

export const colors = {
  bg: '#F7F6F2',
  surface: '#FFFFFF',
  ink: '#14213D',
  text: '#1D2433',
  muted: '#5B6676',
  border: '#E3E0D6',
  primary: '#1F6F6B',
  primaryDark: '#164F4C',
  primarySoft: '#E3F1EF',
  accent: '#E9A23B',
  accentSoft: '#FBF0DC',
  success: '#2E7D4F',
  successSoft: '#E4F3EA',
  warning: '#9A6411',
  warningSoft: '#FBF0DC',
  danger: '#B3382C',
  dangerSoft: '#FBE9E7',
  info: '#2B5C9E',
  infoSoft: '#E6EFFA',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 } as const;

export const serif = Platform.select({ ios: 'Georgia', default: 'serif' });

export const type = {
  display: { fontFamily: serif, fontSize: 30, lineHeight: 36, fontWeight: '700' as const },
  h1: { fontFamily: serif, fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  h2: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const },
  h3: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
};

export const shadow = Platform.select({
  ios: { shadowColor: '#14213D', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  default: { elevation: 2 },
});

export const MIN_TOUCH = 48;
