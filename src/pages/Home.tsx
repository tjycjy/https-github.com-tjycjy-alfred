import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listClients } from '../db/clients';
import { listAllTasks } from '../db/tasks';
import { getSettings } from '../db/settings';
import { buildReminders } from '../lib/reminders';
import { formatDate } from '../lib/age';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { AppSettings, ReminderItem, Task } from '../types';

const URGENCY_TONE = { overdue: 'red', soon: 'amber', upcoming: 'slate' } as const;
const KIND_ICON = { visit: '📅', premiumDue: '💳', renewal: '🔄', birthday: '🎂', task: '✅' } as const;

export default function Home() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [openTasks, setOpenTasks] = useState<Task[]>([]);

  const load = async () => {
    const [clients, tasks, s] = await Promise.all([listClients(), listAllTasks(), getSettings()]);
    setSettings(s);
    setReminders(buildReminders(clients, tasks, s));
    setOpenTasks(tasks.filter((t: Task) => t.status === 'open').slice(0, 5));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-wrap items-center gap-5 p-6">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-indigo-100 text-2xl font-bold text-indigo-600">
          {settings?.photo ? <img src={settings.photo} alt="" className="h-full w-full object-cover" /> : (settings?.advisorName?.[0] ?? 'FA')}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{settings?.advisorName || 'Set up your profile'}</h1>
          <p className="text-slate-500">
            {settings?.registrationNumber ? `Reg. No. ${settings.registrationNumber}` : 'No registration number set'}
            {settings?.contact && ` · ${settings.contact}`}
          </p>
          {settings?.licenses && <p className="text-sm text-slate-400">Licenses: {settings.licenses}</p>}
        </div>
        <Button variant="secondary" onClick={() => navigate('/settings')}>Edit Profile</Button>
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
    </div>
  );
}
