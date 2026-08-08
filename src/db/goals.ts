import { getDb } from './db';
import { newId } from '../lib/id';
import type { PracticeGoal } from '../types';

export const AWARD_FYC_ID = 'award-fyc-tracker';

// Labels created by the old per-award-preset system, superseded by the single
// shared Award Progress FYC tracker — any leftover records get cleaned up on load.
const LEGACY_AWARD_LABELS = new Set([
  'IDA Bronze Dragon (FYC)',
  'IDA Silver Dragon (FYC)',
  'IDA Gold Dragon (FYC)',
  'IDA Platinum Dragon (FYC)',
  ...['MDRT', 'COT', 'TOT'].flatMap((tier) => [`${tier} — FYC`, `${tier} — FYP`, `${tier} — Income`]),
]);

export async function listGoals(): Promise<PracticeGoal[]> {
  const db = await getDb();
  const all = await db.getAll('goals');
  const legacy = all.filter((g) => g.id !== AWARD_FYC_ID && LEGACY_AWARD_LABELS.has(g.label));
  if (legacy.length > 0) {
    try {
      const tx = db.transaction('goals', 'readwrite');
      await Promise.all(legacy.map((g) => tx.store.delete(g.id)));
      await tx.done;
    } catch (err) {
      // Cleanup is a nice-to-have — never let it block the page from loading.
      console.error('Failed to clean up legacy award goals', err);
    }
  }
  return all.filter((g) => g.id !== AWARD_FYC_ID && !LEGACY_AWARD_LABELS.has(g.label));
}

export async function addGoal(input: Omit<PracticeGoal, 'id'>): Promise<PracticeGoal> {
  const db = await getDb();
  const goal: PracticeGoal = { id: newId(), ...input };
  await db.put('goals', goal);
  return goal;
}

export async function updateGoal(goal: PracticeGoal): Promise<void> {
  const db = await getDb();
  await db.put('goals', goal);
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('goals', id);
}
