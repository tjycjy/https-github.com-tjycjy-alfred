import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listClients } from '../db/clients';
import { listAllTasks } from '../db/tasks';
import { getSettings } from '../db/settings';
import { listCalendarEvents } from '../db/calendarEvents';
import { buildReminders } from '../lib/reminders';
import { formatDate } from '../lib/age';
import { shareNameCard } from '../lib/nameCard';
import { toDateStr, EventModal } from './Calendar';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { AppSettings, ReminderItem, Task, CalendarEvent, Client } from '../types';

const URGENCY_TONE = { overdue: 'red', soon: 'amber', upcoming: 'slate' } as const;
const KIND_ICON = { visit: '📅', premiumDue: '💳', renewal: '🔄', birthday: '🎂', task: '✅' } as const;
const TYPE_ICON: Record<string, string> = { Appointment: '🤝', Meeting: '📋', Course: '🎓', Other: '📌' };
const NOTIFY_DATE_KEY = 'alfred-last-notify-date';

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
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );

  const todayStr = toDateStr(new Date());

  const load = async () => {
    const [clientList, tasks, s, events] = await Promise.all([listClients(), listAllTasks(), getSettings(), listCalendarEvents()]);
    setSettings(s);
    setClients(clientList);
    setReminders(buildReminders(clientList, tasks, s));
    setOpenTasks(tasks.filter((t: Task) => t.status === 'open').slice(0, 5));
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
          <div className="flex flex-col gap-2">
            {todayEvents.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <span className="text-xl">{TYPE_ICON[e.type] ?? '📌'}</span>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{e.title}</p>
                  <p className="text-sm text-slate-400">{e.time ? e.time : 'All day'} · {e.type}</p>
                </div>
              </div>
            ))}
          </div>
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
        open={showAddEvent}
        initial={null}
        defaultDate={todayStr}
        clients={clients}
        onClose={() => setShowAddEvent(false)}
        onSaved={() => {
          setShowAddEvent(false);
          load();
        }}
        onDeleted={() => setShowAddEvent(false)}
      />
    </div>
  );
}
