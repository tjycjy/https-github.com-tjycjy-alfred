import { getDb } from './db';
import { newId, nowIso } from '../lib/id';
import type { KnowledgeDoc } from '../types';

export async function listKnowledgeDocs(): Promise<KnowledgeDoc[]> {
  const db = await getDb();
  const all = await db.getAll('knowledgeDocs');
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addKnowledgeDoc(input: { name: string; category: string; text: string; file: Blob }): Promise<KnowledgeDoc> {
  const db = await getDb();
  const doc: KnowledgeDoc = { id: newId(), ...input, addedAt: nowIso() };
  await db.put('knowledgeDocs', doc);
  return doc;
}

export async function deleteKnowledgeDoc(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('knowledgeDocs', id);
}
