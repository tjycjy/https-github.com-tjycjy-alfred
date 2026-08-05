import { getDb } from './db';
import { newId } from '../lib/id';
import type { CommissionEntry, PipelineEntry } from '../types';

export async function listCommissions(): Promise<CommissionEntry[]> {
  const db = await getDb();
  const all = await db.getAll('commissions');
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function addCommission(input: Omit<CommissionEntry, 'id'>): Promise<CommissionEntry> {
  const db = await getDb();
  const entry: CommissionEntry = { id: newId(), ...input };
  await db.put('commissions', entry);
  return entry;
}

export async function deleteCommission(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('commissions', id);
}

export async function listPipeline(): Promise<PipelineEntry[]> {
  const db = await getDb();
  return db.getAll('pipeline');
}

export async function addPipelineEntry(input: Omit<PipelineEntry, 'id'>): Promise<PipelineEntry> {
  const db = await getDb();
  const entry: PipelineEntry = { id: newId(), ...input };
  await db.put('pipeline', entry);
  return entry;
}

export async function updatePipelineEntry(entry: PipelineEntry): Promise<void> {
  const db = await getDb();
  await db.put('pipeline', entry);
}

export async function deletePipelineEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('pipeline', id);
}
