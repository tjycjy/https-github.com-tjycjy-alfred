import { getDb } from './db';
import { newId, nowIso } from '../lib/id';
import { touchLastVisit } from './clients';
import type { MeetingLogEntry } from '../types';

export async function listMeetingsForClient(clientId: string): Promise<MeetingLogEntry[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('meetings', 'clientId', clientId);
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function createMeeting(input: {
  clientId: string;
  date: string;
  journal: string;
  nextStep: string;
}): Promise<MeetingLogEntry> {
  const db = await getDb();
  const meeting: MeetingLogEntry = {
    id: newId(),
    clientId: input.clientId,
    date: input.date,
    journal: input.journal,
    nextStep: input.nextStep,
    createdAt: nowIso(),
  };
  await db.put('meetings', meeting);
  await touchLastVisit(input.clientId, input.date);
  return meeting;
}

export async function updateMeeting(meeting: MeetingLogEntry): Promise<void> {
  const db = await getDb();
  await db.put('meetings', meeting);
  await touchLastVisit(meeting.clientId, meeting.date);
}

export async function deleteMeeting(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('meetings', id);
}
