import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { listCommissions, addCommission, updateCommission, deleteCommission, listPipeline, addPipelineEntry, updatePipelineEntry, deletePipelineEntry } from '../db/commission';
import { year1CommissionAmount, ytdFyc, tierRangeLabel, tierCommissionLabel, exportCommissionCsv, commissionPctForYear, COMMISSION_PAYMENTS_PER_YEAR } from '../lib/commission';
import { newId } from '../lib/id';
import { formatDate } from '../lib/age';
import { formatCurrency } from '../lib/coverageGap';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DateInput } from '../components/ui/DateInput';
import { PREMIUM_FREQUENCIES } from '../types';
import type { CommissionEntry, CommissionRateTier, PipelineEntry, PipelineStatus, PremiumFrequency } from '../types';

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  clientName: '',
  product: '',
  premiumAmount: '',
  paymentFrequency: 'Yearly' as PremiumFrequency,
};

function firstTierRow(): CommissionRateTier {
  return { id: newId(), fromYear: 1, toYear: 1, pct: 0 };
}

function addTierRow(tiers: CommissionRateTier[]): CommissionRateTier[] {
  const last = tiers[tiers.length - 1];
  const nextFrom = last ? (last.toYear ?? last.fromYear) + 1 : 1;
  return [...tiers, { id: newId(), fromYear: nextFrom, toYear: nextFrom, pct: 0 }];
}

// Insurers publish rate schedules as a year-by-year table (e.g. 48% / 23% / 15% / 5% / 5% / 5%),
// and some products keep paying the same trail rate indefinitely past a certain year rather than
// dropping to zero — so each entry gets its own free-form list of "from year N to year M, X%"
// rows instead of one fixed set of bands. "Forever" leaves toYear open-ended.
function TierRows({ tiers, onChange }: { tiers: CommissionRateTier[]; onChange: (tiers: CommissionRateTier[]) => void }) {
  const patchTier = (id: string, patch: Partial<CommissionRateTier>) => {
    onChange(tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };
  const removeTier = (id: string) => {
    if (tiers.length > 1) onChange(tiers.filter((t) => t.id !== id));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 text-xs font-medium text-slate-500">
        <span>From year</span>
        <span>To year</span>
        <span>Commission %</span>
        <span></span>
        <span></span>
      </div>
      {tiers.map((t) => (
        <div key={t.id} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-center gap-2">
          <input
            type="number"
            placeholder="From yr"
            value={t.fromYear}
            onChange={(e) => patchTier(t.id, { fromYear: Number(e.target.value) })}
            className="input"
          />
          <input
            type="number"
            placeholder="To yr"
            value={t.toYear ?? ''}
            disabled={t.toYear === null}
            onChange={(e) => patchTier(t.id, { toYear: Number(e.target.value) })}
            className="input disabled:opacity-50"
          />
          <input
            type="number"
            placeholder="%"
            value={t.pct}
            onChange={(e) => patchTier(t.id, { pct: Number(e.target.value) })}
            className="input"
          />
          <label className="flex items-center gap-1 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={t.toYear === null}
              onChange={(e) => patchTier(t.id, { toYear: e.target.checked ? null : t.fromYear })}
            />
            Forever
          </label>
          <button onClick={() => removeTier(t.id)} className="text-slate-300 hover:text-rose-500">✕</button>
        </div>
      ))}
      <button
        onClick={() => onChange(addTierRow(tiers))}
        className="self-start rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
      >
        + Add year range
      </button>
    </div>
  );
}

export default function Commission() {
  const [entries, setEntries] = useState<CommissionEntry[]>([]);
  const [pipeline, setPipeline] = useState<PipelineEntry[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [tiers, setTiers] = useState<CommissionRateTier[]>([firstTierRow()]);
  const [pipeForm, setPipeForm] = useState({ clientName: '', product: '', amount: '', closeDate: '', status: 'Proposed' as PipelineStatus });
  const [statementUrl, setStatementUrl] = useState<string | null>(null);
  const [statementName, setStatementName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      paymentFrequency: form.paymentFrequency,
      rateTiers: tiers,
    });
    setForm(emptyForm);
    setTiers([firstTierRow()]);
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
  const year1Tier = tiers.find((t) => t.fromYear <= 1 && (t.toYear === null || t.toYear >= 1));
  const formPreviewPerPayment = (Number(form.premiumAmount) || 0) * ((year1Tier?.pct ?? 0) / 100);
  const formPreview = formPreviewPerPayment * COMMISSION_PAYMENTS_PER_YEAR[form.paymentFrequency];

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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Commission Log</h2>
          {entries.length > 0 && (
            <button
              onClick={() => exportCommissionCsv(entries)}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
            >
              ⬇ Export CSV
            </button>
          )}
        </div>

        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-dashed border-slate-200 p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[150px_1fr_1fr]">
            <DateInput value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
            <input placeholder="Client" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="input" />
            <input placeholder="Product" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} className="input" />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:max-w-md sm:grid-cols-2">
            <input
              type="number"
              placeholder="Premium per payment ($) e.g. 100"
              value={form.premiumAmount}
              onChange={(e) => setForm({ ...form, premiumAmount: e.target.value })}
              className="input"
            />
            <select
              value={form.paymentFrequency}
              onChange={(e) => setForm({ ...form, paymentFrequency: e.target.value as PremiumFrequency })}
              className="input"
            >
              {PREMIUM_FREQUENCIES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">Commission rate by policy year</p>
            <TierRows tiers={tiers} onChange={setTiers} />
          </div>
          {formPreview > 0 && (
            <p className="text-xs font-semibold text-emerald-600">
              Year 1 commission: {formatCurrency(formPreviewPerPayment)}
              {form.paymentFrequency !== 'Yearly' && ` × ${COMMISSION_PAYMENTS_PER_YEAR[form.paymentFrequency]} = ${formatCurrency(formPreview)}/yr`}
            </p>
          )}
          <Button onClick={addEntry} className="self-start">Add</Button>
        </div>

        {entries.length === 0 ? (
          <p className="text-slate-400">No commission logged yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((e) => {
              const patch = async (fields: Partial<CommissionEntry>) => {
                const updated = { ...e, ...fields };
                setEntries((prev) => prev.map((x) => (x.id === e.id ? updated : x)));
                await updateCommission(updated);
              };
              const expanded = expandedId === e.id;
              const year1Pct = commissionPctForYear(e.rateTiers, 1);

              if (!expanded) {
                return (
                  <div
                    key={e.id}
                    onClick={() => setExpandedId(e.id)}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 px-4 py-2.5 text-sm hover:bg-slate-50"
                  >
                    <span className="w-24 shrink-0 text-slate-400">{formatDate(e.date)}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                      {e.clientName || 'Unnamed'} {e.product && <span className="font-normal text-slate-400">— {e.product}</span>}
                    </span>
                    <span className="shrink-0 text-slate-500">Yr1 {year1Pct}%</span>
                    <span className="w-24 shrink-0 text-right font-bold text-emerald-600">{formatCurrency(year1CommissionAmount(e))}</span>
                  </div>
                );
              }

              return (
                <div key={e.id} className="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[150px_1fr_1fr]">
                    <DateInput value={e.date.slice(0, 10)} onChange={(v) => patch({ date: new Date(v).toISOString() })} />
                    <input value={e.clientName} onChange={(ev) => patch({ clientName: ev.target.value })} placeholder="Client" className="input" />
                    <input value={e.product} onChange={(ev) => patch({ product: ev.target.value })} placeholder="Product" className="input" />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:max-w-md sm:grid-cols-2">
                    <input
                      type="number"
                      value={e.premiumAmount}
                      onChange={(ev) => patch({ premiumAmount: Number(ev.target.value) })}
                      className="input"
                      placeholder="Premium per payment ($)"
                    />
                    <select
                      value={e.paymentFrequency}
                      onChange={(ev) => patch({ paymentFrequency: ev.target.value as PremiumFrequency })}
                      className="input"
                    >
                      {PREMIUM_FREQUENCIES.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold text-slate-500">Commission rate by policy year</p>
                    <TierRows tiers={e.rateTiers} onChange={(rateTiers) => patch({ rateTiers })} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-white px-3 py-2 text-sm">
                    {e.rateTiers
                      .slice()
                      .sort((a, b) => a.fromYear - b.fromYear)
                      .map((t) => (
                        <span key={t.id}>
                          {tierRangeLabel(t)}:{' '}
                          <strong className={t.fromYear === 1 ? 'text-emerald-600' : 'text-slate-700'}>
                            {tierCommissionLabel(e, t)}
                          </strong>
                        </span>
                      ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <button onClick={async () => { await deleteCommission(e.id); await load(); }} className="text-sm font-semibold text-rose-500 hover:text-rose-600">
                      ✕ Delete
                    </button>
                    <button onClick={() => setExpandedId(null)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                      Done
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
