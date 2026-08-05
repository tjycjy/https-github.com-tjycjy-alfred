import { getDb } from './db';
import { newId } from '../lib/id';
import type { Referral } from '../types';

export async function listReferrals(): Promise<Referral[]> {
  const db = await getDb();
  const all = await db.getAll('referrals');
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function addReferral(input: Omit<Referral, 'id'>): Promise<Referral> {
  const db = await getDb();
  const referral: Referral = { id: newId(), ...input };
  await db.put('referrals', referral);
  return referral;
}

export async function updateReferral(referral: Referral): Promise<void> {
  const db = await getDb();
  await db.put('referrals', referral);
}

export async function deleteReferral(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('referrals', id);
}
