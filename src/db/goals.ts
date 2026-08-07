import { getDb } from './db';
import { newId } from '../lib/id';
import type { PracticeGoal } from '../types';

export const AWARD_FYC_ID = 'award-fyc-tracker';

export async function listGoals(): Promise<PracticeGoal[]> {
  const db = await getDb();
  const all = await db.getAll('goals');
  return all.filter((g) => g.id !== AWARD_FYC_ID);
}

export async function getAwardFyc(): Promise<number> {
  const db = await getDb();
  const record = await db.get('goals', AWARD_FYC_ID);
  return record?.current ?? 0;
}

export async function setAwardFyc(amount: number): Promise<void> {
  const db = await getDb();
  await db.put('goals', { id: AWARD_FYC_ID, label: 'Award FYC Tracker', target: 0, current: amount, period: '' });
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
