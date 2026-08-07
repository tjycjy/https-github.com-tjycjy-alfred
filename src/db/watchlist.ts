import { getDb } from './db';
import { newId, nowIso } from '../lib/id';
import type { WatchlistEntry } from '../types';

const DEFAULT_WATCHLIST: Array<{ name: string; ticker: string }> = [
  { name: 'AIA Group', ticker: '1299.HK' },
  { name: 'Prudential plc', ticker: 'PRU.L' },
  { name: 'Manulife Financial', ticker: 'MFC' },
  { name: 'OCBC (Great Eastern parent — GE delisted from SGX in 2024)', ticker: 'O39.SI' },
  { name: 'iFAST Corporation', ticker: 'AIY.SI' },
];

export async function listWatchlist(): Promise<WatchlistEntry[]> {
  const db = await getDb();
  const all = await db.getAll('watchlist');
  if (all.length === 0) {
    const seeded: WatchlistEntry[] = DEFAULT_WATCHLIST.map((d) => ({
      id: newId(),
      name: d.name,
      ticker: d.ticker,
      history: [],
      updatedAt: nowIso(),
    }));
    const tx = db.transaction('watchlist', 'readwrite');
    for (const entry of seeded) await tx.store.put(entry);
    await tx.done;
    return seeded;
  }
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addWatchlistEntry(name: string, ticker: string): Promise<WatchlistEntry> {
  const db = await getDb();
  const entry: WatchlistEntry = { id: newId(), name, ticker, history: [], updatedAt: nowIso() };
  await db.put('watchlist', entry);
  return entry;
}

export async function logWatchlistPrice(id: string, date: string, price: number): Promise<void> {
  const db = await getDb();
  const entry = await db.get('watchlist', id);
  if (!entry) return;
  const history = entry.history.filter((h) => h.date !== date);
  history.push({ date, price });
  history.sort((a, b) => a.date.localeCompare(b.date));
  await db.put('watchlist', { ...entry, history, updatedAt: nowIso() });
}

export async function deleteWatchlistEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('watchlist', id);
}
