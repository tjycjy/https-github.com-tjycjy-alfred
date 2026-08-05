import { getDb } from './db';
import { newId, nowIso } from '../lib/id';
import type { MeetingRecording } from '../types';

export async function saveRecording(meetingId: string, clientId: string, audio: Blob): Promise<MeetingRecording> {
  const db = await getDb();
  const recording: MeetingRecording = {
    id: newId(),
    meetingId,
    clientId,
    audio,
    createdAt: nowIso(),
  };
  await db.put('recordings', recording);
  return recording;
}

export async function getRecordingForMeeting(meetingId: string): Promise<MeetingRecording | undefined> {
  const db = await getDb();
  return db.getFromIndex('recordings', 'meetingId', meetingId);
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('recordings', id);
}
