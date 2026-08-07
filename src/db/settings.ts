import { getDb } from './db';
import type { AppSettings } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  id: 'settings',
  advisorName: '',
  registrationNumber: '',
  contact: '',
  photo: null,
  licenses: '',
  pinHash: null,
  pinSalt: null,
  webauthnCredentialId: null,
  biometricEnabled: false,
  visitCadenceMonths: 6,
  backupReminderWeeks: 2,
  lastBackupAt: null,
  onboardingComplete: false,
  summaryEndpointUrl: null,
  summaryApiKey: null,
  knowledgeEndpointUrl: null,
  knowledgeApiKey: null,
  theme: 'system',
};

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb();
  const existing = await db.get('settings', 'settings');
  if (existing) return { ...DEFAULT_SETTINGS, ...existing };
  await db.put('settings', DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDb();
  await db.put('settings', settings);
}
