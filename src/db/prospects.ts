import { getDb } from './db';
import { newId, nowIso } from '../lib/id';
import { createClient } from './clients';
import type { Prospect, Client } from '../types';

export async function listProspects(): Promise<Prospect[]> {
  const db = await getDb();
  const all = await db.getAll('prospects');
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProspect(id: string): Promise<Prospect | undefined> {
  const db = await getDb();
  return db.get('prospects', id);
}

export async function createProspect(input: {
  name: string;
  phone?: string;
  email?: string;
  source?: string;
  firstMeetingNotes?: string;
  nextApproach?: string;
  nextApproachDate?: string | null;
}): Promise<Prospect> {
  const db = await getDb();
  const prospect: Prospect = {
    id: newId(),
    name: input.name,
    phone: input.phone ?? '',
    email: input.email ?? '',
    source: input.source ?? '',
    firstMeetingNotes: input.firstMeetingNotes ?? '',
    nextApproach: input.nextApproach ?? '',
    nextApproachDate: input.nextApproachDate ?? null,
    status: 'New',
    convertedClientId: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await db.put('prospects', prospect);
  return prospect;
}

export async function updateProspect(prospect: Prospect): Promise<void> {
  const db = await getDb();
  await db.put('prospects', { ...prospect, updatedAt: nowIso() });
}

export async function deleteProspect(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('prospects', id);
}

export async function convertProspectToClient(prospect: Prospect): Promise<Client> {
  const client = await createClient({
    name: prospect.name,
    dob: null,
    occupation: '',
    salary: null,
    phone: prospect.phone,
    address: '',
    notes: `Converted from prospect (source: ${prospect.source || 'Unknown'}).\n\nFirst meeting notes: ${prospect.firstMeetingNotes || '—'}`,
  });
  await updateProspect({ ...prospect, status: 'Converted', convertedClientId: client.id });
  return client;
}
