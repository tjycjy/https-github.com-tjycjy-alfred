import { getDb } from './db';
import { newId, nowIso } from '../lib/id';
import type { Brochure } from '../types';

export async function listBrochures(): Promise<Brochure[]> {
  const db = await getDb();
  const all = await db.getAll('brochures');
  return all.sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime());
}

export async function addBrochure(name: string, file: Blob): Promise<Brochure> {
  const db = await getDb();
  const brochure: Brochure = {
    id: newId(),
    name,
    file,
    addedAt: nowIso(),
    lastOpenedAt: nowIso(),
  };
  await db.put('brochures', brochure);
  return brochure;
}

export async function touchBrochure(id: string): Promise<void> {
  const db = await getDb();
  const brochure = await db.get('brochures', id);
  if (!brochure) return;
  brochure.lastOpenedAt = nowIso();
  await db.put('brochures', brochure);
}

export async function deleteBrochure(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('brochures', id);
}
