import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Field, Notice, Skeleton, Txt } from './ui';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { timeAgo } from '../lib/format';
import { useAuth } from '../store/auth';
import { useToast } from '../store/toast';
import { colors, space } from '../theme';

type C = { id: string; parentId: string | null; body: string; author: string; mine: boolean; createdAt: string };
const REASONS: [string, string][] = [['spam', 'Spam'], ['abuse', 'Abusive or hateful'], ['misinformation', 'Misinformation'], ['other', 'Something else']];

export function Comments({ campaignId }: { campaignId: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api<{ items: C[] }>(`/campaigns/${campaignId}/comments`), [campaignId, user?.id]);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<C | null>(null);
  const [busy, setBusy] = useState(false);

  const post = async () => {
    if (!user) return router.push('/auth');
    setBusy(true);
    try { await api(`/campaigns/${campaignId}/comments`, { method: 'POST', body: { body, parentId: replyTo?.id } }); setBody(''); setReplyTo(null); toast('Comment posted'); reload(); }
    catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const remove = (c: C) => Alert.alert('Delete your comment?', 'Replies to it will be removed too.', [{ text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await api(`/comments/${c.id}`, { method: 'DELETE' }); reload(); } catch (e: any) { toast(e.message, 'error'); } } }]);
  const report = (c: C) => {
    if (!user) return router.push('/auth');
    Alert.alert('Report this comment', 'Why are you reporting it?', [
      ...REASONS.map(([k, label]) => ({ text: label, onPress: async () => { try { await api(`/comments/${c.id}/report`, { method: 'POST', body: { reason: k } }); toast('Thanks. A reviewer will take a look'); } catch (e: any) { toast(e.message, 'error'); } } })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const top = (data?.items ?? []).filter((c) => !c.parentId);
  const replies = (id: string) => (data?.items ?? []).filter((c) => c.parentId === id);

  const Item = ({ c, child }: { c: C; child?: boolean }) => (
    <View style={{ gap: 4, paddingLeft: child ? space.lg : 0, borderLeftWidth: child ? 2 : 0, borderLeftColor: colors.border }}>
      <Txt v="small" style={{ fontWeight: '700' }}>{c.author}{c.mine ? ' (you)' : ''} <Txt v="caption" color={colors.muted}>· {timeAgo(c.createdAt)}</Txt></Txt>
      <Txt v="small">{c.body}</Txt>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {!child && <Txt v="caption" color={colors.primary} style={{ fontWeight: '700', paddingVertical: 8 }} onPress={() => (user ? setReplyTo(c) : router.push('/auth'))} accessibilityRole="button">Reply</Txt>}
        {c.mine ? <Txt v="caption" color={colors.danger} style={{ fontWeight: '700', paddingVertical: 8 }} onPress={() => remove(c)} accessibilityRole="button">Delete</Txt>
          : <Txt v="caption" color={colors.muted} style={{ fontWeight: '700', paddingVertical: 8 }} onPress={() => report(c)} accessibilityRole="button">Report</Txt>}
      </View>
    </View>
  );

  return (
    <View style={{ gap: space.md }}>
      <Txt v="h2">Discussion</Txt>
      <Txt v="small" color={colors.muted}>Be kind and stay on topic. Only your first name and last initial are shown. No links, please. Comments can be reported and are moderated.</Txt>
      {loading ? <Skeleton h={80} /> : error ? <Notice tone="danger">{error}</Notice> : top.length === 0 ? <Txt v="small" color={colors.muted}>No comments yet. Start the conversation.</Txt> : (
        <View style={{ gap: space.lg }}>
          {top.map((c) => (
            <View key={c.id} style={{ gap: space.sm }}>
              <Item c={c} />
              {replies(c.id).map((r) => <Item key={r.id} c={r} child />)}
            </View>
          ))}
        </View>
      )}
      <Card style={{ gap: space.sm }}>
        {replyTo && <Txt v="caption" color={colors.muted}>Replying to {replyTo.author}. <Txt v="caption" color={colors.primary} style={{ fontWeight: '700' }} onPress={() => setReplyTo(null)}>Cancel</Txt></Txt>}
        <Field label={user ? 'Add a comment' : 'Sign in to comment'} required counter={500} multiline value={body} onChangeText={setBody} placeholder="Share a thought or ask a question" editable={!!user} />
        <Button small title={user ? 'Post comment' : 'Sign in to comment'} onPress={post} loading={busy} disabled={!!user && body.trim().length < 2} />
      </Card>
    </View>
  );
}
