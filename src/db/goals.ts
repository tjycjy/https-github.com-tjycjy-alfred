import { getDb } from './db';
import { newId } from '../lib/id';
import type { PracticeGoal } from '../types';

export async function listGoals(): Promise<PracticeGoal[]> {
  const db = await getDb();
  return db.getAll('goals');
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
