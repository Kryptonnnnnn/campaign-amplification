import React from 'react';
import { View } from 'react-native';
import { CoverImage } from './CoverImage';
import { Txt } from './ui';
import { imageUrl } from '../lib/api';
import { colors, radius, space } from '../theme';

type P = { image?: string; headline: string; description: string; cta: string; creator: string };

/** Approximate renderings of how the ad may appear. Final placements depend on each platform. */
export function SocialFeedPreview({ image, headline, description, cta, creator }: P) {
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Txt v="small" color="#fff" style={{ fontWeight: '800' }}>{creator.slice(0, 1).toUpperCase() || 'A'}</Txt></View>
        <View><Txt v="small" style={{ fontWeight: '700' }}>{creator || 'Your name'}</Txt><Txt v="caption" color={colors.muted}>Sponsored</Txt></View>
      </View>
      <Txt v="small" style={{ paddingHorizontal: space.md, paddingBottom: space.sm }} numberOfLines={2}>{description || 'Your ad description appears here.'}</Txt>
      <CoverImage uri={image} style={{ aspectRatio: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0EFEA', padding: space.md, gap: space.sm }}>
        <Txt v="small" style={{ flex: 1, fontWeight: '700' }} numberOfLines={2}>{headline || 'Your headline'}</Txt>
        <View style={{ backgroundColor: '#DDDAD0', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 }}><Txt v="caption" style={{ fontWeight: '700' }}>{cta || 'Learn more'}</Txt></View>
      </View>
    </View>
  );
}

export function DisplayBannerPreview({ image, headline, cta }: P) {
  return (
    <View style={{ flexDirection: 'row', height: 90, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.surface }}>
      <CoverImage uri={image} style={{ width: 120 }} />
      <View style={{ flex: 1, padding: space.sm, justifyContent: 'space-between' }}>
        <Txt v="small" style={{ fontWeight: '700' }} numberOfLines={2}>{headline || 'Your headline'}</Txt>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Txt v="caption" color={colors.muted}>Ad</Txt>
          <View style={{ backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}><Txt v="caption" color="#fff" style={{ fontWeight: '700' }}>{cta || 'Learn more'}</Txt></View>
        </View>
      </View>
    </View>
  );
}
