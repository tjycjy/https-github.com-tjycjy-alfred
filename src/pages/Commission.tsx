import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { listCommissions, addCommission, updateCommission, deleteCommission, listPipeline, addPipelineEntry, updatePipelineEntry, deletePipelineEntry } from '../db/commission';
import { extractStatementLines, guessCommissionCandidates } from '../lib/commissionStatement';
import { formatDate } from '../lib/age';
import { formatCurrency } from '../lib/coverageGap';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import type { CommissionEntry, PipelineEntry, PipelineStatus } from '../types';

interface StagedCandidate {
  id: string;
  date: string;
  clientName: string;
  product: string;
  amount: string;
}

export default function Commission() {
  const [entries, setEntries] = useState<CommissionEntry[]>([]);
  const [pipeline, setPipeline] = useState<PipelineEntry[]>([]);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), clientName: '', product: '', amount: '' });
  const [pipeForm, setPipeForm] = useState({ clientName: '', product: '', amount: '', closeDate: '', status: 'Proposed' as PipelineStatus });
  const [staged, setStaged] = useState<StagedCandidate[]>([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

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

  const handleStatementUpload = async (file: File) => {
    setImporting(true);
    setImportError('');
    try {
      const lines = await extractStatementLines(file);
      const candidates = guessCommissionCandidates(lines);
      if (candidates.length === 0) {
        setImportError(
          'No commission rows detected. This importer expects an itemized statement of commission you actually received (e.g. a monthly payout advice) — not a commission rate schedule/table. You can still key in entries manually below.',
        );
      }
      setStaged(
        candidates.map((c) => ({
          id: crypto.randomUUID(),
          date: new Date().toISOString().slice(0, 10),
          clientName: c.clientName,
          product: c.product,
          amount: String(c.amount),
        })),
      );
    } catch {
      setImportError('Could not read that PDF. Make sure it is a text-based (not scanned) commission statement.');
    } finally {
      setImporting(false);
    }
  };

  const updateStaged = (id: string, patch: Partial<StagedCandidate>) => {
    setStaged((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const commitStaged = async (id: string) => {
    const row = staged.find((s) => s.id === id);
    if (!row || !row.amount) return;
    await addCommission({
      date: new Date(row.date).toISOString(),
      clientId: null,
      clientName: row.clientName.trim() || 'Unknown',
      product: row.product.trim(),
      amount: Number(row.amount),
    });
    setStaged((prev) => prev.filter((s) => s.id !== id));
    await load();
  };

  const commitAllStaged = async () => {
    for (const row of staged) {
      if (!row.amount) continue;
      await addCommission({
        date: new Date(row.date).toISOString(),
        clientId: null,
        clientName: row.clientName.trim() || 'Unknown',
        product: row.product.trim(),
        amount: Number(row.amount),
      });
    }
    setStaged([]);
    await load();
  };

  const discardStaged = (id: string) => {
    setStaged((prev) => prev.filter((s) => s.id !== id));
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
        <h2 className="mb-1 text-lg font-bold text-slate-800">Import Commission Statement</h2>
        <p className="mb-4 text-sm text-slate-500">
          Upload a commission PDF — dollar-amount rows are detected automatically. Review, edit client/product names,
          then add them to the log below.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-100">
          {importing ? 'Reading PDF…' : 'Choose PDF'}
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={importing}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleStatementUpload(file);
              e.target.value = '';
            }}
          />
        </label>
        {importError && <p className="mt-3 text-sm text-amber-600">{importError}</p>}

        {staged.length > 0 && (
          <div className="mt-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-600">{staged.length} candidate row(s) detected</p>
              <div className="flex gap-2">
                <Button onClick={commitAllStaged}>Add All</Button>
                <button onClick={() => setStaged([])} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50">
                  Discard All
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {staged.map((row) => (
                <div key={row.id} className="grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[140px_1fr_1fr_120px_auto_auto]">
                  <input
                    type="date"
                    value={row.date}
                    onChange={(e) => updateStaged(row.id, { date: e.target.value })}
                    className="input"
                  />
                  <input
                    value={row.clientName}
                    onChange={(e) => updateStaged(row.id, { clientName: e.target.value })}
                    placeholder="Client"
                    className="input"
                  />
                  <input
                    value={row.product}
                    onChange={(e) => updateStaged(row.id, { product: e.target.value })}
                    placeholder="Product"
                    className="input"
                  />
                  <input
                    type="number"
                    value={row.amount}
                    onChange={(e) => updateStaged(row.id, { amount: e.target.value })}
                    className="input"
                  />
                  <Button onClick={() => commitStaged(row.id)}>Add</Button>
                  <button onClick={() => discardStaged(row.id)} className="text-slate-300 hover:text-rose-500">✕</button>
                </div>
              ))}
            </div>
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
          {entries.map((e) => {
            const patch = async (fields: Partial<CommissionEntry>) => {
              const updated = { ...e, ...fields };
              setEntries((prev) => prev.map((x) => (x.id === e.id ? updated : x)));
              await updateCommission(updated);
            };
            return (
              <div key={e.id} className="grid grid-cols-1 items-center gap-2 py-3 sm:grid-cols-[130px_1fr_1fr_110px_auto]">
                <input
                  type="date"
                  value={e.date.slice(0, 10)}
                  onChange={(ev) => patch({ date: new Date(ev.target.value).toISOString() })}
                  className="input"
                />
                <input value={e.clientName} onChange={(ev) => patch({ clientName: ev.target.value })} className="input" />
                <input value={e.product} onChange={(ev) => patch({ product: ev.target.value })} className="input" />
                <input
                  type="number"
                  value={e.amount}
                  onChange={(ev) => patch({ amount: Number(ev.target.value) })}
                  className="input font-bold text-emerald-600"
                />
                <button onClick={async () => { await deleteCommission(e.id); await load(); }} className="text-slate-300 hover:text-rose-500">✕</button>
              </div>
            );
          })}
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
