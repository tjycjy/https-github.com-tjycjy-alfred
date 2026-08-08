import { getDb } from './db';
import { newId } from '../lib/id';
import type { CommissionEntry, CommissionRateTier, PipelineEntry } from '../types';

// Two earlier schema shapes exist in already-saved data:
//  1) a flat commission dollar figure ("amount") only
//  2) a fixed year-1 / year-2-5 / year-6-plus percentage breakdown
// Both get converted into the current per-year-range rateTiers shape so historical YTD/FYC
// totals stay correct; the user can edit in the real per-year breakdown afterwards.
type LegacyCommission = Partial<CommissionEntry> & {
  id: string;
  amount?: number;
  year1Pct?: number;
  year2to5Pct?: number;
  year6PlusPct?: number;
};

function normalizeCommission(e: LegacyCommission): CommissionEntry {
  const base = {
    id: e.id,
    date: e.date ?? new Date().toISOString(),
    clientId: e.clientId ?? null,
    clientName: e.clientName ?? '',
    product: e.product ?? '',
  };

  if (Array.isArray(e.rateTiers)) {
    return { ...base, premiumAmount: e.premiumAmount ?? 0, rateTiers: e.rateTiers };
  }

  if (typeof e.premiumAmount === 'number') {
    const rateTiers: CommissionRateTier[] = [];
    if (e.year1Pct) rateTiers.push({ id: newId(), fromYear: 1, toYear: 1, pct: e.year1Pct });
    if (e.year2to5Pct) rateTiers.push({ id: newId(), fromYear: 2, toYear: 5, pct: e.year2to5Pct });
    if (e.year6PlusPct) rateTiers.push({ id: newId(), fromYear: 6, toYear: null, pct: e.year6PlusPct });
    return { ...base, premiumAmount: e.premiumAmount, rateTiers };
  }

  return {
    ...base,
    premiumAmount: e.amount ?? 0,
    rateTiers: [{ id: newId(), fromYear: 1, toYear: 1, pct: 100 }],
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
