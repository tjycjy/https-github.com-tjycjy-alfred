import { getDb } from './db';
import { newId, nowIso } from '../lib/id';
import type { FundEntry, FundHistoryPoint } from '../types';

export async function listFunds(): Promise<FundEntry[]> {
  const db = await getDb();
  const all = await db.getAll('funds');
  return all
    .map((f) => ({ ...f, insurer: f.insurer ?? 'Other', assetClass: f.assetClass ?? 'Other', history: f.history ?? [] }))
    .sort((a, b) => a.insurer.localeCompare(b.insurer) || a.name.localeCompare(b.name));
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

export async function upsertFundHistory(input: {
  name: string;
  insurer: string;
  assetClass: string;
  history: FundHistoryPoint[];
}): Promise<FundEntry> {
  const db = await getDb();
  const all = await db.getAll('funds');
  const existing = all.find((f) => f.name === input.name);
  const latest = input.history[input.history.length - 1];
  const fund: FundEntry = existing
    ? {
        ...existing,
        insurer: input.insurer,
        assetClass: input.assetClass,
        history: input.history,
        nav: latest?.nav ?? existing.nav,
        updatedAt: nowIso(),
      }
    : {
        id: newId(),
        name: input.name,
        insurer: input.insurer,
        assetClass: input.assetClass,
        nav: latest?.nav ?? null,
        return1y: null,
        return3y: null,
        return5y: null,
        history: input.history,
        sourceFileName: null,
        updatedAt: nowIso(),
      };
  await db.put('funds', fund);
  return fund;
}
