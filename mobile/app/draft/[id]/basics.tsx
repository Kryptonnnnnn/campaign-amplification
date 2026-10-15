import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { CoverImage } from '../../../src/components/CoverImage';
import { Button, Card, Chip, Expandable, Field, Notice, Txt } from '../../../src/components/ui';
import { StepScaffold } from '../../../src/draft/StepScaffold';
import { useDraft } from '../../../src/draft/DraftContext';
import { api, imageUrl } from '../../../src/lib/api';
import { pickAndUpload } from '../../../src/lib/upload';
import { useToast } from '../../../src/store/toast';
import { colors, radius, space } from '../../../src/theme';

const CATS = ['Environment', 'Health', 'Science', 'Education', 'Public Policy', 'Economic Policy', 'Community', 'Arts & Culture', 'Business', 'Other'];
const TYPES = ['Individual', 'Creator', 'Nonprofit', 'Organization', 'Business', 'Community group'];

type Suggestion = { title: string; category: string; summary: string; story: { intro: string } };

export default function Basics() {
  const { draft, patch, errors, setErrors } = useDraft();
  const toast = useToast();
  const [idea, setIdea] = useState('');
  const [thinking, setThinking] = useState(false);
  const [sugg, setSugg] = useState<{ s: Suggestion; notice: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const clear = (k: string) => { if (errors[k]) { const { [k]: _, ...rest } = errors; setErrors(rest); } };

  const suggest = async () => {
    setThinking(true);
    try { const r = await api<{ suggestion: Suggestion; notice: string }>('/ai/draft', { method: 'POST', body: { idea } }); setSugg({ s: r.suggestion, notice: r.notice }); }
    catch (e: any) { toast(e.message, 'error'); } finally { setThinking(false); }
  };
  const applySugg = () => {
    if (!sugg) return;
    patch({ title: sugg.s.title, category: sugg.s.category, summary: sugg.s.summary, story: { ...draft.story, intro: draft.story.intro || sugg.s.story.intro } });
    setSugg(null); toast('Suggestions applied. Edit anything you like');
  };
  const pickCover = async () => {
    setUploading(true);
    try { const url = await pickAndUpload([16, 9]); if (url) { patch({ coverImage: url }); clear('coverImage'); } } catch (e: any) { toast(e.message, 'error'); } finally { setUploading(false); }
  };

  return (
    <StepScaffold index={0} title="The basics" intro="What is your campaign about, who should it reach, and why does it matter? Keep it clear and factual.">
      <Expandable icon="sparkles-outline" title="Get a head start with AI (optional)" summary="Describe your idea and we’ll suggest a draft">
        <Notice tone="info" icon="flask-outline">Demo mode: suggestions are generated on our server from your words. Nothing is applied until you accept, and you can edit everything.</Notice>
        <Field label="Describe your idea" value={idea} onChangeText={setIdea} multiline placeholder="e.g. Teenagers need later school start times because sleep research shows…" />
        <Button small title="Suggest a draft" icon="sparkles" onPress={suggest} loading={thinking} disabled={idea.trim().length < 10} />
        {sugg && (
          <Card style={{ gap: space.sm, backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }}>
            <Txt v="caption" color={colors.warning} style={{ fontWeight: '800' }}>SUGGESTION</Txt>
            <Txt v="small"><Txt v="small" style={{ fontWeight: '700' }}>Title: </Txt>{sugg.s.title}</Txt>
            <Txt v="small"><Txt v="small" style={{ fontWeight: '700' }}>Category: </Txt>{sugg.s.category}</Txt>
            <Txt v="small" numberOfLines={4}><Txt v="small" style={{ fontWeight: '700' }}>Summary: </Txt>{sugg.s.summary}</Txt>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button small title="Use these" onPress={applySugg} style={{ flex: 1 }} /><Button small kind="ghost" title="Dismiss" onPress={() => setSugg(null)} style={{ flex: 1 }} />
            </View>
          </Card>
        )}
      </Expandable>

      <Field label="Campaign title" required counter={60} value={draft.title} onChangeText={(t) => { patch({ title: t }); clear('title'); }} error={errors.title}
        placeholder="A clear, specific headline" hint="The start of your title may be used as the advertising headline if you don’t write a custom one." />

      <View style={{ gap: 6 }}>
        <Txt v="small" style={{ fontWeight: '700' }}>Category <Txt v="small" color={colors.danger}>*</Txt></Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {CATS.map((c) => <Chip key={c} label={c} selected={draft.category === c} onPress={() => { patch({ category: c }); clear('category'); }} />)}
        </View>
        {errors.category && <Txt v="caption" color={colors.danger}>{errors.category}</Txt>}
      </View>

      <Field label="Creator or organization name" required value={draft.creatorName} onChangeText={(t) => { patch({ creatorName: t }); clear('creatorName'); }} error={errors.creatorName} maxLength={80} />
      <View style={{ gap: 6 }}>
        <Txt v="small" style={{ fontWeight: '700' }}>Who is behind this?</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {TYPES.map((t) => <Chip key={t} label={t} selected={draft.creatorType === t} onPress={() => patch({ creatorType: t })} />)}
        </View>
      </View>

      <Field label="Short summary" required counter={280} multiline value={draft.summary} onChangeText={(t) => { patch({ summary: t }); clear('summary'); }} error={errors.summary}
        placeholder="One or two sentences readers see in feeds" hint="Why it matters and what evidence supports it, in plain language." />

      <View style={{ gap: 6 }}>
        <Txt v="small" style={{ fontWeight: '700' }}>Cover image <Txt v="small" color={colors.muted} style={{ fontWeight: '400' }}>(optional here, required before you submit)</Txt></Txt>
        <Pressable onPress={pickCover} accessibilityRole="button" accessibilityLabel={draft.coverImage ? 'Change cover image' : 'Add cover image'}
          style={{ height: 150, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {draft.coverImage ? <CoverImage uri={draft.coverImage} style={{ width: '100%', height: '100%' }} /> : (
            <Txt v="small" color={colors.primary} style={{ fontWeight: '700' }}>{uploading ? 'Uploading…' : '+ Add a cover image'}</Txt>
          )}
        </Pressable>
        {draft.coverImage && <Button small kind="ghost" title="Remove image" onPress={() => patch({ coverImage: null })} style={{ alignSelf: 'flex-start' }} />}
      </View>
    </StepScaffold>
  );
}
