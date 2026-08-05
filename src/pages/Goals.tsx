import { useEffect, useState } from 'react';
import { listGoals, addGoal, updateGoal, deleteGoal } from '../db/goals';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import type { PracticeGoal } from '../types';

export default function Goals() {
  const [goals, setGoals] = useState<PracticeGoal[]>([]);
  const [form, setForm] = useState({ label: '', target: '', period: new Date().toISOString().slice(0, 7) });

  const load = async () => setGoals(await listGoals());

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.label.trim() || !form.target) return;
    await addGoal({ label: form.label.trim(), target: Number(form.target), current: 0, period: form.period });
    setForm({ label: '', target: '', period: new Date().toISOString().slice(0, 7) });
    await load();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Goals</h1>
        <p className="text-slate-500">Personal targets — new business, meetings, AUM growth</p>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_140px_120px]">
          <input placeholder="e.g. New meetings this month" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="input" />
          <input type="number" placeholder="Target" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className="input" />
          <input type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className="input" />
          <Button onClick={create}>Add Goal</Button>
        </div>
      </Card>

      {goals.length === 0 ? (
        <Card className="p-10 text-center text-slate-400">No goals set yet.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {goals.map((goal) => {
            const ratio = goal.target > 0 ? Math.min(1, goal.current / goal.target) : 0;
            const status = ratio >= 1 ? 'met' : ratio >= 0.5 ? 'amber' : 'red';
            return (
              <Card key={goal.id} className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800">{goal.label}</h3>
                    <p className="text-sm text-slate-400">{goal.period}</p>
                  </div>
                  <button onClick={async () => { await deleteGoal(goal.id); await load(); }} className="text-slate-300 hover:text-rose-500">✕</button>
                </div>
                <ProgressBar ratio={ratio} status={status} />
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">{goal.current} / {goal.target}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => { await updateGoal({ ...goal, current: Math.max(0, goal.current - 1) }); await load(); }}
                      className="h-8 w-8 rounded-full bg-slate-100 font-bold text-slate-600 hover:bg-slate-200"
                    >
                      −
                    </button>
                    <button
                      onClick={async () => { await updateGoal({ ...goal, current: goal.current + 1 }); await load(); }}
                      className="h-8 w-8 rounded-full bg-indigo-100 font-bold text-indigo-600 hover:bg-indigo-200"
                    >
                      +
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
