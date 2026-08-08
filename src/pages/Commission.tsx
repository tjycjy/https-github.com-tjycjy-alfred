import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { listCommissions, addCommission, updateCommission, deleteCommission, listPipeline, addPipelineEntry, updatePipelineEntry, deletePipelineEntry } from '../db/commission';
import { year1CommissionAmount, year2to5CommissionAmount, year6PlusCommissionAmount, ytdFyc } from '../lib/commission';
import { formatDate } from '../lib/age';
import { formatCurrency } from '../lib/coverageGap';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DateInput } from '../components/ui/DateInput';
import type { CommissionEntry, PipelineEntry, PipelineStatus } from '../types';

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  clientName: '',
  product: '',
  premiumAmount: '',
  year1Pct: '',
  year2to5Pct: '',
  year6PlusPct: '',
};

export default function Commission() {
  const [entries, setEntries] = useState<CommissionEntry[]>([]);
  const [pipeline, setPipeline] = useState<PipelineEntry[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [pipeForm, setPipeForm] = useState({ clientName: '', product: '', amount: '', closeDate: '', status: 'Proposed' as PipelineStatus });
  const [statementUrl, setStatementUrl] = useState<string | null>(null);
  const [statementName, setStatementName] = useState('');

  const load = async () => {
    setEntries(await listCommissions());
    setPipeline(await listPipeline());
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (statementUrl) URL.revokeObjectURL(statementUrl);
    };
  }, [statementUrl]);

  const openStatement = (file: File) => {
    setStatementUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setStatementName(file.name);
  };

  const closeStatement = () => {
    if (statementUrl) URL.revokeObjectURL(statementUrl);
    setStatementUrl(null);
    setStatementName('');
  };

  const addEntry = async () => {
    if (!form.clientName.trim() || !form.premiumAmount) return;
    await addCommission({
      date: new Date(form.date).toISOString(),
      clientId: null,
      clientName: form.clientName.trim(),
      product: form.product.trim(),
      premiumAmount: Number(form.premiumAmount),
      year1Pct: Number(form.year1Pct) || 0,
      year2to5Pct: Number(form.year2to5Pct) || 0,
      year6PlusPct: Number(form.year6PlusPct) || 0,
    });
    setForm(emptyForm);
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
      map.set(key, (map.get(key) ?? 0) + year1CommissionAmount(e));
    }
    return Array.from(map.entries())
      .slice(-12)
      .map(([month, total]) => ({ month, total }));
  }, [entries]);

  const totalThisYear = ytdFyc(entries);
  const totalPipeline = pipeline.filter((p) => p.status !== 'Closed').reduce((s, p) => s + p.expectedAmount, 0);
  const formPreview = (Number(form.premiumAmount) || 0) * (Number(form.year1Pct) || 0) / 100;

  const statusTone: Record<PipelineStatus, 'slate' | 'amber' | 'green'> = {
    Proposed: 'slate',
    Pending: 'amber',
    Closed: 'green',
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Commission</h1>
        <p className="text-slate-500">
          YTD received (FYC): {formatCurrency(totalThisYear)} · Pipeline: {formatCurrency(totalPipeline)}
        </p>
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
        <h2 className="mb-1 text-lg font-bold text-slate-800">Commission Statement</h2>
        <p className="mb-4 text-sm text-slate-500">
          Open your statement PDF to view exactly as issued while you key in each line below — insurer statement
          layouts vary too much to auto-read reliably.
        </p>
        <div className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-100">
            {statementName ? `📄 ${statementName}` : 'Choose PDF'}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) openStatement(file);
                e.target.value = '';
              }}
            />
          </label>
          {statementUrl && (
            <button onClick={closeStatement} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50">
              Close
            </button>
          )}
        </div>
        {statementUrl && (
          <iframe src={statementUrl} title="Commission statement" className="mt-4 h-[600px] w-full rounded-xl border border-slate-200" />
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Commission Log</h2>

        <div className="mb-5 flex flex-col gap-2 rounded-xl border border-dashed border-slate-200 p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[150px_1fr_1fr]">
            <DateInput value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
            <input placeholder="Client" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="input" />
            <input placeholder="Product" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <input type="number" placeholder="Premium ($) e.g. 1000" value={form.premiumAmount} onChange={(e) => setForm({ ...form, premiumAmount: e.target.value })} className="input" />
            <input type="number" placeholder="Yr 1 % e.g. 30" value={form.year1Pct} onChange={(e) => setForm({ ...form, year1Pct: e.target.value })} className="input" />
            <input type="number" placeholder="Yr 2–5 %" value={form.year2to5Pct} onChange={(e) => setForm({ ...form, year2to5Pct: e.target.value })} className="input" />
            <input type="number" placeholder="Yr 6+ %" value={form.year6PlusPct} onChange={(e) => setForm({ ...form, year6PlusPct: e.target.value })} className="input" />
            <Button onClick={addEntry}>Add</Button>
          </div>
          {formPreview > 0 && <p className="text-xs font-semibold text-emerald-600">Year 1 commission: {formatCurrency(formPreview)}</p>}
        </div>

        {entries.length === 0 ? (
          <p className="text-slate-400">No commission logged yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((e) => {
              const patch = async (fields: Partial<CommissionEntry>) => {
                const updated = { ...e, ...fields };
                setEntries((prev) => prev.map((x) => (x.id === e.id ? updated : x)));
                await updateCommission(updated);
              };
              return (
                <div key={e.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[150px_1fr_1fr]">
                    <DateInput value={e.date.slice(0, 10)} onChange={(v) => patch({ date: new Date(v).toISOString() })} />
                    <input value={e.clientName} onChange={(ev) => patch({ clientName: ev.target.value })} placeholder="Client" className="input" />
                    <input value={e.product} onChange={(ev) => patch({ product: ev.target.value })} placeholder="Product" className="input" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Premium ($)</label>
                      <input type="number" value={e.premiumAmount} onChange={(ev) => patch({ premiumAmount: Number(ev.target.value) })} className="input" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Yr 1 %</label>
                      <input type="number" value={e.year1Pct} onChange={(ev) => patch({ year1Pct: Number(ev.target.value) })} className="input" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Yr 2–5 %</label>
                      <input type="number" value={e.year2to5Pct} onChange={(ev) => patch({ year2to5Pct: Number(ev.target.value) })} className="input" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500">Yr 6+ %</label>
                      <input type="number" value={e.year6PlusPct} onChange={(ev) => patch({ year6PlusPct: Number(ev.target.value) })} className="input" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span>
                      Yr 1: <strong className="text-emerald-600">{formatCurrency(year1CommissionAmount(e))}</strong>
                    </span>
                    <span>
                      Yr 2–5 (per yr): <strong className="text-slate-700">{formatCurrency(year2to5CommissionAmount(e))}</strong>
                    </span>
                    <span>
                      Yr 6+ (per yr): <strong className="text-slate-700">{formatCurrency(year6PlusCommissionAmount(e))}</strong>
                    </span>
                    <button onClick={async () => { await deleteCommission(e.id); await load(); }} className="text-slate-300 hover:text-rose-500">
                      ✕ Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Pipeline / Forecast</h2>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_120px_140px_120px_100px]">
          <input placeholder="Client" value={pipeForm.clientName} onChange={(e) => setPipeForm({ ...pipeForm, clientName: e.target.value })} className="input" />
          <input placeholder="Product" value={pipeForm.product} onChange={(e) => setPipeForm({ ...pipeForm, product: e.target.value })} className="input" />
          <input type="number" placeholder="Amount" value={pipeForm.amount} onChange={(e) => setPipeForm({ ...pipeForm, amount: e.target.value })} className="input" />
          <DateInput value={pipeForm.closeDate} onChange={(v) => setPipeForm({ ...pipeForm, closeDate: v })} />
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
