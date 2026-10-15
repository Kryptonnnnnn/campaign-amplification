import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Txt } from './ui';
import { imageUrl } from '../lib/api';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const ART: Record<string, { bg: string; fg: string; icon: IconName; label: string }> = {
  environment: { bg: '#1F6F6B', fg: '#9ED8C7', icon: 'leaf', label: 'Environment' },
  health: { bg: '#B34A5E', fg: '#F6C1CB', icon: 'heart', label: 'Health' },
  science: { bg: '#2B4C8C', fg: '#A9C4F2', icon: 'flask', label: 'Science' },
  education: { bg: '#B7791F', fg: '#F7DDA3', icon: 'school', label: 'Education' },
  policy: { bg: '#4A3B8C', fg: '#C9BFF2', icon: 'business', label: 'Public Policy' },
  economy: { bg: '#2E7D4F', fg: '#B5E3C6', icon: 'stats-chart', label: 'Economic Policy' },
  community: { bg: '#C2593A', fg: '#F7C6B4', icon: 'people', label: 'Community' },
  arts: { bg: '#8C3B7A', fg: '#F0BFE3', icon: 'color-palette', label: 'Arts & Culture' },
  business: { bg: '#14213D', fg: '#E9A23B', icon: 'storefront', label: 'Business' },
  other: { bg: '#5B6676', fg: '#D5DAE5', icon: 'megaphone', label: 'Message' },
};

/** Real photos render as images. "art:<key>" renders in-app illustrated cover art (used for demo data). */
export function CoverImage({ uri, style, rounded }: { uri?: string | null; style?: StyleProp<ViewStyle>; rounded?: number }) {
  if (uri?.startsWith('art:')) {
    const a = ART[uri.slice(4)] ?? ART.other;
    return (
      <View accessibilityLabel={`${a.label} illustration`} style={[{ backgroundColor: a.bg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: rounded }, style]}>
        <View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: a.fg, opacity: 0.16, right: -70, top: -90 }} />
        <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: a.fg, opacity: 0.12, left: -50, bottom: -70 }} />
        <View style={{ position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: a.fg, opacity: 0.1, left: '30%', top: 12 }} />
        <Ionicons name={a.icon} size={56} color={a.fg} />
        <Txt v="caption" color={a.fg} style={{ marginTop: 6, letterSpacing: 1.2, fontWeight: '800' }}>{a.label.toUpperCase()}</Txt>
      </View>
    );
  }
  return <Image source={imageUrl(uri)} style={[{ backgroundColor: '#E4E1D7', borderRadius: rounded }, style as any]} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />;
}
