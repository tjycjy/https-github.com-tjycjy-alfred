import { getDb } from './db';
import { newId, nowIso } from '../lib/id';
import type { FundEntry } from '../types';

export async function listFunds(): Promise<FundEntry[]> {
  const db = await getDb();
  const all = await db.getAll('funds');
  return all.map((f) => ({ ...f, insurer: f.insurer ?? 'Other' })).sort((a, b) => a.insurer.localeCompare(b.insurer) || a.name.localeCompare(b.name));
}

export async function addFund(input: Omit<FundEntry, 'id' | 'updatedAt'>): Promise<FundEntry> {
  const db = await getDb();
  const fund: FundEntry = { id: newId(), ...input, updatedAt: nowIso() };
  await db.put('funds', fund);
  return fund;
}

export async function updateFund(fund: FundEntry): Promise<void> {
  const db = await getDb();
  await db.put('funds', { ...fund, updatedAt: nowIso() });
}

export async function deleteFund(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('funds', id);
}
