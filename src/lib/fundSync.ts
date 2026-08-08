import { upsertFundHistory } from '../db/funds';
import type { FundHistoryPoint } from '../types';

export const AUTO_SYNC_TAG = 'auto-sync:greatlink';

interface SyncedFundMeta {
  slug: string;
  name: string;
  fundCode: string;
  assetClass: string;
  insurer: string;
  latestDate: string | null;
  latestNav: number | null;
  points: number;
}

interface FundIndex {
  updatedAt: string;
  funds: SyncedFundMeta[];
}

export interface SyncResult {
  synced: number;
  updatedAt: string | null;
}

// Bundled at build/deploy time by scripts/syncFundPrices.mjs (see .github/workflows) from
// Great Eastern's own public fund-prices API. Same-origin static files — no CORS, no backend.
export async function syncBundledFundPrices(): Promise<SyncResult | null> {
  try {
    const res = await fetch('/data/funds/index.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const data: FundIndex = await res.json();
    let synced = 0;
    for (const meta of data.funds) {
      try {
        const histRes = await fetch(`/data/funds/${meta.slug}.json`, { cache: 'no-store' });
        if (!histRes.ok) continue;
        const history: FundHistoryPoint[] = await histRes.json();
        if (history.length === 0) continue;
        await upsertFundHistory({
          name: meta.name,
          insurer: meta.insurer,
          assetClass: meta.assetClass,
          history,
          sourceFileName: AUTO_SYNC_TAG,
        });
        synced++;
      } catch {
        // skip this one fund, keep syncing the rest
      }
    }
    return { synced, updatedAt: data.updatedAt ?? null };
  } catch {
    return null; // offline, or no bundled data published yet — silently skip
  }
}
