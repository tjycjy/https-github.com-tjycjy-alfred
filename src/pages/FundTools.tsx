import { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { listFunds, addFund, deleteFund } from '../db/funds';
import { extractFactsheetText, guessFactsheetFields } from '../lib/fundFactsheet';
import { compoundInterestSeries } from '../lib/calculators/finance';
import { formatCurrency } from '../lib/coverageGap';
import { formatDate } from '../lib/age';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { SliderInput } from '../components/ui/SliderInput';
import type { FundEntry } from '../types';

export default function FundTools() {
  const [funds, setFunds] = useState<FundEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

  const load = async () => {
    setLoading(true);
    setFunds(await listFunds());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fund Tools</h1>
          <p className="text-slate-500">Import factsheets and simulate blended allocation growth.</p>
        </div>
        <Button onClick={() => setShowImport(true)}>📄 Import Factsheet</Button>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Fund Database</h2>
        {loading ? (
          <p className="text-slate-400">Loading…</p>
        ) : funds.length === 0 ? (
          <p className="text-slate-400">No funds imported yet. Import a factsheet PDF to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2">Fund</th>
                  <th className="py-2 text-right">NAV</th>
                  <th className="py-2 text-right">1Y</th>
                  <th className="py-2 text-right">3Y</th>
                  <th className="py-2 text-right">5Y</th>
                  <th className="py-2 text-right">Last Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {funds.map((f) => (
                  <tr key={f.id} className="border-b border-slate-100">
                    <td className="py-2 font-medium text-slate-700">{f.name}</td>
                    <td className="py-2 text-right text-slate-600">{f.nav !== null ? f.nav.toFixed(4) : '—'}</td>
                    <td className="py-2 text-right text-slate-600">{f.return1y !== null ? `${f.return1y}%` : '—'}</td>
                    <td className="py-2 text-right text-slate-600">{f.return3y !== null ? `${f.return3y}%` : '—'}</td>
                    <td className="py-2 text-right text-slate-600">{f.return5y !== null ? `${f.return5y}%` : '—'}</td>
                    <td className="py-2 text-right text-slate-400">{formatDate(f.updatedAt)}</td>
                    <td className="py-2 text-right">
                      <button onClick={async () => { await deleteFund(f.id); await load(); }} className="text-slate-300 hover:text-rose-500">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AllocationSimulator funds={funds} />

      <ImportFactsheetModal open={showImport} onClose={() => setShowImport(false)} onSaved={async () => { setShowImport(false); await load(); }} />
    </div>
  );
}

function ImportFactsheetModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [nav, setNav] = useState('');
  const [return1y, setReturn1y] = useState('');
  const [return3y, setReturn3y] = useState('');
  const [return5y, setReturn5y] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setExtracting(true);
    setFileName(file.name);
    try {
      const text = await extractFactsheetText(file);
      const guess = guessFactsheetFields(text);
      if (guess.nav !== null) setNav(String(guess.nav));
      if (guess.return1y !== null) setReturn1y(String(guess.return1y));
      if (guess.return3y !== null) setReturn3y(String(guess.return3y));
      if (guess.return5y !== null) setReturn5y(String(guess.return5y));
      if (!name) setName(file.name.replace(/\.pdf$/i, ''));
    } catch {
      // extraction failed — user can still fill fields manually
    }
    setExtracting(false);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await addFund({
      name: name.trim(),
      nav: nav ? Number(nav) : null,
      return1y: return1y ? Number(return1y) : null,
      return3y: return3y ? Number(return3y) : null,
      return5y: return5y ? Number(return5y) : null,
      sourceFileName: fileName,
    });
    setSaving(false);
    setName('');
    setNav('');
    setReturn1y('');
    setReturn3y('');
    setReturn5y('');
    setFileName(null);
    onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title="Import Fund Factsheet">
      <div className="flex flex-col gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={extracting}>
          {extracting ? 'Reading PDF…' : fileName ? `📄 ${fileName}` : '📄 Choose Factsheet PDF'}
        </Button>
        <p className="text-xs text-slate-400">
          Figures are auto-detected where possible — factsheet layouts vary, so please double-check before saving.
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Fund name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">NAV</label>
            <input type="number" step="0.0001" value={nav} onChange={(e) => setNav(e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">1Y return %</label>
            <input type="number" step="0.01" value={return1y} onChange={(e) => setReturn1y(e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">3Y return % (ann.)</label>
            <input type="number" step="0.01" value={return3y} onChange={(e) => setReturn3y(e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">5Y return % (ann.)</label>
            <input type="number" step="0.01" value={return5y} onChange={(e) => setReturn5y(e.target.value)} className="input" />
          </div>
        </div>
        <Button onClick={save} disabled={!name.trim() || saving}>{saving ? 'Saving…' : 'Save Fund'}</Button>
      </div>
    </Modal>
  );
}

function AllocationSimulator({ funds }: { funds: FundEntry[] }) {
  const [count, setCount] = useState(2);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [percentages, setPercentages] = useState<number[]>([50, 50]);
  const [lumpSum, setLumpSum] = useState(10000);
  const [monthly, setMonthly] = useState(0);
  const [years, setYears] = useState(10);

  useEffect(() => {
    const ids = funds.slice(0, count).map((f) => f.id);
    setSelectedIds(ids);
    setPercentages(Array(count).fill(Math.round(100 / count)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, funds.length]);

  const total = percentages.reduce((s, p) => s + p, 0);

  const normalize = () => {
    if (total === 0) return;
    setPercentages(percentages.map((p) => Math.round((p / total) * 100)));
  };

  const selectedFunds = selectedIds.map((id) => funds.find((f) => f.id === id)).filter((f): f is FundEntry => !!f);

  const blendedRate = useMemo(() => {
    if (total === 0 || selectedFunds.length !== count) return 0;
    return selectedFunds.reduce((sum, fund, i) => {
      const rate = fund.return5y ?? fund.return3y ?? fund.return1y ?? 0;
      return sum + rate * (percentages[i] / 100);
    }, 0);
  }, [selectedFunds, percentages, total, count]);

  const series = useMemo(
    () => compoundInterestSeries(lumpSum, blendedRate, years, 'annual', monthly),
    [lumpSum, blendedRate, years, monthly],
  );
  const final = series[series.length - 1];

  if (funds.length < 2) {
    return (
      <Card className="p-6 text-slate-400">
        Import at least 2 funds to use the allocation simulator.
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5 p-6">
      <h2 className="text-lg font-bold text-slate-800">Allocation & Growth Simulator</h2>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-600">Number of funds</span>
        {[2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => setCount(Math.min(n, funds.length))}
            disabled={n > funds.length}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-30 ${count === n ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-xl bg-slate-50 p-4">
            <select
              value={selectedIds[i] ?? ''}
              onChange={(e) => setSelectedIds((ids) => ids.map((id, idx) => (idx === i ? e.target.value : id)))}
              className="input mb-2"
            >
              {funds.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <SliderInput
              label="Allocation"
              value={percentages[i] ?? 0}
              min={0}
              max={100}
              step={1}
              format={(v) => `${v}%`}
              onChange={(v) => setPercentages((p) => p.map((val, idx) => (idx === i ? v : val)))}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
        <span className={`font-semibold ${total === 100 ? 'text-emerald-600' : 'text-rose-600'}`}>Total: {total}%</span>
        {total !== 100 && <Button variant="secondary" onClick={normalize}>Normalize to 100%</Button>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Lump sum</label>
          <input type="number" value={lumpSum} onChange={(e) => setLumpSum(Number(e.target.value))} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Monthly contribution</label>
          <input type="number" value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Timeframe (years)</label>
          <input type="number" value={years} onChange={(e) => setYears(Number(e.target.value))} className="input" />
        </div>
      </div>

      {total === 100 ? (
        <>
          <p className="text-slate-500">
            Blended assumed annual return: <span className="font-bold text-slate-800">{blendedRate.toFixed(2)}%</span> ·
            Projected value after {years} years: <span className="font-bold text-slate-800">{formatCurrency(final.balance)}</span>
          </p>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={(l) => `Year ${l}`} />
                <Line type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <p className="text-sm text-rose-600">Allocation must total 100% before projecting growth.</p>
      )}
    </Card>
  );
}
