import { useEffect, useState } from 'react';
import { getPortfolioForClient } from '../../db/portfolios';
import { getHousehold } from '../../db/households';
import { listClients } from '../../db/clients';
import { getSettings } from '../../db/settings';
import { computeGap, formatCurrency, combineCoverage } from '../../lib/coverageGap';
import { COVERAGE_CATEGORIES, COVERAGE_CATEGORY_LABELS } from '../../types';
import { formatDate } from '../../lib/age';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useClientTab } from './ClientTabContext';
import type { AppSettings, Client, CoverageItem, Portfolio } from '../../types';

export default function ReportTab() {
  const { client, household } = useClientTab();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<Client[]>([]);
  const [householdCoverage, setHouseholdCoverage] = useState<CoverageItem[]>([]);
  const [includeHousehold, setIncludeHousehold] = useState(false);
  const [marketInsight, setMarketInsight] = useState(
    'Add your market commentary here — e.g. a summary from your most recent News briefing.',
  );

  useEffect(() => {
    getSettings().then(setSettings);
    getPortfolioForClient(client.id).then(setPortfolio);
    if (client.householdId) {
      getHousehold(client.householdId).then(async (h) => {
        if (!h) return;
        const all = await listClients();
        const members = all.filter((c) => h.memberClientIds.includes(c.id));
        setHouseholdMembers(members);
        const portfolios = await Promise.all(members.map((m) => getPortfolioForClient(m.id)));
        setHouseholdCoverage(combineCoverage(portfolios.flatMap((p) => p.people.map((person) => person.coverage))));
      });
    }
  }, [client.id, client.householdId]);

  if (!settings || !portfolio) return <p className="text-slate-400">Loading…</p>;

  const ownCoverage = combineCoverage(portfolio.people.map((p) => p.coverage));
  const displayCoverage = includeHousehold && householdCoverage.length ? householdCoverage : ownCoverage;
  const totalTarget = displayCoverage.reduce((s, c) => s + c.target, 0);
  const totalInForce = displayCoverage.reduce((s, c) => s + c.inForce, 0);
  const overall = computeGap({ target: totalTarget, inForce: totalInForce });
  const today = formatDate(new Date().toISOString());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Quarterly Report</h2>
          <p className="text-slate-500">Preview below, then export as PDF to send to {client.name}.</p>
        </div>
        <div className="flex items-center gap-3">
          {household && householdMembers.length > 1 && (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input type="checkbox" checked={includeHousehold} onChange={(e) => setIncludeHousehold(e.target.checked)} />
              Include household coverage
            </label>
          )}
          <Button onClick={() => window.print()}>🖨 Print / Export as PDF</Button>
        </div>
      </div>

      <Card className="report-print-area mx-auto w-full max-w-3xl p-10 print:border-0 print:shadow-none">
        <header className="flex items-center justify-between border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-lg font-bold text-indigo-600">
              {settings.photo ? <img src={settings.photo} alt="" className="h-full w-full object-cover" /> : (settings.advisorName?.[0] ?? 'FA')}
            </div>
            <div>
              <p className="font-bold text-slate-800">{settings.advisorName || 'Financial Adviser'}</p>
              <p className="text-sm text-slate-500">
                {settings.registrationNumber ? `Reg. No. ${settings.registrationNumber}` : 'Great Eastern Financial Adviser'}
              </p>
              {settings.contact && <p className="text-sm text-slate-500">{settings.contact}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-slate-800">Quarterly Review</p>
            <p className="text-sm text-slate-500">{today}</p>
          </div>
        </header>

        <section className="mt-6">
          <h3 className="text-lg font-bold text-slate-800">
            Prepared for {client.name}{includeHousehold && householdMembers.length > 1 ? ` & ${household?.name}` : ''}
          </h3>
        </section>

        <section className="mt-6">
          <h4 className="mb-2 font-bold text-slate-700">Portfolio Summary</h4>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left text-slate-500">
                <th className="py-2">Category</th>
                <th className="py-2 text-right">Target</th>
                <th className="py-2 text-right">In Force</th>
                <th className="py-2 text-right">Gap</th>
              </tr>
            </thead>
            <tbody>
              {COVERAGE_CATEGORIES.map((cat) => {
                const item = displayCoverage.find((c) => c.category === cat) ?? { category: cat, target: 0, inForce: 0, notes: '' };
                const gap = computeGap(item);
                return (
                  <tr key={cat} className="border-b border-slate-100">
                    <td className="py-2 text-slate-700">{COVERAGE_CATEGORY_LABELS[cat]}</td>
                    <td className="py-2 text-right text-slate-700">{formatCurrency(item.target)}</td>
                    <td className="py-2 text-right text-slate-700">{formatCurrency(item.inForce)}</td>
                    <td className={`py-2 text-right font-semibold ${gap.gap > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {gap.gap > 0 ? formatCurrency(gap.gap) : 'Met'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="mt-6 rounded-xl bg-slate-50 p-4">
          <h4 className="mb-1 font-bold text-slate-700">Coverage Gap Status</h4>
          <p className="text-slate-600">
            Overall, {formatCurrency(totalInForce)} of {formatCurrency(totalTarget)} target coverage is currently in
            force ({Math.round(overall.ratio * 100)}% covered).
            {overall.gap > 0
              ? ` A combined gap of ${formatCurrency(overall.gap)} remains across all categories.`
              : ' All target coverage levels have been met.'}
          </p>
        </section>

        <section className="mt-6">
          <h4 className="mb-2 font-bold text-slate-700">Market Insight</h4>
          <textarea
            value={marketInsight}
            onChange={(e) => setMarketInsight(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg border border-slate-200 p-2 text-slate-600 print:border-0 print:p-0"
          />
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-400">
          <p>Prepared by {settings.advisorName || 'your Financial Adviser'} · Generated by A.L.F.R.E.D. on {today}</p>
          <p className="mt-1">This report is for general reference only and does not constitute financial advice.</p>
        </footer>
      </Card>
    </div>
  );
}
