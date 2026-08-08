import { getDb } from './db';
import { newId, nowIso } from '../lib/id';
import type { CalendarEvent } from '../types';

export async function listCalendarEvents(): Promise<CalendarEvent[]> {
  const db = await getDb();
  const all = await db.getAll('calendarEvents');
  return all
    .map((e) => ({ ...e, endTime: e.endTime ?? null }))
    .sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')));
}

export async function createCalendarEvent(input: {
  title: string;
  type: CalendarEvent['type'];
  date: string;
  time?: string | null;
  endTime?: string | null;
  notes?: string;
  clientId?: string | null;
}): Promise<CalendarEvent> {
  const db = await getDb();
  const event: CalendarEvent = {
    id: newId(),
    title: input.title,
    type: input.type,
    date: input.date,
    time: input.time ?? null,
    endTime: input.endTime ?? null,
    notes: input.notes ?? '',
    clientId: input.clientId ?? null,
    createdAt: nowIso(),
  };
  await db.put('calendarEvents', event);
  return event;
}

export async function updateCalendarEvent(event: CalendarEvent): Promise<void> {
  const db = await getDb();
  await db.put('calendarEvents', event);
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('calendarEvents', id);
}
