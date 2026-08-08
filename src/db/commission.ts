import { getDb } from './db';
import { newId } from '../lib/id';
import type { CommissionEntry, PipelineEntry } from '../types';

// Entries saved before the premium/rate-tier breakdown only stored a flat commission dollar
// figure ("amount"). Treat that as a 100%-rate year-1 commission on an equal premium so
// historical YTD/FYC totals stay correct — the user can edit in the real % breakdown later.
function normalizeCommission(e: Partial<CommissionEntry> & { id: string; amount?: number }): CommissionEntry {
  if (typeof e.premiumAmount === 'number') {
    return {
      id: e.id,
      date: e.date ?? new Date().toISOString(),
      clientId: e.clientId ?? null,
      clientName: e.clientName ?? '',
      product: e.product ?? '',
      premiumAmount: e.premiumAmount,
      year1Pct: e.year1Pct ?? 0,
      year2to5Pct: e.year2to5Pct ?? 0,
      year6PlusPct: e.year6PlusPct ?? 0,
    };
  }
  return {
    id: e.id,
    date: e.date ?? new Date().toISOString(),
    clientId: e.clientId ?? null,
    clientName: e.clientName ?? '',
    product: e.product ?? '',
    premiumAmount: e.amount ?? 0,
    year1Pct: 100,
    year2to5Pct: 0,
    year6PlusPct: 0,
  };
}

export async function listCommissions(): Promise<CommissionEntry[]> {
  const db = await getDb();
  const all = await db.getAll('commissions');
  return all.map(normalizeCommission).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function addCommission(input: Omit<CommissionEntry, 'id'>): Promise<CommissionEntry> {
  const db = await getDb();
  const entry: CommissionEntry = { id: newId(), ...input };
  await db.put('commissions', entry);
  return entry;
}

export async function updateCommission(entry: CommissionEntry): Promise<void> {
  const db = await getDb();
  await db.put('commissions', entry);
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
