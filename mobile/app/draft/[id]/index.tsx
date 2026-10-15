import { Redirect, useLocalSearchParams } from 'expo-router';
import { STEPS, useDraft } from '../../../src/draft/DraftContext';

/** Resume where the creator left off. */
export default function Resume() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { draft } = useDraft();
  return <Redirect href={`/draft/${id}/${STEPS[Math.min(Math.max(draft.step, 1), 5) - 1]}`} />;
}
