import { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { listFunds, addFund, deleteFund, upsertFundHistory } from '../db/funds';
import { computeFundSnapshot, computeDrawdownSeries, computeMonthlyReturns } from '../lib/fundMetrics';
import { parseBulkFundCsv, parseSingleFundCsv } from '../lib/fundImport';
import type { ParsedFund } from '../lib/fundImport';
import { extractFactsheetText, guessFactsheetFields } from '../lib/fundFactsheet';
import { fetchFundQuote } from '../lib/fundEndpoint';
import { getSettings } from '../db/settings';
import { compoundInterestSeries } from '../lib/calculators/finance';
import { formatCurrency } from '../lib/coverageGap';
import { formatDate } from '../lib/age';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { SliderInput } from '../components/ui/SliderInput';
import type { FundEntry, FundHistoryPoint } from '../types';

const INSURERS = ['Great Eastern', 'AIA', 'Prudential', 'Manulife', 'iFAST', 'Other'];
const RANGE_OPTIONS = ['YTD', '1Y', '3Y', '5Y', '10Y', 'Max'] as const;
type RangeOption = (typeof RANGE_OPTIONS)[number];

function pct(v: number | null, digits = 1): string {
  if (v === null) return '—';
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(digits)}%`;
}
function pctTone(v: number | null): string {
  if (v === null) return 'text-slate-400';
  return v >= 0 ? 'text-emerald-600' : 'text-rose-600';
}

export default function FundTools() {
  const [funds, setFunds] = useState<FundEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState('All');

  const load = async () => {
    setLoading(true);
    const list = await listFunds();
    setFunds(list);
    setSelectedId((current) => (current && list.some((f) => f.id === current) ? current : (list[0]?.id ?? null)));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const classes = useMemo(() => {
    const set = new Set(funds.map((f) => (f.assetClass || 'Other').split(' ')[0]));
    return ['All', ...Array.from(set).sort()];
  }, [funds]);

  const filtered = useMemo(() => {
    if (classFilter === 'All') return funds;
    return funds.filter((f) => (f.assetClass || 'Other').split(' ')[0] === classFilter);
  }, [funds, classFilter]);

  const selected = funds.find((f) => f.id === selectedId) ?? null;

  const latestAsOf = useMemo(() => {
    const dates = funds.map((f) => f.history[f.history.length - 1]?.date).filter((d): d is string => !!d);
    return dates.length === 0 ? null : dates.sort().slice(-1)[0];
  }, [funds]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fund Tools</h1>
          <p className="text-slate-500">
            Track NAV history, returns, volatility and drawdown for your clients' insurer-linked funds.
            {latestAsOf && ` Data as of ${formatDate(latestAsOf)}.`}
          </p>
        </div>
        <Button onClick={() => setShowImport(true)}>+ Import Data</Button>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {classes.map((c) => (
            <button
              key={c}
              onClick={() => setClassFilter(c)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${classFilter === c ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {c}
            </button>
          ))}
        </div>
        {loading ? (
          <p className="text-slate-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-slate-400">No funds yet. Import your fund data to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2">Fund</th>
                  <th className="py-2">Class</th>
                  <th className="py-2 text-right">NAV</th>
                  <th className="py-2 text-right">Daily</th>
                  <th className="py-2 text-right">1M</th>
                  <th className="py-2 text-right">YTD</th>
                  <th className="py-2 text-right">1Y Ann.</th>
                  <th className="py-2 text-right">5Y Ann.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => {
                  const snap = computeFundSnapshot(f.history);
                  const nav = snap.latestNav ?? f.nav;
                  const r1y = snap.r1y ?? (f.return1y !== null ? f.return1y / 100 : null);
                  const r5y = snap.r5y ?? (f.return5y !== null ? f.return5y / 100 : null);
                  return (
                    <tr
                      key={f.id}
                      onClick={() => setSelectedId(f.id)}
                      className={`cursor-pointer border-b border-slate-100 hover:bg-slate-50 ${selectedId === f.id ? 'bg-indigo-50' : ''}`}
                    >
                      <td className="py-2 font-medium text-slate-700">{f.name}</td>
                      <td className="py-2 text-slate-500">{f.assetClass || '—'}</td>
                      <td className="py-2 text-right text-slate-600">{nav !== null ? nav.toFixed(3) : '—'}</td>
                      <td className={`py-2 text-right font-medium ${pctTone(snap.dailyReturn)}`}>{pct(snap.dailyReturn, 2)}</td>
                      <td className={`py-2 text-right font-medium ${pctTone(snap.r1m)}`}>{pct(snap.r1m)}</td>
                      <td className={`py-2 text-right font-medium ${pctTone(snap.ytd)}`}>{pct(snap.ytd)}</td>
                      <td className={`py-2 text-right font-medium ${pctTone(r1y)}`}>{pct(r1y)}</td>
                      <td className={`py-2 text-right font-medium ${pctTone(r5y)}`}>{pct(r5y)}</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFund(f.id).then(load);
                          }}
                          className="text-slate-300 hover:text-rose-500"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && <FundDetail fund={selected} />}

      <AllocationSimulator funds={funds} />

      <ImportModal open={showImport} onClose={() => setShowImport(false)} onSaved={async () => { setShowImport(false); await load(); }} />
    </div>
  );
}

function StatTile({ label, value, tone, sub }: { label: string; value: string; tone?: number | null; sub?: string }) {
  const toneClass = tone === undefined ? 'text-slate-800' : pctTone(tone);
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-lg font-bold ${toneClass}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function FundDetail({ fund }: { fund: FundEntry }) {
  const [range, setRange] = useState<RangeOption>('1Y');
  const snap = useMemo(() => computeFundSnapshot(fund.history), [fund.history]);
  const drawdownSeries = useMemo(() => computeDrawdownSeries(fund.history), [fund.history]);
  const monthlyRows = useMemo(() => computeMonthlyReturns(fund.history), [fund.history]);

  const cutoffDate = useMemo(() => {
    if (!snap.latestDate) return null;
    const latest = new Date(snap.latestDate);
    switch (range) {
      case 'YTD':
        return new Date(latest.getFullYear(), 0, 1);
      case '1Y':
        return new Date(latest.getFullYear() - 1, latest.getMonth(), latest.getDate());
      case '3Y':
        return new Date(latest.getFullYear() - 3, latest.getMonth(), latest.getDate());
      case '5Y':
        return new Date(latest.getFullYear() - 5, latest.getMonth(), latest.getDate());
      case '10Y':
        return new Date(latest.getFullYear() - 10, latest.getMonth(), latest.getDate());
      default:
        return null;
    }
  }, [range, snap.latestDate]);

  const chartData = useMemo(() => {
    const points = cutoffDate ? fund.history.filter((p) => new Date(p.date) >= cutoffDate) : fund.history;
    return points.map((p) => ({ date: p.date, nav: p.nav }));
  }, [fund.history, cutoffDate]);

  const drawdownData = useMemo(() => {
    const points = cutoffDate ? drawdownSeries.filter((p) => new Date(p.date) >= cutoffDate) : drawdownSeries;
    return points.map((p) => ({ date: p.date, drawdown: p.drawdown * 100 }));
  }, [drawdownSeries, cutoffDate]);

  if (fund.history.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-800">{fund.name}</h2>
        <p className="mt-1 text-sm text-slate-500">{fund.assetClass}</p>
        <p className="mt-4 text-slate-400">
          No price history imported for this fund yet — showing quick-entry values only. Import a CSV of dates + NAVs
          to unlock charts, volatility and drawdown stats.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="NAV" value={fund.nav !== null ? fund.nav.toFixed(4) : '—'} />
          <StatTile label="1Y" value={fund.return1y !== null ? `${fund.return1y}%` : '—'} tone={fund.return1y} />
          <StatTile label="3Y Ann." value={fund.return3y !== null ? `${fund.return3y}%` : '—'} tone={fund.return3y} />
          <StatTile label="5Y Ann." value={fund.return5y !== null ? `${fund.return5y}%` : '—'} tone={fund.return5y} />
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5 p-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">{fund.name}</h2>
        <p className="text-sm text-slate-500">
          {fund.assetClass} · {fund.insurer}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <StatTile label="Latest NAV" value={snap.latestNav?.toFixed(4) ?? '—'} sub={snap.latestDate ? formatDate(snap.latestDate) : ''} />
        <StatTile label="Daily" value={pct(snap.dailyReturn, 2)} tone={snap.dailyReturn} />
        <StatTile label="YTD" value={pct(snap.ytd)} tone={snap.ytd} />
        <StatTile label="1 Week" value={pct(snap.r1w)} tone={snap.r1w} />
        <StatTile label="1 Month" value={pct(snap.r1m)} tone={snap.r1m} />
        <StatTile label="3 Months" value={pct(snap.r3m)} tone={snap.r3m} />
        <StatTile label="6 Months" value={pct(snap.r6m)} tone={snap.r6m} />
        <StatTile label="1Y Ann." value={pct(snap.r1y)} tone={snap.r1y} />
        <StatTile label="3Y Ann." value={pct(snap.r3y)} tone={snap.r3y} />
        <StatTile label="5Y Ann." value={pct(snap.r5y)} tone={snap.r5y} />
        <StatTile label="10Y Ann." value={pct(snap.r10y)} tone={snap.r10y} />
        <StatTile label="Volatility" value={snap.volatility !== null ? `${(snap.volatility * 100).toFixed(1)}%` : '—'} sub="annualized" />
        <StatTile
          label="Max Drawdown"
          value={pct(snap.maxDrawdown)}
          tone={snap.maxDrawdown}
          sub={snap.maxDrawdownDate ? formatDate(snap.maxDrawdownDate) : ''}
        />
        <StatTile label="Current Drawdown" value={pct(snap.currentDrawdown)} tone={snap.currentDrawdown} />
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-600">NAV — {fund.name}</p>
          <div className="flex flex-wrap gap-1">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded px-2 py-1 text-xs font-semibold ${range === r ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => String(d).slice(0, 4)} minTickGap={40} />
              <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip formatter={(v) => Number(v).toFixed(4)} labelFormatter={(l) => formatDate(String(l))} />
              <Area type="monotone" dataKey="nav" stroke="#6366f1" fill="#c7d2fe" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-600">Drawdown from Peak</p>
        <div style={{ width: '100%', height: 160 }}>
          <ResponsiveContainer>
            <AreaChart data={drawdownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => String(d).slice(0, 4)} minTickGap={40} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={['auto', 0]} />
              <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} labelFormatter={(l) => formatDate(String(l))} />
              <Area type="monotone" dataKey="drawdown" stroke="#f43f5e" fill="#fecdd3" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {monthlyRows.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-600">Monthly Returns Since Inception</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-1 pr-2 text-left">Year</th>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                    <th key={m} className="px-1 py-1 text-right">
                      {m}
                    </th>
                  ))}
                  <th className="py-1 pl-2 text-right">Cal Year</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((row) => (
                  <tr key={row.year} className="border-b border-slate-50">
                    <td className="py-1 pr-2 font-medium text-slate-600">{row.year}</td>
                    {row.months.map((m, i) => (
                      <td key={i} className={`px-1 py-1 text-right ${pctTone(m)}`}>
                        {m === null ? '—' : pct(m)}
                      </td>
                    ))}
                    <td className={`py-1 pl-2 text-right font-semibold ${pctTone(row.yearReturn)}`}>
                      {row.yearReturn === null ? '—' : pct(row.yearReturn)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

function ImportModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [tab, setTab] = useState<'bulk' | 'single' | 'quick'>('bulk');

  return (
    <Modal open={open} onClose={onClose} title="Import Fund Data">
      <div className="mb-4 flex flex-wrap gap-2">
        <TabButton active={tab === 'bulk'} onClick={() => setTab('bulk')}>
          Bulk (multiple funds)
        </TabButton>
        <TabButton active={tab === 'single'} onClick={() => setTab('single')}>
          Single fund history
        </TabButton>
        <TabButton active={tab === 'quick'} onClick={() => setTab('quick')}>
          Quick entry
        </TabButton>
      </div>
      {tab === 'bulk' && <BulkImportForm onSaved={onSaved} />}
      {tab === 'single' && <SingleFundImportForm onSaved={onSaved} />}
      {tab === 'quick' && <QuickEntryForm onSaved={onSaved} />}
    </Modal>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
      {children}
    </button>
  );
}

function BulkImportForm({ onSaved }: { onSaved: () => void }) {
  const [text, setText] = useState('');
  const [insurer, setInsurer] = useState(INSURERS[0]);
  const [preview, setPreview] = useState<{ funds: ParsedFund[]; errors: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runParse = (value: string) => {
    setText(value);
    setPreview(value.trim() ? parseBulkFundCsv(value) : null);
  };

  const handleFile = async (file: File) => {
    runParse(await file.text());
  };

  const save = async () => {
    if (!preview || preview.funds.length === 0) return;
    setSaving(true);
    for (const f of preview.funds) {
      await upsertFundHistory({ name: f.name, insurer, assetClass: f.assetClass, history: f.history });
    }
    setSaving(false);
    setText('');
    setPreview(null);
    onSaved();
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-400">
        Paste or upload a CSV covering multiple funds. Expected columns: <code>fund, class, date, nav</code> — one row per
        fund per date (e.g. exported from your agency portal or a spreadsheet of historical prices you already have
        legitimate access to).
      </p>
      <textarea
        value={text}
        onChange={(e) => runParse(e.target.value)}
        rows={6}
        className="input resize-none font-mono text-xs"
        placeholder={'fund,class,date,nav\nGreatLink Global Equity,Equity US,2026-01-02,2.501\nGreatLink Global Equity,Equity US,2026-01-05,2.513'}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
        📄 Upload CSV File
      </Button>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-600">Insurer (applied to all funds in this import)</label>
        <select value={insurer} onChange={(e) => setInsurer(e.target.value)} className="input">
          {INSURERS.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>

      {preview && (
        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          {preview.funds.length > 0 ? (
            <p className="text-emerald-600">
              Found {preview.funds.length} fund{preview.funds.length === 1 ? '' : 's'},{' '}
              {preview.funds.reduce((s, f) => s + f.history.length, 0)} price points.
            </p>
          ) : (
            <p className="text-rose-600">No valid rows found.</p>
          )}
          {preview.errors.length > 0 && (
            <p className="mt-1 text-xs text-amber-600">{preview.errors.length} row(s) skipped — check date/nav formatting.</p>
          )}
        </div>
      )}

      <Button onClick={save} disabled={!preview || preview.funds.length === 0 || saving}>
        {saving ? 'Importing…' : preview?.funds.length ? `Import ${preview.funds.length} fund(s)` : 'Import Data'}
      </Button>
    </div>
  );
}

function SingleFundImportForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState('');
  const [assetClass, setAssetClass] = useState('');
  const [insurer, setInsurer] = useState(INSURERS[0]);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<{ history: FundHistoryPoint[]; errors: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runParse = (value: string) => {
    setText(value);
    setPreview(value.trim() ? parseSingleFundCsv(value) : null);
  };

  const handleFile = async (file: File) => {
    runParse(await file.text());
    if (!name) setName(file.name.replace(/\.csv$/i, ''));
  };

  const save = async () => {
    if (!name.trim() || !preview || preview.history.length === 0) return;
    setSaving(true);
    await upsertFundHistory({ name: name.trim(), insurer, assetClass: assetClass.trim() || 'Other', history: preview.history });
    setSaving(false);
    setName('');
    setAssetClass('');
    setText('');
    setPreview(null);
    onSaved();
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-400">
        Paste or upload the price history for one fund — two columns, <code>date,nav</code> (a header row is optional).
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Fund name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. GreatLink Global Technology" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Class</label>
          <input value={assetClass} onChange={(e) => setAssetClass(e.target.value)} className="input" placeholder="e.g. Equity US" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Insurer</label>
          <select value={insurer} onChange={(e) => setInsurer(e.target.value)} className="input">
            {INSURERS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => runParse(e.target.value)}
        rows={6}
        className="input resize-none font-mono text-xs"
        placeholder={'date,nav\n2026-01-02,2.501\n2026-01-05,2.513'}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
        📄 Upload CSV File
      </Button>

      {preview && (
        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          {preview.history.length > 0 ? (
            <p className="text-emerald-600">
              Found {preview.history.length} price points ({formatDate(preview.history[0].date)} →{' '}
              {formatDate(preview.history[preview.history.length - 1].date)}).
            </p>
          ) : (
            <p className="text-rose-600">No valid rows found.</p>
          )}
          {preview.errors.length > 0 && <p className="mt-1 text-xs text-amber-600">{preview.errors.length} row(s) skipped.</p>}
        </div>
      )}

      <Button onClick={save} disabled={!name.trim() || !preview || preview.history.length === 0 || saving}>
        {saving ? 'Saving…' : 'Save Fund History'}
      </Button>
    </div>
  );
}

function QuickEntryForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState('');
  const [insurer, setInsurer] = useState(INSURERS[0]);
  const [nav, setNav] = useState('');
  const [return1y, setReturn1y] = useState('');
  const [return3y, setReturn3y] = useState('');
  const [return5y, setReturn5y] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [fundEndpointUrl, setFundEndpointUrl] = useState<string | null>(null);
  const [fundApiKey, setFundApiKey] = useState<string | null>(null);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [liveError, setLiveError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setFundEndpointUrl(s.fundEndpointUrl);
      setFundApiKey(s.fundApiKey);
    });
  }, []);

  const fetchLive = async () => {
    if (!name.trim()) return;
    setFetchingLive(true);
    setLiveError('');
    const quote = await fetchFundQuote(name, { url: fundEndpointUrl, apiKey: fundApiKey });
    if (quote) {
      if (quote.nav !== null) setNav(String(quote.nav));
      if (quote.return1y !== null) setReturn1y(String(quote.return1y));
      if (quote.return3y !== null) setReturn3y(String(quote.return3y));
      if (quote.return5y !== null) setReturn5y(String(quote.return5y));
    } else {
      setLiveError('Your endpoint did not return usable data for this fund name.');
    }
    setFetchingLive(false);
  };

  const applyGuess = (text: string) => {
    const guess = guessFactsheetFields(text);
    if (guess.nav !== null) setNav(String(guess.nav));
    if (guess.return1y !== null) setReturn1y(String(guess.return1y));
    if (guess.return3y !== null) setReturn3y(String(guess.return3y));
    if (guess.return5y !== null) setReturn5y(String(guess.return5y));
  };

  const extractFromPaste = () => {
    if (!pasteText.trim()) return;
    applyGuess(pasteText);
  };

  const handleFile = async (file: File) => {
    setExtracting(true);
    setFileName(file.name);
    try {
      const text = await extractFactsheetText(file);
      applyGuess(text);
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
      insurer,
      assetClass: 'Other',
      nav: nav ? Number(nav) : null,
      return1y: return1y ? Number(return1y) : null,
      return3y: return3y ? Number(return3y) : null,
      return5y: return5y ? Number(return5y) : null,
      history: [],
      sourceFileName: fileName,
    });
    setSaving(false);
    setName('');
    setNav('');
    setReturn1y('');
    setReturn3y('');
    setReturn5y('');
    setFileName(null);
    setPasteText('');
    onSaved();
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-400">
        For a one-off, no-history entry — good for a quick number without the full chart. Paste a Morningstar summary or
        upload a factsheet PDF to auto-fill, or just type the numbers.
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-600">Paste from Morningstar (or any factsheet text)</label>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={4}
          className="input resize-none"
          placeholder="Paste the copied fund quote / factsheet text here…"
        />
        <Button variant="secondary" className="mt-2" onClick={extractFromPaste} disabled={!pasteText.trim()}>
          🔍 Extract NAV & Returns
        </Button>
      </div>

      <details className="text-sm text-slate-500">
        <summary className="cursor-pointer font-medium text-slate-600">Or upload a factsheet PDF instead</summary>
        <div className="mt-2 flex flex-col gap-2">
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
        </div>
      </details>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-600">Insurer</label>
        <select value={insurer} onChange={(e) => setInsurer(e.target.value)} className="input">
          {INSURERS.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-600">Fund name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. GreatLink Global Equity Fund" className="input" />
        {fundEndpointUrl && (
          <div className="mt-2">
            <Button variant="secondary" onClick={fetchLive} disabled={!name.trim() || fetchingLive}>
              {fetchingLive ? 'Fetching…' : '🔄 Fetch live from your endpoint'}
            </Button>
            {liveError && <p className="mt-1 text-xs text-amber-600">{liveError}</p>}
          </div>
        )}
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
      <Button onClick={save} disabled={!name.trim() || saving}>
        {saving ? 'Saving…' : 'Save Fund'}
      </Button>
    </div>
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
      const snap = computeFundSnapshot(fund.history);
      const annualized = snap.r5y ?? snap.r3y ?? snap.r1y;
      const rate = annualized !== null ? annualized * 100 : (fund.return5y ?? fund.return3y ?? fund.return1y ?? 0);
      return sum + rate * (percentages[i] / 100);
    }, 0);
  }, [selectedFunds, percentages, total, count]);

  const series = useMemo(
    () => compoundInterestSeries(lumpSum, blendedRate, years, 'annual', monthly),
    [lumpSum, blendedRate, years, monthly],
  );
  const final = series[series.length - 1];

  if (funds.length < 2) {
    return <Card className="p-6 text-slate-400">Add at least 2 funds to use the allocation simulator.</Card>;
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
                <option key={f.id} value={f.id}>
                  {f.insurer} — {f.name}
                </option>
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
            Blended assumed annual return: <span className="font-bold text-slate-800">{blendedRate.toFixed(2)}%</span> · Projected
            value after {years} years: <span className="font-bold text-slate-800">{formatCurrency(final.balance)}</span>
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
