import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, Chip, Field, IconButton, Notice, Txt } from '../../../src/components/ui';
import { SocialFeedPreview } from '../../../src/components/AdPreview';
import { StepScaffold } from '../../../src/draft/StepScaffold';
import { useDraft } from '../../../src/draft/DraftContext';
import { colors, radius, space } from '../../../src/theme';

const LOCATIONS = ['United States', 'United Kingdom', 'Canada', 'Australia', 'India', 'Philippines', 'European Union'];
const INTERESTS = ['Environment', 'Health', 'Education', 'Parenting', 'Local politics', 'Technology', 'Science', 'Small business', 'Arts', 'Personal finance', 'Volunteering'];
const CHANNELS = ['Meta (Facebook & Instagram)', 'Google Display', 'YouTube', 'X (Twitter)'] as const;
const DURATIONS = [7, 14, 21, 30, 45, 60];

const equalSplit = (chs: string[]) => Object.fromEntries(chs.map((c, i) => [c, Math.floor(100 / chs.length) + (i < 100 % chs.length ? 1 : 0)]));

export default function Reach() {
  const { draft, patch, errors, setErrors } = useDraft();
  const [loc, setLoc] = useState('');
  const [interest, setInterest] = useState('');
  const r = draft.reach;
  const setR = (p: Partial<typeof r>) => patch({ reach: { ...r, ...p } });
  const clear = (k: string) => { if (errors[k]) { const { [k]: _, ...rest } = errors; setErrors(rest); } };
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const total = r.channels.reduce((a, c) => a + (r.allocation[c] ?? 0), 0);

  const toggleChannel = (c: string) => {
    const channels = toggle(r.channels, c);
    setR({ channels, allocation: equalSplit(channels) }); clear('channels'); clear('allocation');
  };
  const bump = (c: string, d: number) => { setR({ allocation: { ...r.allocation, [c]: Math.max(0, Math.min(100, (r.allocation[c] ?? 0) + d)) } }); clear('allocation'); };
  const addCustom = (kind: 'locations' | 'interests', text: string, reset: () => void) => {
    const t = text.trim(); if (!t || r[kind].includes(t)) return reset();
    setR({ [kind]: [...r[kind], t] } as any); reset(); clear('locations');
  };

  return (
    <StepScaffold index={3} title="Who should see this?" intro="Tell us who your message is for and where it should run. Reviewers finalize the details, and we never promise a fixed audience size.">
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt v="h2">Locations <Txt v="small" color={colors.danger}>*</Txt></Txt><Badge label="You choose" tone="primary" /></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {[...LOCATIONS, ...r.locations.filter((l) => !LOCATIONS.includes(l))].map((l) => <Chip key={l} label={l} selected={r.locations.includes(l)} onPress={() => { setR({ locations: toggle(r.locations, l) }); clear('locations'); }} />)}
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><Field label="Add a city, state or country" value={loc} onChangeText={setLoc} maxLength={60} onSubmitEditing={() => addCustom('locations', loc, () => setLoc(''))} /></View>
          <Button small kind="secondary" title="Add" onPress={() => addCustom('locations', loc, () => setLoc(''))} style={{ marginBottom: 4 }} />
        </View>
        {errors.locations && <Txt v="caption" color={colors.danger}>{errors.locations}</Txt>}
      </Card>

      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt v="h2">Interests</Txt><Badge label="You choose" tone="primary" /></View>
        <Txt v="small" color={colors.muted}>Optional. Broad interests only. We don’t support targeting by sensitive traits.</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {[...INTERESTS, ...r.interests.filter((l) => !INTERESTS.includes(l))].map((l) => <Chip key={l} label={l} selected={r.interests.includes(l)} onPress={() => setR({ interests: toggle(r.interests, l) })} />)}
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><Field label="Add an interest" value={interest} onChangeText={setInterest} maxLength={40} onSubmitEditing={() => addCustom('interests', interest, () => setInterest(''))} /></View>
          <Button small kind="secondary" title="Add" onPress={() => addCustom('interests', interest, () => setInterest(''))} style={{ marginBottom: 4 }} />
        </View>
      </Card>

      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt v="h2">Channels <Txt v="small" color={colors.danger}>*</Txt></Txt><Badge label="You choose" tone="primary" /></View>
        {CHANNELS.map((c) => {
          const on = r.channels.includes(c);
          return (
            <Pressable key={c} onPress={() => toggleChannel(c)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={c}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, padding: space.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primarySoft : colors.surface }}>
              <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? colors.primary : colors.muted} />
              <Txt style={{ flex: 1, fontWeight: '600' }}>{c}</Txt>
              {on && r.channels.length > 1 && <Txt v="small" color={colors.primaryDark} style={{ fontWeight: '800' }}>{r.allocation[c] ?? 0}%</Txt>}
            </Pressable>
          );
        })}
        {errors.channels && <Txt v="caption" color={colors.danger}>{errors.channels}</Txt>}
      </Card>

      {r.channels.length > 1 && (
        <Card style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt v="h2">Budget allocation</Txt><Badge label="You choose" tone="primary" /></View>
          <Txt v="small" color={colors.muted}>How should the advertising budget be split between channels? Reviewers may rebalance based on performance.</Txt>
          {r.channels.map((c) => (
            <View key={c} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Txt v="small" style={{ flex: 1 }} numberOfLines={1}>{c}</Txt>
              <IconButton icon="remove-circle-outline" label={`Decrease ${c}`} onPress={() => bump(c, -5)} />
              <Txt style={{ width: 48, textAlign: 'center', fontWeight: '800' }}>{r.allocation[c] ?? 0}%</Txt>
              <IconButton icon="add-circle-outline" label={`Increase ${c}`} onPress={() => bump(c, 5)} />
            </View>
          ))}
          <Txt v="small" color={total === 100 ? colors.success : colors.danger} style={{ fontWeight: '700' }}>Total: {total}% {total === 100 ? '✓' : '(must equal 100%)'}</Txt>
          {total !== 100 && <Button small kind="secondary" title="Split equally" onPress={() => { setR({ allocation: equalSplit(r.channels) }); clear('allocation'); }} style={{ alignSelf: 'flex-start' }} />}
          {errors.allocation && <Txt v="caption" color={colors.danger}>{errors.allocation}</Txt>}
        </Card>
      )}

      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt v="h2">Promotion length</Txt><Badge label="You choose" tone="primary" /></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>{DURATIONS.map((d) => <Chip key={d} label={`${d} days`} selected={r.durationDays === d} onPress={() => setR({ durationDays: d })} />)}</View>
        <Txt v="caption" color={colors.muted}>How long ads run once funding is complete and promotion is approved to begin.</Txt>
      </Card>

      <Card style={{ gap: space.sm, backgroundColor: '#EDEBE4', borderColor: '#EDEBE4' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt v="h3">Finalized during review</Txt><Badge label="Platform decides" tone="neutral" icon="shield-checkmark" /></View>
        {['Exact ad placements on each platform', 'Bidding and daily spend pacing', 'Final audience definition and exclusions', 'Delivery start date after funding closes'].map((t) => (
          <View key={t} style={{ flexDirection: 'row', gap: 8 }}><Ionicons name="lock-closed-outline" size={14} color={colors.muted} style={{ marginTop: 4 }} /><Txt v="small" style={{ flex: 1 }}>{t}</Txt></View>
        ))}
      </Card>

      <View style={{ gap: space.sm }}>
        <Txt v="h2">Audience preview</Txt>
        <Notice tone="info" icon="people-outline" title="Your message is intended for">
          {r.locations.length ? `People in ${r.locations.join(', ')}` : 'People in locations you choose'}{r.interests.length ? ` interested in ${r.interests.join(', ')}` : ''}, on {r.channels.length ? r.channels.join(', ') : 'channels you choose'}, for {r.durationDays} days. Actual reach depends on ad inventory, prices and delivery.
        </Notice>
        <SocialFeedPreview image={draft.visuals.adImages[0] ?? draft.coverImage ?? undefined} headline={draft.visuals.headline || draft.title.slice(0, 40)} description={draft.visuals.description} cta={draft.visuals.cta} creator={draft.creatorName} />
      </View>
    </StepScaffold>
  );
}
