import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { CoverImage } from '../../../src/components/CoverImage';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, Expandable, Field, Notice, Txt } from '../../../src/components/ui';
import { DisplayBannerPreview, SocialFeedPreview } from '../../../src/components/AdPreview';
import { StepScaffold } from '../../../src/draft/StepScaffold';
import { useDraft } from '../../../src/draft/DraftContext';
import { imageUrl } from '../../../src/lib/api';
import { pickAndUpload, SAMPLE_IMAGES } from '../../../src/lib/upload';
import { useToast } from '../../../src/store/toast';
import { colors, radius, space } from '../../../src/theme';

const CTAS = ['Learn more', 'Read more', 'Back this', 'Sign up', 'Watch more'];

function creativeFeedback(d: { headline: string; description: string; images: number; title: string }) {
  const tips: string[] = [];
  const h = d.headline || d.title.slice(0, 40);
  if (h.length < 15) tips.push('Your headline is very short. A specific claim or question usually works better.');
  if (h.length > 34) tips.push('Long headlines get cut off on small screens. Try to stay under 35 characters.');
  if (!d.description) tips.push('Add a description so readers know what they will learn.');
  else if (d.description.length < 50) tips.push('Your description could say a little more about why this matters.');
  if (d.images < 2) tips.push('Add a second image. Testing two visuals helps the ad find what works.');
  if (/!!|ALL CAPS|\bURGENT\b/i.test(h + d.description) || h === h.toUpperCase() && h.length > 6) tips.push('Avoid shouting (all caps or repeated exclamation marks). It tends to reduce trust.');
  return tips.length ? tips : ['Looks good. Clear headline, readable description and more than one image.'];
}

export default function Visuals() {
  const { draft, patch, errors, setErrors } = useDraft();
  const toast = useToast();
  const [busy, setBusy] = useState<'cover' | 'ad' | null>(null);
  const [tips, setTips] = useState<string[] | null>(null);
  const v = draft.visuals;
  const setV = (p: Partial<typeof v>) => patch({ visuals: { ...v, ...p } });
  const clear = (k: string) => { if (errors[k]) { const { [k]: _, ...rest } = errors; setErrors(rest); } };
  const headline = v.headline || draft.title.slice(0, 40);

  const pick = async (kind: 'cover' | 'ad') => {
    setBusy(kind);
    try {
      const url = await pickAndUpload(kind === 'cover' ? [16, 9] : [1, 1]);
      if (!url) return;
      if (kind === 'cover') { patch({ coverImage: url }); clear('coverImage'); } else { setV({ adImages: [...v.adImages, url].slice(0, 6) }); clear('adImages'); }
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(null); }
  };
  const addSample = (url: string) => { if (v.adImages.includes(url)) return; if (v.adImages.length >= 6) return toast('You can add up to 6 ad images', 'error'); setV({ adImages: [...v.adImages, url] }); clear('adImages'); };

  const warnings = [
    !draft.coverImage && 'No cover image yet.', v.adImages.length === 0 && 'No advertising images yet.',
    v.adImages.length === 1 && 'Only one ad image. Two or more is recommended.', !v.description && 'No ad description yet.',
  ].filter(Boolean) as string[];

  return (
    <StepScaffold index={2} title="Campaign & ad visuals" intro="Your story page and your ads are separate. The cover appears on your campaign page. Ad images and text appear in the ads that promote it.">
      <View style={{ gap: 6 }}>
        <Txt v="h2">Campaign cover</Txt>
        <Pressable onPress={() => pick('cover')} accessibilityRole="button" accessibilityLabel={draft.coverImage ? 'Change cover image' : 'Add cover image'}
          style={{ height: 160, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: errors.coverImage ? colors.danger : colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {draft.coverImage ? <CoverImage uri={draft.coverImage} style={{ width: '100%', height: '100%' }} /> : <Txt v="small" color={colors.primary} style={{ fontWeight: '700' }}>{busy === 'cover' ? 'Uploading…' : '+ Add cover image'}</Txt>}
        </Pressable>
        {errors.coverImage && <Txt v="caption" color={colors.danger}>{errors.coverImage}</Txt>}
        <Txt v="caption" color={colors.muted}>JPG, PNG or WebP · under 3.5 MB · at least 600px wide.</Txt>
      </View>

      <View style={{ gap: space.sm }}>
        <Txt v="h2">Advertising images <Txt v="small" color={colors.danger}>*</Txt></Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {v.adImages.map((u, i) => (
            <View key={u + i}>
              <CoverImage uri={u} rounded={radius.md} style={{ width: 112, height: 112 }} />
              <Pressable onPress={() => setV({ adImages: v.adImages.filter((_, j) => j !== i) })} accessibilityRole="button" accessibilityLabel={`Remove ad image ${i + 1}`}
                style={{ position: 'absolute', top: 4, right: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(20,33,61,0.75)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            </View>
          ))}
          {v.adImages.length < 6 && (
            <Pressable onPress={() => pick('ad')} accessibilityRole="button" accessibilityLabel="Upload ad image"
              style={{ width: 112, height: 112, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: errors.adImages ? colors.danger : colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
              <Ionicons name="add" size={28} color={colors.primary} /><Txt v="caption" color={colors.primary}>{busy === 'ad' ? 'Uploading…' : 'Upload'}</Txt>
            </Pressable>
          )}
        </ScrollView>
        {errors.adImages && <Txt v="caption" color={colors.danger}>{errors.adImages}</Txt>}
        <Expandable icon="color-wand-outline" title="Image generation tools" summary="Demo gallery of sample images">
          <Notice tone="info" icon="flask-outline">AI image generation isn’t connected in this prototype. Pick from sample images to try the flow, or upload your own.</Notice>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {SAMPLE_IMAGES.map((u) => <Pressable key={u} onPress={() => addSample(u)} accessibilityRole="button" accessibilityLabel="Add sample image"><Image source={u} style={{ width: 88, height: 88, borderRadius: radius.sm, opacity: v.adImages.includes(u) ? 0.35 : 1 }} contentFit="cover" /></Pressable>)}
          </View>
        </Expandable>
        <Field label="Video creative link" value={v.videoUrl ?? ''} onChangeText={(t) => { setV({ videoUrl: t }); clear('videoUrl'); }} placeholder="https://youtu.be/…" autoCapitalize="none" keyboardType="url" error={errors.videoUrl} hint="Optional. YouTube, Vimeo or a direct .mp4 link. Video runs on YouTube and Meta placements only." />
      </View>

      <View style={{ gap: space.md }}>
        <Txt v="h2">Ad text</Txt>
        <Field label="Ad headline" counter={40} value={v.headline} onChangeText={(t) => setV({ headline: t })} placeholder={draft.title.slice(0, 40) || 'Defaults to the start of your title'} hint="Left blank, we use the first 40 characters of your campaign title." />
        <Field label="Ad description" counter={125} multiline value={v.description} onChangeText={(t) => setV({ description: t })} placeholder="What will people learn or do?" />
        <View style={{ gap: 6 }}>
          <Txt v="small" style={{ fontWeight: '700' }}>Call-to-action button</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>{CTAS.map((c) => <Chip key={c} label={c} selected={v.cta === c} onPress={() => setV({ cta: c })} />)}</View>
        </View>
      </View>

      <View style={{ gap: space.md }}>
        <Txt v="h2">Placement previews</Txt>
        <Notice tone="info">Approximate previews. Each platform finalizes how ads look, and reviewers may adjust placements.</Notice>
        <Txt v="small" style={{ fontWeight: '700' }}>Social feed</Txt>
        <SocialFeedPreview image={v.adImages[0] ?? draft.coverImage ?? undefined} headline={headline} description={v.description} cta={v.cta} creator={draft.creatorName} />
        <Txt v="small" style={{ fontWeight: '700' }}>Display banner</Txt>
        <DisplayBannerPreview image={v.adImages[1] ?? v.adImages[0] ?? draft.coverImage ?? undefined} headline={headline} description={v.description} cta={v.cta} creator={draft.creatorName} />
      </View>

      {warnings.length > 0 && <Notice tone="warning" title="Heads up">{warnings.join(' ')}</Notice>}
      <Card style={{ gap: space.sm }}>
        <Txt v="h3">Creative feedback (optional)</Txt>
        <Txt v="small" color={colors.muted}>Quick automated tips on your headline, text and images.</Txt>
        <Button small kind="secondary" icon="bulb-outline" title="Check my creative" onPress={() => setTips(creativeFeedback({ headline: v.headline, description: v.description, images: v.adImages.length, title: draft.title }))} style={{ alignSelf: 'flex-start' }} />
        {tips?.map((t, i) => <View key={i} style={{ flexDirection: 'row', gap: 8 }}><Ionicons name="chevron-forward" size={16} color={colors.primary} style={{ marginTop: 3 }} /><Txt v="small" style={{ flex: 1 }}>{t}</Txt></View>)}
      </Card>
    </StepScaffold>
  );
}
