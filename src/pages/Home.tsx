import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listClients } from '../db/clients';
import { listAllTasks } from '../db/tasks';
import { getSettings, saveSettings } from '../db/settings';
import { listCalendarEvents } from '../db/calendarEvents';
import { exportAllData, downloadExport } from '../db/exportImport';
import { buildReminders } from '../lib/reminders';
import { syncBirthdayTasks } from '../lib/birthdayTasks';
import { formatDate } from '../lib/age';
import { shareNameCard } from '../lib/nameCard';
import { toDateStr, eventTimeLabel, EventModal } from './Calendar';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { AppSettings, ReminderItem, Task, CalendarEvent, Client } from '../types';

const URGENCY_TONE = { overdue: 'red', soon: 'amber', upcoming: 'slate' } as const;
const KIND_ICON = { visit: '📅', premiumDue: '💳', renewal: '🔄', birthday: '🎂', task: '✅' } as const;
const TYPE_ICON: Record<string, string> = { Appointment: '🤝', Meeting: '📋', Course: '🎓', Other: '📌' };
const NOTIFY_DATE_KEY = 'alfred-last-notify-date';
const ROW_HEIGHT = 56; // px per hour

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Hour-by-hour day planner: 00:00-23:00 rows with today's events (client appointments and any
// personal blocks the advisor adds, e.g. "Gym 08:00-10:00") positioned and sized by their
// actual start/end time, plus a live "now" marker.
function DayTimeline({ events, onEventClick }: { events: CalendarEvent[]; onEventClick: (e: CalendarEvent) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const timedEvents = events.filter((e) => e.time);
  const allDayEvents = events.filter((e) => !e.time);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (nowMinutes / 60 - 1) * ROW_HEIGHT);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {allDayEvents.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {allDayEvents.map((e) => (
            <button
              key={e.id}
              onClick={() => onEventClick(e)}
              className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-left text-sm font-medium text-indigo-700 hover:bg-indigo-100"
            >
              <span>{TYPE_ICON[e.type] ?? '📌'}</span>
              {e.title} · All day
            </button>
          ))}
        </div>
      )}
      <div ref={scrollRef} className="relative max-h-[420px] overflow-y-auto rounded-xl border border-slate-100">
        <div className="relative" style={{ height: ROW_HEIGHT * 24 }}>
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="absolute left-0 right-0 border-t border-slate-100" style={{ top: h * ROW_HEIGHT }}>
              <span className="absolute -top-2 left-1 bg-white px-1 text-[11px] text-slate-400">
                {String(h).padStart(2, '0')}:00
              </span>
            </div>
          ))}
          {nowMinutes >= 0 && (
            <div
              className="absolute left-0 right-0 z-10 flex items-center gap-1"
              style={{ top: (nowMinutes / 60) * ROW_HEIGHT }}
            >
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="h-px flex-1 bg-rose-400" />
            </div>
          )}
          {timedEvents.map((e) => {
            const start = timeToMinutes(e.time!);
            const end = e.endTime ? timeToMinutes(e.endTime) : start + 60;
            const top = (start / 60) * ROW_HEIGHT;
            const height = Math.max(((end - start) / 60) * ROW_HEIGHT, 26);
            return (
              <button
                key={e.id}
                onClick={() => onEventClick(e)}
                className="absolute left-14 right-2 overflow-hidden rounded-lg bg-indigo-100 px-2 py-1 text-left text-xs font-semibold text-indigo-700 hover:bg-indigo-200"
                style={{ top, height }}
              >
                {TYPE_ICON[e.type] ?? '📌'} {e.title}
                <div className="font-normal text-indigo-500">{eventTimeLabel(e)}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [openTasks, setOpenTasks] = useState<Task[]>([]);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );

  const todayStr = toDateStr(new Date());

  const load = async () => {
    const [clientList, tasks, s, events] = await Promise.all([listClients(), listAllTasks(), getSettings(), listCalendarEvents()]);
    const createdBirthdayTasks = await syncBirthdayTasks(clientList, tasks);
    const freshTasks = createdBirthdayTasks ? await listAllTasks() : tasks;
    setSettings(s);
    setClients(clientList);
    setReminders(buildReminders(clientList, freshTasks, s));
    setOpenTasks(freshTasks.filter((t: Task) => t.status === 'open').slice(0, 5));
    setTodayEvents(events.filter((e) => e.date === todayStr).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (notifyPermission !== 'granted' || todayEvents.length === 0) return;
    if (localStorage.getItem(NOTIFY_DATE_KEY) === todayStr) return;
    new Notification('A.L.F.R.E.D. — Today’s Schedule', {
      body: `You have ${todayEvents.length} event${todayEvents.length === 1 ? '' : 's'} today: ${todayEvents.map((e) => e.title).join(', ')}`,
      icon: '/favicon.svg',
    });
    localStorage.setItem(NOTIFY_DATE_KEY, todayStr);
  }, [notifyPermission, todayEvents, todayStr]);

  const requestNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotifyPermission(perm);
  };

  const daysSinceBackup = settings?.lastBackupAt
    ? Math.floor((Date.now() - new Date(settings.lastBackupAt).getTime()) / 86400000)
    : null;
  const backupOverdueDays = (settings?.backupReminderWeeks ?? 2) * 7;
  const backupOverdue = settings !== null && (daysSinceBackup === null || daysSinceBackup >= backupOverdueDays);

  const handleBackupNow = async () => {
    if (!settings) return;
    setBackingUp(true);
    const bundle = await exportAllData();
    downloadExport(bundle);
    const updated = { ...settings, lastBackupAt: new Date().toISOString() };
    await saveSettings(updated);
    setSettings(updated);
    setBackingUp(false);
  };

  const handleShareNameCard = async () => {
    if (!settings?.namecard) return;
    setSharing(true);
    const result = await shareNameCard(settings.namecard, settings.advisorName, settings.contact);
    setShareMsg(result.message);
    setSharing(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-4xl font-bold text-indigo-600">
          {settings?.photo ? <img src={settings.photo} alt="" className="h-full w-full object-cover" /> : (settings?.advisorName?.[0] ?? 'FA')}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{settings?.advisorName || 'Set up your profile'}</h1>
          <p className="text-slate-500">
            {[settings?.companyName, settings?.agencyName].filter(Boolean).join(' · ') || 'No company set'}
          </p>
          <p className="text-sm text-slate-400">
            {settings?.registrationNumber ? `Reg. No. ${settings.registrationNumber}` : 'No registration number set'}
            {settings?.contact && ` · ${settings.contact}`}
          </p>
          {settings?.licenses && <p className="text-sm text-slate-400">Licenses: {settings.licenses}</p>}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/settings')}>Edit Profile</Button>
          {settings?.namecard && (
            <Button onClick={handleShareNameCard} disabled={sharing}>{sharing ? 'Sharing…' : '📤 Share Name Card'}</Button>
          )}
        </div>
        {shareMsg && <p className="text-sm text-amber-600">{shareMsg}</p>}
      </Card>

      {backupOverdue && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50 p-4">
          <div>
            <p className="font-semibold text-amber-800">
              💾 {daysSinceBackup === null ? "You haven't backed up yet" : `Last backup was ${daysSinceBackup} day${daysSinceBackup === 1 ? '' : 's'} ago`}
            </p>
            <p className="text-sm text-amber-700">
              Back up now so you never lose client data.
              {settings?.backupFolderLabel && ` Save to: ${settings.backupFolderLabel}`}
            </p>
          </div>
          <Button onClick={handleBackupNow} disabled={backingUp}>{backingUp ? 'Backing up…' : 'Back up now'}</Button>
        </Card>
      )}

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            📅 Today's Schedule <span className="font-normal text-slate-400">· {formatDate(new Date().toISOString())}</span>
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/calendar')} className="text-sm font-semibold text-indigo-600">
              View calendar →
            </button>
            <Button variant="secondary" onClick={() => setShowAddEvent(true)} className="px-3 py-2 text-sm">
              + Add
            </Button>
          </div>
        </div>
        {notifyPermission === 'default' && (
          <button
            onClick={requestNotifications}
            className="mb-3 w-full rounded-xl bg-indigo-50 p-3 text-left text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            🔔 Enable notifications to get alerted about today's schedule while A.L.F.R.E.D. is open
          </button>
        )}
        {todayEvents.length === 0 ? (
          <p className="text-slate-400">Nothing on the calendar today.</p>
        ) : (
          <DayTimeline events={todayEvents} onEventClick={setEditingEvent} />
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Needs Attention</h2>
        {reminders.length === 0 ? (
          <p className="text-slate-400">Nothing urgent — great job staying on top of things.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {reminders.slice(0, 12).map((r) => (
              <div
                key={r.id}
                onClick={() => r.clientId && navigate(`/clients/${r.clientId}/basic-info`)}
                className={`flex items-center gap-3 rounded-xl bg-slate-50 p-3 ${r.clientId ? 'cursor-pointer hover:bg-slate-100' : ''}`}
              >
                <span className="text-xl">{KIND_ICON[r.kind]}</span>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{r.title}</p>
                  <p className="text-sm text-slate-400">{r.detail}</p>
                </div>
                <Badge tone={URGENCY_TONE[r.urgency]}>{r.urgency}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Upcoming Tasks</h2>
          <button onClick={() => navigate('/tasks')} className="text-sm font-semibold text-indigo-600">View all →</button>
        </div>
        {openTasks.length === 0 ? (
          <p className="text-slate-400">No open tasks.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {openTasks.map((t) => (
              <div key={t.id} className="rounded-lg bg-slate-50 p-3">
                <p className="font-medium text-slate-700">{t.description}</p>
                {t.dueDate && <p className="text-sm text-slate-400">Due {formatDate(t.dueDate)}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <EventModal
        open={showAddEvent || !!editingEvent}
        initial={editingEvent}
        defaultDate={todayStr}
        clients={clients}
        onClose={() => {
          setShowAddEvent(false);
          setEditingEvent(null);
        }}
        onSaved={() => {
          setShowAddEvent(false);
          setEditingEvent(null);
          load();
        }}
        onDeleted={() => {
          setEditingEvent(null);
          load();
        }}
      />
    </div>
  );
}
