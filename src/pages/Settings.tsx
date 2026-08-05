import { useEffect, useRef, useState } from 'react';
import { getSettings, saveSettings } from '../db/settings';
import { exportAllData, downloadExport, importData, parseImportFile } from '../db/exportImport';
import { useAuth } from '../state/AuthContext';
import { useTheme, type ThemePreference } from '../state/ThemeContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PinPad } from '../components/lock/PinPad';
import { Modal } from '../components/ui/Modal';
import type { AppSettings } from '../types';

export default function Settings() {
  const { pinConfigured, biometricConfigured, biometricSupported, setupPin, setupBiometric, disableBiometric, refresh } = useAuth();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  if (!settings) return <p className="text-slate-400">Loading…</p>;

  const save = async () => {
    setSaving(true);
    await saveSettings(settings);
    setSaving(false);
    setSavedAt(Date.now());
  };

  const handlePhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setSettings({ ...settings, photo: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleExport = async () => {
    const bundle = await exportAllData();
    downloadExport(bundle);
    const updated = { ...settings, lastBackupAt: new Date().toISOString() };
    setSettings(updated);
    await saveSettings(updated);
  };

  const handleImport = async (file: File) => {
    try {
      const bundle = await parseImportFile(file);
      await importData(bundle, 'merge');
      setImportMessage(`Imported successfully (backup from ${new Date(bundle.exportedAt).toLocaleString()}).`);
    } catch {
      setImportMessage('Import failed — file could not be read as a valid backup.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-800">Settings</h1>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Advisor Profile</h2>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
            {settings.photo ? <img src={settings.photo} alt="" className="h-full w-full object-cover" /> : <span className="text-slate-400">Photo</span>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Upload Photo</Button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Full name</label>
            <input value={settings.advisorName} onChange={(e) => setSettings({ ...settings, advisorName: e.target.value })} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">GE registration / credential no.</label>
            <input value={settings.registrationNumber} onChange={(e) => setSettings({ ...settings, registrationNumber: e.target.value })} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Contact details</label>
            <input value={settings.contact} onChange={(e) => setSettings({ ...settings, contact: e.target.value })} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">CE hours deadline</label>
            <input type="date" value={settings.ceDeadline ?? ''} onChange={(e) => setSettings({ ...settings, ceDeadline: e.target.value || null })} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-600">Licenses held (e.g. CMFAS papers)</label>
            <input value={settings.licenses} onChange={(e) => setSettings({ ...settings, licenses: e.target.value })} className="input" placeholder="M5, M8, M9, M9A, HI…" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Appearance</h2>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as ThemePreference[]).map((option) => (
            <button
              key={option}
              onClick={() => setTheme(option)}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold capitalize transition ${
                theme === option ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {option === 'light' ? '☀️ Light' : option === 'dark' ? '🌙 Dark' : '⚙️ System'}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">App Lock</h2>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
          <div>
            <p className="font-semibold text-slate-700">PIN Code</p>
            <p className="text-sm text-slate-400">{pinConfigured ? 'PIN is set' : 'No PIN configured'}</p>
          </div>
          <Button variant="secondary" onClick={() => setShowPinSetup(true)}>{pinConfigured ? 'Change PIN' : 'Set up PIN'}</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
          <div>
            <p className="font-semibold text-slate-700">Face ID / Touch ID</p>
            <p className="text-sm text-slate-400">
              {!biometricSupported ? 'Not supported on this device/browser' : biometricConfigured ? 'Enabled' : 'Not set up'}
            </p>
          </div>
          {biometricSupported && !biometricConfigured && (
            <Button variant="secondary" onClick={() => setupBiometric(settings.advisorName)}>Enable Biometric</Button>
          )}
          {biometricConfigured && (
            <Button variant="secondary" onClick={disableBiometric}>Disable</Button>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Defaults</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Visit cadence (months before overdue)</label>
            <input
              type="number"
              value={settings.visitCadenceMonths}
              onChange={(e) => setSettings({ ...settings, visitCadenceMonths: Number(e.target.value) })}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Backup reminder (weeks)</label>
            <input
              type="number"
              value={settings.backupReminderWeeks}
              onChange={(e) => setSettings({ ...settings, backupReminderWeeks: Number(e.target.value) })}
              className="input"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-2 text-lg font-bold text-slate-800">AI Meeting Summary (Advanced)</h2>
        <p className="mb-4 text-slate-500">
          By default, voice-recorded meetings use free on-device/browser transcription with no AI summarization.
          To get proper AI-written summaries, point this at your own summarization endpoint — this app has no
          built-in server, so it won't call any AI service unless you configure one here.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Summary endpoint URL</label>
            <input
              value={settings.summaryEndpointUrl ?? ''}
              onChange={(e) => setSettings({ ...settings, summaryEndpointUrl: e.target.value || null })}
              className="input"
              placeholder="https://your-endpoint.example.com/summarize"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">API key (optional)</label>
            <input
              type="password"
              value={settings.summaryApiKey ?? ''}
              onChange={(e) => setSettings({ ...settings, summaryApiKey: e.target.value || null })}
              className="input"
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Button>
        {savedAt && <span className="text-sm text-emerald-600">Saved ✓</span>}
      </div>

      <Card className="p-6">
        <h2 className="mb-2 text-lg font-bold text-slate-800">Data Backup</h2>
        <p className="mb-4 text-slate-500">
          All client data lives only on this device. Export regularly to back up or move to another iPad.
          {settings.lastBackupAt && <span className="block text-sm text-slate-400">Last backup: {new Date(settings.lastBackupAt).toLocaleString()}</span>}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleExport}>⬇ Export All Data (JSON)</Button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
          />
          <Button variant="secondary" onClick={() => importRef.current?.click()}>⬆ Import Data (JSON)</Button>
        </div>
        {importMessage && <p className="mt-3 text-sm text-slate-500">{importMessage}</p>}
      </Card>

      <Modal open={showPinSetup} onClose={() => setShowPinSetup(false)} title="Set up PIN">
        <PinSetupFlow
          onDone={async () => {
            setShowPinSetup(false);
            await refresh();
          }}
          setupPin={setupPin}
        />
      </Modal>
    </div>
  );
}

function PinSetupFlow({ onDone, setupPin }: { onDone: () => void; setupPin: (pin: string) => Promise<void> }) {
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEntry = async (pin: string) => {
    if (!first) {
      setFirst(pin);
      setError(null);
      return;
    }
    if (pin !== first) {
      setError('PINs did not match. Start again.');
      setFirst(null);
      return;
    }
    await setupPin(pin);
    onDone();
  };

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <p className="text-slate-500">{first ? 'Confirm your 6-digit PIN' : 'Enter a new 6-digit PIN'}</p>
      <PinPad onSubmit={handleEntry} error={error} />
    </div>
  );
}
