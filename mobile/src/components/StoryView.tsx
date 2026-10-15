import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Card, Txt } from './ui';
import { RichText } from './RichText';
import { CoverImage } from './CoverImage';
import { Campaign, imageUrl } from '../lib/api';
import { colors, radius, space } from '../theme';

/** Renders the editorial story + visible sources. Used by the public page and the creator preview. */
export function StoryView({ c }: { c: Pick<Campaign, 'story' | 'title'> }) {
  const { story } = c;
  return (
    <View style={{ gap: space.lg }}>
      {!!story.headline && <Txt v="h1">{story.headline}</Txt>}
      {!!story.intro && <Txt style={{ fontSize: 18, lineHeight: 28 }} color={colors.ink}>{story.intro}</Txt>}

      {story.sections.map((s) => {
        if (s.type === 'heading') return <Txt key={s.id} v="h2" style={{ marginTop: space.sm }}>{s.text}</Txt>;
        if (s.type === 'quote') return (
          <View key={s.id} style={{ borderLeftWidth: 4, borderLeftColor: colors.accent, paddingLeft: space.md }}>
            <Txt style={{ fontStyle: 'italic', fontSize: 18, lineHeight: 28 }}>{s.text}</Txt>
          </View>
        );
        if (s.type === 'image') return (
          <View key={s.id} style={{ gap: 6 }}>
            {s.imageUrl ? <CoverImage uri={s.imageUrl} rounded={radius.md} style={{ height: 200 }} /> : null}
            {(s.caption || s.credit) && <Txt v="caption" color={colors.muted}>{s.caption}{s.credit ? `  Credit: ${s.credit}` : ''}</Txt>}
          </View>
        );
        return <RichText key={s.id} text={s.text} />;
      })}

      {story.stats.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          {story.stats.map((st, i) => (
            <View key={i} style={{ flexGrow: 1, flexBasis: '30%', backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: space.md }}>
              <Txt v="h1" color={colors.primaryDark}>{st.value}</Txt>
              <Txt v="caption" color={colors.text}>{st.label}</Txt>
            </View>
          ))}
        </View>
      )}

      {story.actions.length > 0 && (
        <Card style={{ gap: space.sm, backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }}>
          <Txt v="h3">What you can do</Txt>
          {story.actions.map((a, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: space.sm }}>
              <Ionicons name="arrow-forward-circle" size={20} color={colors.warning} />
              <Txt v="small" style={{ flex: 1 }}>{a}</Txt>
            </View>
          ))}
        </Card>
      )}

      <View style={{ gap: space.sm }}>
        <Txt v="h2">Sources</Txt>
        <Txt v="small" color={colors.muted}>Claims in this story are supported by these references. Read them yourself before you decide.</Txt>
        {story.sources.length === 0 ? <Txt v="small" color={colors.danger}>No sources added yet.</Txt> : story.sources.map((s, i) => (
          <Pressable key={i} accessibilityRole="link" accessibilityLabel={`Open source: ${s.title}`} onPress={() => Linking.openURL(s.url)}
            style={{ flexDirection: 'row', gap: space.md, alignItems: 'center', padding: space.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, minHeight: 56 }}>
            <Txt v="h3" color={colors.primary} style={{ width: 22 }}>{i + 1}</Txt>
            <View style={{ flex: 1 }}>
              <Txt v="small" style={{ fontWeight: '600' }} numberOfLines={2}>{s.title}</Txt>
              <Txt v="caption" color={colors.muted} numberOfLines={1}>{s.url.replace(/^https?:\/\//, '')}</Txt>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
