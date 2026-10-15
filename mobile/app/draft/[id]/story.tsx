import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { CoverImage } from '../../../src/components/CoverImage';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, Field, IconButton, Notice, Txt } from '../../../src/components/ui';
import { StoryView } from '../../../src/components/StoryView';
import { applyFormat } from '../../../src/components/RichText';
import { StepScaffold } from '../../../src/draft/StepScaffold';
import { useDraft } from '../../../src/draft/DraftContext';
import { imageUrl, Section } from '../../../src/lib/api';
import { pickAndUpload } from '../../../src/lib/upload';
import { useToast } from '../../../src/store/toast';
import { colors, radius, space } from '../../../src/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const BLOCKS: { type: Section['type']; label: string; icon: IconName }[] = [
  { type: 'heading', label: 'Heading', icon: 'text' }, { type: 'paragraph', label: 'Paragraph', icon: 'reorder-three' },
  { type: 'quote', label: 'Quote', icon: 'chatbox-ellipses-outline' }, { type: 'image', label: 'Image', icon: 'image-outline' },
];
const uid = () => Math.random().toString(36).slice(2, 10);

export default function Story() {
  const { draft, patch, errors, setErrors } = useDraft();
  const toast = useToast();
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [uploading, setUploading] = useState<string | null>(null);
  const [sel, setSel] = useState<Record<string, { start: number; end: number }>>({});
  const story = draft.story;
  const set = (p: Partial<typeof story>) => patch({ story: { ...story, ...p } });
  const clear = (k: string) => { if (errors[k]) { const { [k]: _, ...rest } = errors; setErrors(rest); } };

  const setSection = (id: string, p: Partial<Section>) => set({ sections: story.sections.map((s) => (s.id === id ? { ...s, ...p } : s)) });
  const move = (i: number, d: -1 | 1) => { const a = [...story.sections]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set({ sections: a }); };
  const add = (type: Section['type']) => set({ sections: [...story.sections, { id: uid(), type, text: '' }] });
  const upload = async (id: string) => {
    setUploading(id);
    try { const url = await pickAndUpload([16, 9]); if (url) setSection(id, { imageUrl: url }); } catch (e: any) { toast(e.message, 'error'); } finally { setUploading(null); }
  };

  return (
    <StepScaffold index={1} title="Tell the story" intro="Write it like a short article. Clear sections, real numbers, and sources your readers can check.">
      <View style={{ flexDirection: 'row', backgroundColor: '#EDEBE4', borderRadius: radius.pill, padding: 4 }}>
        {(['edit', 'preview'] as const).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} accessibilityRole="tab" accessibilityState={{ selected: mode === m }}
            style={{ flex: 1, minHeight: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: mode === m ? colors.surface : 'transparent' }}>
            <Txt v="small" style={{ fontWeight: '700' }} color={mode === m ? colors.ink : colors.muted}>{m === 'edit' ? 'Edit' : 'Live preview'}</Txt>
          </Pressable>
        ))}
      </View>

      {mode === 'preview' ? (
        <View style={{ gap: space.md }}>
          <Notice tone="info" icon="eye-outline">This is how your story appears on the campaign page. Sources are always visible to readers.</Notice>
          <Card><StoryView c={{ story, title: draft.title }} /></Card>
        </View>
      ) : (
        <>
          <Field label="Story headline" counter={140} value={story.headline} onChangeText={(t) => set({ headline: t })} placeholder="A strong opening line" />
          <Field label="Introduction" required multiline counter={600} value={story.intro} onChangeText={(t) => { set({ intro: t }); clear('intro'); }} error={errors.intro}
            placeholder="Set the scene in a few sentences" style={{ minHeight: 120 }} />

          <View style={{ gap: space.md }}>
            <Txt v="h2">Story sections</Txt>
            {story.sections.length === 0 && <Txt v="small" color={colors.muted}>Add headings, paragraphs, quotes and images below. Reorder them with the arrows.</Txt>}
            {story.sections.map((s, i) => (
              <Card key={s.id} style={{ gap: space.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Txt v="caption" color={colors.muted} style={{ flex: 1, fontWeight: '800' }}>{BLOCKS.find((b) => b.type === s.type)?.label.toUpperCase()}</Txt>
                  <IconButton icon="arrow-up" label="Move section up" onPress={() => move(i, -1)} color={i === 0 ? colors.border : colors.ink} />
                  <IconButton icon="arrow-down" label="Move section down" onPress={() => move(i, 1)} color={i === story.sections.length - 1 ? colors.border : colors.ink} />
                  <IconButton icon="trash-outline" label="Delete section" onPress={() => set({ sections: story.sections.filter((x) => x.id !== s.id) })} color={colors.danger} />
                </View>
                {s.type === 'image' ? (
                  <View style={{ gap: space.sm }}>
                    <Pressable onPress={() => upload(s.id)} accessibilityRole="button" accessibilityLabel={s.imageUrl ? 'Change image' : 'Add image'}
                      style={{ height: 150, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {s.imageUrl ? <CoverImage uri={s.imageUrl} style={{ width: '100%', height: '100%' }} /> : <Txt v="small" color={colors.primary} style={{ fontWeight: '700' }}>{uploading === s.id ? 'Uploading…' : '+ Choose image'}</Txt>}
                    </Pressable>
                    <Field label="Caption" value={s.caption ?? ''} onChangeText={(t) => setSection(s.id, { caption: t })} maxLength={200} />
                    <Field label="Image credit" value={s.credit ?? ''} onChangeText={(t) => setSection(s.id, { credit: t })} placeholder="Photographer or source" maxLength={120} />
                  </View>
                ) : (
                  <View style={{ gap: space.sm }}>
                    {s.type === 'paragraph' && (
                      <View style={{ flexDirection: 'row', gap: space.sm }}>
                        {([['bold', 'B', 'Bold'], ['italic', 'I', 'Italic'], ['bullet', '•', 'Bullet list']] as const).map(([k, glyph, label]) => (
                          <Pressable key={k} accessibilityRole="button" accessibilityLabel={`Format: ${label}`}
                            onPress={() => { const r = applyFormat(s.text, sel[s.id] ?? { start: s.text.length, end: s.text.length }, k); setSection(s.id, { text: r.text }); setSel({ ...sel, [s.id]: { start: r.caret, end: r.caret } }); }}
                            style={{ width: 44, height: 40, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
                            <Txt style={{ fontWeight: k === 'bold' ? '900' : '600', fontStyle: k === 'italic' ? 'italic' : 'normal', fontSize: 18 }}>{glyph}</Txt>
                          </Pressable>
                        ))}
                        <Txt v="caption" color={colors.muted} style={{ alignSelf: 'center', flex: 1 }}>Select text, then tap a style.</Txt>
                      </View>
                    )}
                    <Field label={s.type === 'heading' ? 'Heading' : s.type === 'quote' ? 'Quote' : 'Text'} required value={s.text} onChangeText={(t) => setSection(s.id, { text: t })} multiline={s.type !== 'heading'} maxLength={s.type === 'heading' ? 100 : 4000}
                      selection={sel[s.id]} onSelectionChange={(e) => setSel({ ...sel, [s.id]: e.nativeEvent.selection })} />
                  </View>
                )}
              </Card>
            ))}
            <Txt v="small" style={{ fontWeight: '700' }}>Add a section</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {BLOCKS.map((b) => <Chip key={b.type} label={b.label} icon={b.icon} onPress={() => add(b.type)} />)}
            </View>
          </View>

          <View style={{ gap: space.md }}>
            <Txt v="h2">Key statistics</Txt>
            <Txt v="small" color={colors.muted}>Up to six numbers that support your message. Cite them in your sources.</Txt>
            {story.stats.map((st, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
                <View style={{ width: 96 }}><Field label="Value" value={st.value} maxLength={20} onChangeText={(t) => set({ stats: story.stats.map((x, j) => (j === i ? { ...x, value: t } : x)) })} /></View>
                <View style={{ flex: 1 }}><Field label="Label" value={st.label} maxLength={80} onChangeText={(t) => set({ stats: story.stats.map((x, j) => (j === i ? { ...x, label: t } : x)) })} /></View>
                <IconButton icon="close-circle" label="Remove statistic" color={colors.muted} onPress={() => set({ stats: story.stats.filter((_, j) => j !== i) })} />
              </View>
            ))}
            {story.stats.length < 6 && <Button small kind="secondary" icon="add" title="Add statistic" onPress={() => set({ stats: [...story.stats, { value: '', label: '' }] })} style={{ alignSelf: 'flex-start' }} />}
          </View>

          <View style={{ gap: space.md }}>
            <Txt v="h2">Supporting sources <Txt v="small" color={colors.danger}>*</Txt></Txt>
            <Txt v="small" color={colors.muted}>Readers will see these on your public page. Link to the original research, reports or data.</Txt>
            {errors.sources && <Txt v="caption" color={colors.danger}>{errors.sources}</Txt>}
            {story.sources.map((src, i) => (
              <Card key={i} style={{ gap: space.sm }}>
                <Field label="Source title" required value={src.title} maxLength={160} onChangeText={(t) => set({ sources: story.sources.map((x, j) => (j === i ? { ...x, title: t } : x)) })} />
                <Field label="Source URL" required value={src.url} autoCapitalize="none" keyboardType="url" placeholder="https://" error={errors[`source${i}`]}
                  onChangeText={(t) => { set({ sources: story.sources.map((x, j) => (j === i ? { ...x, url: t } : x)) }); clear(`source${i}`); clear('sources'); }} />
                <Button small kind="ghost" icon="trash-outline" title="Remove source" onPress={() => set({ sources: story.sources.filter((_, j) => j !== i) })} style={{ alignSelf: 'flex-start' }} />
              </Card>
            ))}
            {story.sources.length < 20 && <Button small kind="secondary" icon="add" title="Add a source" onPress={() => set({ sources: [...story.sources, { title: '', url: '' }] })} style={{ alignSelf: 'flex-start' }} />}
          </View>

          <View style={{ gap: space.md }}>
            <Txt v="h2">What can readers do?</Txt>
            <Txt v="small" color={colors.muted}>Suggest up to five simple actions, like “Ask your council about…”.</Txt>
            {story.actions.map((a, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}><Field label={`Action ${i + 1}`} value={a} maxLength={120} onChangeText={(t) => set({ actions: story.actions.map((x, j) => (j === i ? t : x)) })} /></View>
                <IconButton icon="close-circle" label="Remove action" color={colors.muted} onPress={() => set({ actions: story.actions.filter((_, j) => j !== i) })} />
              </View>
            ))}
            {story.actions.length < 5 && <Button small kind="secondary" icon="add" title="Add an action" onPress={() => set({ actions: [...story.actions, ''] })} style={{ alignSelf: 'flex-start' }} />}
          </View>
        </>
      )}
    </StepScaffold>
  );
}
