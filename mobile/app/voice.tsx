import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Button, Field, Header, Notice, ProgressBar, Txt } from '../src/components/ui';
import { api, Campaign } from '../src/lib/api';
import { useToast } from '../src/store/toast';
import { colors, space } from '../src/theme';

const QUESTIONS = [
  { key: 'about', q: 'What is your campaign about?', hint: 'Say it like you’d tell a friend. One or two sentences.', sample: 'Teenagers need later school start times because sleep research shows early starts hurt health and learning.' },
  { key: 'who', q: 'Who should hear this message?', hint: 'Which people, and where?', sample: 'Parents and school board members in the United States.' },
  { key: 'why', q: 'Why does it matter?', hint: 'What changes if more people know?', sample: 'Local boards decide start times, and most parents never see the research.' },
  { key: 'evidence', q: 'What evidence supports it?', hint: 'Studies, reports or data. You’ll add links next.', sample: 'The American Academy of Pediatrics recommends starting after 8:30am. Schools that moved later saw longer sleep and fewer teen car crashes.' },
  { key: 'action', q: 'What should people do after reading?', hint: 'Optional. One simple action.', sample: 'Look up your district’s start time and bring the research to the next school board meeting.' },
] as const;

export default function Voice() {
  const toast = useToast();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const base = React.useRef('');
  const q = QUESTIONS[i];
  const last = i === QUESTIONS.length - 1;
  const text = answers[q.key] ?? '';

  // Live transcript: append what's heard to whatever was already in the box, so nothing typed is lost.
  useSpeechRecognitionEvent('result', (e) => {
    const heard = e.results[0]?.transcript ?? '';
    setAnswers((a) => ({ ...a, [q.key]: (base.current ? base.current + ' ' : '') + heard }));
  });
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('error', (e) => {
    setListening(false);
    setMicNote(e.error === 'no-speech' ? 'I didn’t hear anything. Tap the mic and try again, or type your answer.' : e.error === 'not-allowed' ? 'Microphone permission is off. Enable it in Settings, or type your answer.' : 'Voice input isn’t available right now. You can type your answer instead.');
  });

  const toggleMic = async () => {
    if (listening) { ExpoSpeechRecognitionModule.stop(); return; }
    setMicNote(null);
    try {
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) { setMicNote('This device has no speech recognition service. You can type your answer instead.'); return; }
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) { setMicNote('Microphone permission is off. Enable it in Settings, or type your answer.'); return; }
      base.current = (answers[q.key] ?? '').trim();
      setListening(true);
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false });
    } catch { setListening(false); setMicNote('Voice input isn’t available right now. You can type your answer instead.'); }
  };

  const finish = async () => {
    setBusy(true);
    try {
      const idea = [answers.about, answers.why, answers.who && `Audience: ${answers.who}`].filter(Boolean).join(' ');
      const [{ suggestion }, { campaign }] = await Promise.all([
        api<{ suggestion: { title: string; category: string; summary: string } }>('/ai/draft', { method: 'POST', body: { idea } }),
        api<{ campaign: Campaign }>('/campaigns', { method: 'POST' }),
      ]);
      const sections = [answers.evidence && { id: 'v1', type: 'paragraph', text: answers.evidence }].filter(Boolean);
      await api(`/campaigns/${campaign.id}`, {
        method: 'PUT',
        body: {
          step: 1, title: suggestion.title, category: suggestion.category, summary: suggestion.summary,
          story: { headline: '', intro: [answers.about, answers.why].filter(Boolean).join(' ').slice(0, 600), sections, stats: [], sources: [], actions: answers.action ? [answers.action.slice(0, 120)] : [] },
          reach: { locations: [], interests: [], channels: [], allocation: {}, durationDays: 21 },
        },
      });
      toast('Draft created. Review and edit everything');
      router.replace(`/draft/${campaign.id}/basics`);
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Create with your voice" onBack={() => (i > 0 ? setI(i - 1) : router.back())} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }} keyboardShouldPersistTaps="handled">
        <ProgressBar percent={((i + 1) / QUESTIONS.length) * 100} />
        <Txt v="caption" color={colors.muted}>Question {i + 1} of {QUESTIONS.length}</Txt>
        <Notice tone="info" icon="mic-outline" title="Speak or type">
          Tap the microphone and answer out loud. Your words appear below and you can edit them. The draft is generated in demo AI mode, and nothing is submitted until you choose to.
        </Notice>
        <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.md }}>
          <Pressable onPress={toggleMic} accessibilityRole="button" accessibilityLabel={listening ? 'Stop listening' : 'Start speaking'} accessibilityState={{ busy: listening }}
            style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: listening ? colors.danger : colors.accentSoft, alignItems: 'center', justifyContent: 'center', borderWidth: listening ? 4 : 0, borderColor: colors.dangerSoft }}>
            <Ionicons name={listening ? 'stop' : 'mic'} size={38} color={listening ? '#fff' : colors.warning} />
          </Pressable>
          <Txt v="caption" color={listening ? colors.danger : colors.muted} style={{ fontWeight: '700' }}>{listening ? 'Listening… tap to stop' : 'Tap to speak'}</Txt>
          {micNote && <Notice tone="warning">{micNote}</Notice>}
          <Txt v="h1" center>{q.q}</Txt>
          <Txt v="small" color={colors.muted} center>{q.hint}</Txt>
        </View>
        <Field label="Your answer" required={i < 4} multiline value={text} onChangeText={(t) => setAnswers({ ...answers, [q.key]: t })} placeholder="Your answer appears here. Edit it any time" style={{ minHeight: 120 }} />
        <Button small kind="ghost" icon="flash-outline" title="Use a sample answer" onPress={() => setAnswers({ ...answers, [q.key]: q.sample })} style={{ alignSelf: 'flex-start' }} />
        {!last ? <Button title="Next question" onPress={() => setI(i + 1)} disabled={i < 4 && text.trim().length < 5} />
          : <Button title="Create my draft" icon="sparkles" onPress={finish} loading={busy} disabled={!answers.about || answers.about.trim().length < 10} />}
        {last && <Txt v="caption" color={colors.muted} center>You’ll land on an editable draft. Nothing is submitted until you choose to.</Txt>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
