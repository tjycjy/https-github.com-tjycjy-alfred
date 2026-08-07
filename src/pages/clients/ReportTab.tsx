import { useEffect, useState } from 'react';
import { getPortfolioForClient } from '../../db/portfolios';
import { getHousehold } from '../../db/households';
import { listClients } from '../../db/clients';
import { getSettings } from '../../db/settings';
import { getFactFindForClient } from '../../db/factfind';
import { getFinancialProfile } from '../../db/financialProfiles';
import { getBriefing } from '../../db/news';
import { parseHeadlines, type FeedHeadline } from '../../lib/newsFeeds';
import { computeGap, formatCurrency, combineCoverage } from '../../lib/coverageGap';
import { COVERAGE_CATEGORIES, COVERAGE_CATEGORY_LABELS } from '../../types';
import { formatDate, calcAge } from '../../lib/age';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useClientTab } from './ClientTabContext';
import type { AppSettings, Client, CoverageItem, Portfolio, FactFind, FinancialProfile, InvestmentHolding } from '../../types';

const STOPWORDS = new Set(['fund', 'global', 'growth', 'income', 'plus', 'plan', 'series', 'advantage']);

function matchHeadlines(fundName: string, headlines: FeedHeadline[]): FeedHeadline[] {
  const keywords = (fundName.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !STOPWORDS.has(w));
  if (keywords.length === 0) return [];
  return headlines.filter((h) => keywords.some((k) => h.title.toLowerCase().includes(k))).slice(0, 3);
}

export default function ReportTab() {
  const { client, household } = useClientTab();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [factFind, setFactFind] = useState<FactFind | null>(null);
  const [financialProfile, setFinancialProfile] = useState<FinancialProfile | null>(null);
  const [allHeadlines, setAllHeadlines] = useState<FeedHeadline[]>([]);
  const [householdMembers, setHouseholdMembers] = useState<Client[]>([]);
  const [householdCoverage, setHouseholdCoverage] = useState<CoverageItem[]>([]);
  const [includeHousehold, setIncludeHousehold] = useState(false);
  const [advisorNotes, setAdvisorNotes] = useState(
    'Add your own commentary and any recommendations here — e.g. holdings worth discussing given recent news, or adjustments to coverage or contributions.',
  );

  useEffect(() => {
    getSettings().then(setSettings);
    getPortfolioForClient(client.id).then(setPortfolio);
    getFactFindForClient(client.id).then(setFactFind);
    getFinancialProfile(client.id).then(setFinancialProfile);
    getBriefing().then((b) => {
      setAllHeadlines([...parseHeadlines(b.globalNews), ...parseHeadlines(b.sgNews), ...parseHeadlines(b.otherNews)]);
    });
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

  if (!settings || !portfolio || !factFind || !financialProfile) return <p className="text-slate-400">Loading…</p>;

  const ownCoverage = combineCoverage(portfolio.people.map((p) => p.coverage));
  const displayCoverage = includeHousehold && householdCoverage.length ? householdCoverage : ownCoverage;
  const totalTarget = displayCoverage.reduce((s, c) => s + c.target, 0);
  const totalInForce = displayCoverage.reduce((s, c) => s + c.inForce, 0);
  const totalPremium = displayCoverage.reduce((s, c) => s + (c.premium ?? 0), 0);
  const overall = computeGap({ target: totalTarget, inForce: totalInForce });
  const today = formatDate(new Date().toISOString());
  const currentAge = calcAge(client.dob);

  const totalMonthlyIncome = financialProfile.incomeItems.reduce((s, i) => s + i.amount, 0);
  const totalMonthlyExpenses = financialProfile.expenseItems.reduce((s, e) => s + e.amount, 0);
  const monthlySurplus = totalMonthlyIncome - totalMonthlyExpenses;
  const savingsRatePct = totalMonthlyIncome > 0 ? (monthlySurplus / totalMonthlyIncome) * 100 : 0;
  const totalCpf = financialProfile.cpfOA + financialProfile.cpfSA + financialProfile.cpfMA + financialProfile.cpfRA;
  const totalOtherAssets = financialProfile.assets.reduce((s, a) => s + a.amount, 0);
  const totalInvestments = financialProfile.investments.reduce((s, h) => s + h.currentValue, 0);
  const totalLiabilities = factFind.liabilities.reduce((s, l) => s + (l.amount || 0), 0);
  const netWorth = totalCpf + totalOtherAssets + totalInvestments - totalLiabilities;
  const cashAssets = financialProfile.assets.filter((a) => a.category === 'Cash').reduce((s, a) => s + a.amount, 0);
  const emergencyFundMonths = totalMonthlyExpenses > 0 ? cashAssets / totalMonthlyExpenses : 0;

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
        {/* Page 1 — Cover + Client Snapshot + Financial Health */}
        <section className="print:break-after-page">
          <header className="flex items-center justify-between border-b border-slate-200 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-lg font-bold text-indigo-600">
                {settings.photo ? <img src={settings.photo} alt="" className="h-full w-full object-cover" /> : (settings.advisorName?.[0] ?? 'FA')}
              </div>
              <div>
                <p className="font-bold text-slate-800">{settings.advisorName || 'Financial Adviser'}</p>
                <p className="text-sm text-slate-500">
                  {[settings.companyName, settings.agencyName].filter(Boolean).join(' · ') || 'Financial Adviser'}
                </p>
                {settings.registrationNumber && <p className="text-sm text-slate-500">Reg. No. {settings.registrationNumber}</p>}
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
            <p className="mt-1 text-sm text-slate-500">
              {currentAge !== null && `Age ${currentAge} · `}
              {client.occupation || 'Occupation not set'} · {client.employmentType}
              {factFind.dependants ? ` · ${factFind.dependants} dependant${factFind.dependants === 1 ? '' : 's'}` : ''}
            </p>
          </section>

          <section className="mt-8">
            <h4 className="mb-3 font-bold text-slate-700">Financial Health Snapshot</h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Savings Rate</p>
                <p className="text-lg font-bold text-slate-800">{totalMonthlyIncome > 0 ? `${savingsRatePct.toFixed(0)}%` : '—'}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Net Worth</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(netWorth)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Emergency Fund</p>
                <p className="text-lg font-bold text-slate-800">{totalMonthlyExpenses > 0 ? `${emergencyFundMonths.toFixed(1)} mo` : '—'}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Insurance Covered</p>
                <p className="text-lg font-bold text-slate-800">{Math.round(overall.ratio * 100)}%</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Figures from Financial Health and Fact-Find as of {today}. See A.L.F.R.E.D. → Financial Health for full detail.
            </p>
          </section>
        </section>

        {/* Page 2 — Insurance Coverage */}
        <section className="mt-6 print:break-after-page">
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
                const item = displayCoverage.find((c) => c.category === cat) ?? { category: cat, target: 0, inForce: 0, premium: 0, notes: '' };
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

          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <h4 className="mb-1 font-bold text-slate-700">Coverage Gap Status</h4>
            <p className="text-slate-600">
              Overall, {formatCurrency(totalInForce)} of {formatCurrency(totalTarget)} target coverage is currently in
              force ({Math.round(overall.ratio * 100)}% covered).
              {overall.gap > 0
                ? ` A combined gap of ${formatCurrency(overall.gap)} remains across all categories.`
                : ' All target coverage levels have been met.'}
            </p>
            {totalPremium > 0 && (
              <p className="mt-2 text-slate-600">
                Total annual premium across this coverage: <span className="font-semibold">{formatCurrency(totalPremium)}</span>.
              </p>
            )}
          </div>
        </section>

        {/* Page 3 — Retirement & Savings Goals */}
        <section className="mt-6 print:break-after-page">
          <h4 className="mb-2 font-bold text-slate-700">Retirement Goal</h4>
          {factFind.retirementGoal.desiredMonthlyIncome ? (
            <p className="text-sm text-slate-600">
              Targeting {formatCurrency(factFind.retirementGoal.desiredMonthlyIncome)}/month from age{' '}
              {factFind.retirementGoal.startAge ?? '—'} to age {factFind.retirementGoal.endAge ?? '—'}
              {factFind.retirementGoal.adjustForInflation ? `, adjusted for ${factFind.retirementGoal.inflationPct}% inflation` : ''}.
            </p>
          ) : (
            <p className="text-sm text-slate-400">No retirement goal set yet — see Fact-Find.</p>
          )}

          <h4 className="mb-2 mt-6 font-bold text-slate-700">Savings Goals</h4>
          {factFind.savingsGoals.length === 0 ? (
            <p className="text-sm text-slate-400">No savings goals set yet — see Fact-Find.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left text-slate-500">
                  <th className="py-2">Goal</th>
                  <th className="py-2 text-right">Target</th>
                  <th className="py-2 text-right">Timeframe</th>
                  <th className="py-2 text-right">Current Savings</th>
                </tr>
              </thead>
              <tbody>
                {factFind.savingsGoals.map((g) => (
                  <tr key={g.id} className="border-b border-slate-100">
                    <td className="py-2 text-slate-700">{g.purpose}</td>
                    <td className="py-2 text-right text-slate-700">{formatCurrency(g.targetAmount)}</td>
                    <td className="py-2 text-right text-slate-700">{g.targetYears} yr</td>
                    <td className="py-2 text-right text-slate-700">{formatCurrency(g.currentSavings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Page 4 — Investments */}
        <section className="mt-6 print:break-after-page">
          <h4 className="mb-2 font-bold text-slate-700">Investment Holdings</h4>
          {financialProfile.investments.length === 0 ? (
            <p className="text-sm text-slate-400">No investment holdings recorded yet — see Financial Health → Investments.</p>
          ) : (
            <>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-300 text-left text-slate-500">
                    <th className="py-2">Holding</th>
                    <th className="py-2 text-right">Invested</th>
                    <th className="py-2 text-right">Current Value</th>
                    <th className="py-2 text-right">Gain / Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {financialProfile.investments.map((h: InvestmentHolding) => {
                    const gainPct = h.investedAmount > 0 ? ((h.currentValue - h.investedAmount) / h.investedAmount) * 100 : 0;
                    return (
                      <tr key={h.id} className="border-b border-slate-100">
                        <td className="py-2 text-slate-700">{h.fundName || 'Unnamed holding'}</td>
                        <td className="py-2 text-right text-slate-700">{formatCurrency(h.investedAmount)}</td>
                        <td className="py-2 text-right text-slate-700">{formatCurrency(h.currentValue)}</td>
                        <td className={`py-2 text-right font-semibold ${gainPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 text-right text-sm font-semibold text-slate-600">
                Total: {formatCurrency(totalInvestments)} current value
              </p>

              <div className="mt-6">
                <h4 className="mb-2 font-bold text-slate-700">Related Headlines</h4>
                <p className="mb-3 text-xs text-slate-400">
                  Auto-matched from the News briefing by keyword — for context only, not a recommendation. Review and add
                  your own view in Advisor Notes below.
                </p>
                {financialProfile.investments.map((h) => {
                  const matches = matchHeadlines(h.fundName, allHeadlines);
                  if (!h.fundName) return null;
                  return (
                    <div key={h.id} className="mb-3">
                      <p className="text-sm font-semibold text-slate-700">{h.fundName}</p>
                      {matches.length === 0 ? (
                        <p className="text-xs text-slate-400">No related headlines this quarter.</p>
                      ) : (
                        <ul className="ml-4 list-disc text-xs text-slate-500">
                          {matches.map((m, i) => <li key={i}>{m.title}</li>)}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* Page 5 — Advisor Notes */}
        <section className="mt-6">
          <h4 className="mb-2 font-bold text-slate-700">Advisor Notes & Recommendations</h4>
          <p className="mb-2 text-xs text-slate-400 print:hidden">
            Written by {settings.advisorName || 'your'} own analysis — A.L.F.R.E.D. does not generate investment
            recommendations.
          </p>
          <textarea
            value={advisorNotes}
            onChange={(e) => setAdvisorNotes(e.target.value)}
            rows={6}
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
