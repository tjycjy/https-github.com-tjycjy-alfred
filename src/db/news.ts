import { getDb } from './db';
import type { NewsBriefing } from '../types';

const DEFAULT_BRIEFING: NewsBriefing = {
  id: 'briefing',
  globalNews: '',
  sgNews: '',
  otherNews: '',
  lastRefreshedAt: null,
};

export async function getBriefing(): Promise<NewsBriefing> {
  const db = await getDb();
  const existing = await db.get('news', 'briefing');
  if (existing) return existing;
  return DEFAULT_BRIEFING;
}

export async function saveBriefing(briefing: NewsBriefing): Promise<void> {
  const db = await getDb();
  await db.put('news', briefing);
}
