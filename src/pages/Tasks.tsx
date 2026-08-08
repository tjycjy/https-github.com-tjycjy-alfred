import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAllTasks, createTask, setTaskStatus, deleteTask } from '../db/tasks';
import { listClients } from '../db/clients';
import { formatDate, daysUntil } from '../lib/age';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DateInput } from '../components/ui/DateInput';
import type { Task, Client } from '../types';

export default function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newClientId, setNewClientId] = useState('');

  const load = async () => {
    const [t, c] = await Promise.all([listAllTasks(), listClients()]);
    setTasks(t);
    setClients(c);
  };

  useEffect(() => {
    load();
  }, []);

  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? null;

  const sorted = useMemo(() => {
    const filtered = tasks.filter((t) => showDone || t.status === 'open');
    return filtered.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [tasks, showDone]);

  const addTask = async () => {
    if (!newDesc.trim()) return;
    await createTask({
      clientId: newClientId || null,
      description: newDesc.trim(),
      dueDate: newDue ? new Date(newDue).toISOString() : null,
    });
    setNewDesc('');
    setNewDue('');
    setNewClientId('');
    await load();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tasks</h1>
          <p className="text-slate-500">Aggregated across all clients and personal to-dos</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          Show completed
        </label>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="New task…"
            className="input lg:flex-1"
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
          />
          <select value={newClientId} onChange={(e) => setNewClientId(e.target.value)} className="input lg:w-48">
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <DateInput value={newDue} onChange={setNewDue} className="lg:w-52" />
          <Button onClick={addTask} disabled={!newDesc.trim()} className="lg:w-32">Add</Button>
        </div>
      </Card>

      {sorted.length === 0 ? (
        <Card className="p-10 text-center text-slate-400">No tasks. You're all caught up!</Card>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((task) => {
            const days = daysUntil(task.dueDate);
            const overdue = task.status === 'open' && days !== null && days < 0;
            return (
              <Card key={task.id} className="flex items-center gap-4 p-4">
                <input
                  type="checkbox"
                  checked={task.status === 'done'}
                  onChange={async (e) => {
                    await setTaskStatus(task.id, e.target.checked ? 'done' : 'open');
                    await load();
                  }}
                  className="h-5 w-5"
                />
                <div className="flex-1">
                  <p className={`font-medium ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {task.description}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                    {task.clientId && (
                      <button onClick={() => navigate(`/clients/${task.clientId}/basic-info`)} className="font-medium text-indigo-600 hover:underline">
                        {clientName(task.clientId)}
                      </button>
                    )}
                    {task.dueDate && <span>Due {formatDate(task.dueDate)}</span>}
                  </div>
                </div>
                {overdue && <Badge tone="red">Overdue</Badge>}
                <button
                  onClick={async () => {
                    await deleteTask(task.id);
                    await load();
                  }}
                  className="rounded-full p-2 text-slate-300 hover:bg-slate-100 hover:text-rose-500"
                >
                  ✕
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
