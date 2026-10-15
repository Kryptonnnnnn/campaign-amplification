import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Txt } from './ui';
import { colors, space } from '../theme';

const STAGES = [
  { key: 'draft', title: 'Draft created', body: 'You’re building your campaign.' },
  { key: 'submitted', title: 'Submitted for review', body: 'A reviewer checks content, sources, visuals and targeting. Usually 1–2 business days.' },
  { key: 'funding', title: 'Open for funding', body: 'Approved campaigns are listed for 30 days while backers contribute toward ad costs.' },
  { key: 'goal_reached', title: 'Funding goal reached or period ended', body: 'Funding closes. This does not start ads by itself.' },
  { key: 'distribution_prep', title: 'Distribution preparation', body: 'We confirm payments, budget and ad setup with distribution partners.' },
  { key: 'promoting', title: 'Promoting', body: 'Ads run for your chosen duration. Progress updates as partners report.' },
  { key: 'completed', title: 'Completed', body: 'The final distribution report is published.' },
] as const;

const INDEX: Record<string, number> = {
  draft: 0, changes_requested: 1, submitted: 1, approved: 2, funding: 2, goal_reached: 3, funding_ended: 3, distribution_prep: 4, promoting: 5, completed: 6,
};

export function Timeline({ status }: { status: string }) {
  const cur = INDEX[status];
  return (
    <View>
      {STAGES.map((s, i) => {
        const done = cur != null && i < cur || status === 'completed';
        const active = i === cur && status !== 'completed';
        const color = done ? colors.success : active ? (status === 'changes_requested' ? colors.warning : colors.primary) : colors.border;
        return (
          <View key={s.key} style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ alignItems: 'center', width: 24 }}>
              <Ionicons name={done ? 'checkmark-circle' : active ? 'radio-button-on' : 'ellipse-outline'} size={24} color={color} />
              {i < STAGES.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: done ? colors.success : colors.border, minHeight: 16 }} />}
            </View>
            <View style={{ flex: 1, paddingBottom: space.lg }}>
              <Txt v="h3" color={done || active ? colors.text : colors.muted}>{status === 'changes_requested' && i === 1 ? 'Changes requested' : s.title}</Txt>
              {(active || (cur == null && i === 0)) && <Txt v="small" color={colors.muted}>{s.body}</Txt>}
            </View>
          </View>
        );
      })}
    </View>
  );
}
