import React from 'react';
import { Text, View } from 'react-native';
import { Txt } from './ui';
import { colors, space } from '../theme';

/** Tiny formatting syntax used by the story editor: **bold**, _italic_, and "- " bullet lines. */
function inline(text: string, keyBase: string) {
  return text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <Text key={keyBase + i} style={{ fontWeight: '700' }}>{part.slice(2, -2)}</Text>;
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) return <Text key={keyBase + i} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</Text>;
    return part;
  });
}

export function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <View style={{ gap: space.xs }}>
      {lines.map((line, i) => line.startsWith('- ') ? (
        <View key={i} style={{ flexDirection: 'row', gap: space.sm, paddingLeft: space.sm }}>
          <Txt color={colors.primary}>•</Txt><Txt style={{ flex: 1 }}>{inline(line.slice(2), `l${i}`)}</Txt>
        </View>
      ) : line.trim() === '' ? null : <Txt key={i}>{inline(line, `l${i}`)}</Txt>)}
    </View>
  );
}

/** Applies a formatting action to the selected range. Returns the new text and caret. */
export function applyFormat(text: string, sel: { start: number; end: number }, kind: 'bold' | 'italic' | 'bullet') {
  const { start, end } = sel;
  if (kind === 'bullet') {
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const already = text.startsWith('- ', lineStart);
    return already
      ? { text: text.slice(0, lineStart) + text.slice(lineStart + 2), caret: Math.max(lineStart, start - 2) }
      : { text: text.slice(0, lineStart) + '- ' + text.slice(lineStart), caret: start + 2 };
  }
  const mark = kind === 'bold' ? '**' : '_';
  const chosen = text.slice(start, end) || (kind === 'bold' ? 'bold text' : 'italic text');
  return { text: text.slice(0, start) + mark + chosen + mark + text.slice(end), caret: start + mark.length + chosen.length + mark.length };
}
