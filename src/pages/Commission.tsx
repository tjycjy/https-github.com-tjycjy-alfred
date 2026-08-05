import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { listCommissions, addCommission, deleteCommission, listPipeline, addPipelineEntry, updatePipelineEntry, deletePipelineEntry } from '../db/commission';
import { formatDate } from '../lib/age';
import { formatCurrency } from '../lib/coverageGap';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import type { CommissionEntry, PipelineEntry, PipelineStatus } from '../types';

export default function Commission() {
  const [entries, setEntries] = useState<CommissionEntry[]>([]);
  const [pipeline, setPipeline] = useState<PipelineEntry[]>([]);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), clientName: '', product: '', amount: '' });
  const [pipeForm, setPipeForm] = useState({ clientName: '', product: '', amount: '', closeDate: '', status: 'Proposed' as PipelineStatus });

  const load = async () => {
    setEntries(await listCommissions());
    setPipeline(await listPipeline());
  };

  useEffect(() => {
    load();
  }, []);

  const addEntry = async () => {
    if (!form.clientName.trim() || !form.amount) return;
    await addCommission({
      date: new Date(form.date).toISOString(),
      clientId: null,
      clientName: form.clientName.trim(),
      product: form.product.trim(),
      amount: Number(form.amount),
    });
    setForm({ date: new Date().toISOString().slice(0, 10), clientName: '', product: '', amount: '' });
    await load();
  };

  const addPipeline = async () => {
    if (!pipeForm.clientName.trim() || !pipeForm.amount) return;
    await addPipelineEntry({
      clientId: null,
      clientName: pipeForm.clientName.trim(),
      product: pipeForm.product.trim(),
      expectedAmount: Number(pipeForm.amount),
      expectedCloseDate: pipeForm.closeDate ? new Date(pipeForm.closeDate).toISOString() : null,
      status: pipeForm.status,
    });
    setPipeForm({ clientName: '', product: '', amount: '', closeDate: '', status: 'Proposed' });
    await load();
  };

  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const key = new Date(e.date).toLocaleDateString('en-SG', { month: 'short', year: '2-digit' });
      map.set(key, (map.get(key) ?? 0) + e.amount);
    }
    return Array.from(map.entries())
      .slice(-12)
      .map(([month, total]) => ({ month, total }));
  }, [entries]);

  const totalThisYear = entries
    .filter((e) => new Date(e.date).getFullYear() === new Date().getFullYear())
    .reduce((s, e) => s + e.amount, 0);

  const totalPipeline = pipeline.filter((p) => p.status !== 'Closed').reduce((s, p) => s + p.expectedAmount, 0);

  const statusTone: Record<PipelineStatus, 'slate' | 'amber' | 'green'> = {
    Proposed: 'slate',
    Pending: 'amber',
    Closed: 'green',
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Commission</h1>
        <p className="text-slate-500">YTD received: {formatCurrency(totalThisYear)} · Pipeline: {formatCurrency(totalPipeline)}</p>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Monthly Totals</h2>
        {monthlyData.length === 0 ? (
          <p className="text-slate-400">No commission logged yet.</p>
        ) : (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Commission Log</h2>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr_1fr_120px_100px]">
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" />
          <input placeholder="Client" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="input" />
          <input placeholder="Product" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} className="input" />
          <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input" />
          <Button onClick={addEntry}>Add</Button>
        </div>
        <div className="flex flex-col divide-y divide-slate-100">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-800">{e.clientName} — {e.product}</p>
                <p className="text-sm text-slate-400">{formatDate(e.date)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-emerald-600">{formatCurrency(e.amount)}</span>
                <button onClick={async () => { await deleteCommission(e.id); await load(); }} className="text-slate-300 hover:text-rose-500">✕</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Pipeline / Forecast</h2>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_120px_140px_120px_100px]">
          <input placeholder="Client" value={pipeForm.clientName} onChange={(e) => setPipeForm({ ...pipeForm, clientName: e.target.value })} className="input" />
          <input placeholder="Product" value={pipeForm.product} onChange={(e) => setPipeForm({ ...pipeForm, product: e.target.value })} className="input" />
          <input type="number" placeholder="Amount" value={pipeForm.amount} onChange={(e) => setPipeForm({ ...pipeForm, amount: e.target.value })} className="input" />
          <input type="date" value={pipeForm.closeDate} onChange={(e) => setPipeForm({ ...pipeForm, closeDate: e.target.value })} className="input" />
          <select value={pipeForm.status} onChange={(e) => setPipeForm({ ...pipeForm, status: e.target.value as PipelineStatus })} className="input">
            <option>Proposed</option>
            <option>Pending</option>
            <option>Closed</option>
          </select>
          <Button onClick={addPipeline}>Add</Button>
        </div>
        <div className="flex flex-col divide-y divide-slate-100">
          {pipeline.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-800">{p.clientName} — {p.product}</p>
                <p className="text-sm text-slate-400">{p.expectedCloseDate ? formatDate(p.expectedCloseDate) : 'No close date'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-700">{formatCurrency(p.expectedAmount)}</span>
                <select
                  value={p.status}
                  onChange={async (e) => { await updatePipelineEntry({ ...p, status: e.target.value as PipelineStatus }); await load(); }}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                >
                  <option>Proposed</option>
                  <option>Pending</option>
                  <option>Closed</option>
                </select>
                <Badge tone={statusTone[p.status]}>{p.status}</Badge>
                <button onClick={async () => { await deletePipelineEntry(p.id); await load(); }} className="text-slate-300 hover:text-rose-500">✕</button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
