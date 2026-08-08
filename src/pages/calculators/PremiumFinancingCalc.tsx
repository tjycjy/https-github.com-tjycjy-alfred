import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { requiredPrincipalForYield, simulateAccumulation, formatYearsMonths } from '../../lib/calculators/finance';
import { formatCurrency } from '../../lib/coverageGap';
import { Card } from '../../components/ui/Card';
import { SliderInput } from '../../components/ui/SliderInput';
import { CalculatorLayout, Field, ResultStat } from './CalculatorLayout';

export default function PremiumFinancingCalc() {
  const [includeHospital, setIncludeHospital] = useState(true);
  const [hospitalPremium, setHospitalPremium] = useState(1500);

  const [includeAccident, setIncludeAccident] = useState(false);
  const [accidentPremium, setAccidentPremium] = useState(300);
  const [includeLife, setIncludeLife] = useState(false);
  const [lifePremium, setLifePremium] = useState(2000);
  const [includeOther, setIncludeOther] = useState(false);
  const [otherLabel, setOtherLabel] = useState('Other premium');
  const [otherPremium, setOtherPremium] = useState(500);

  const [dividendYield, setDividendYield] = useState(4.5);
  const [initialLumpSum, setInitialLumpSum] = useState(0);
  const [monthlyContribution, setMonthlyContribution] = useState(1000);
  const [accumulationGrowth, setAccumulationGrowth] = useState(4.5);

  const totalAnnualPremium = useMemo(() => {
    let total = 0;
    if (includeHospital) total += hospitalPremium;
    if (includeAccident) total += accidentPremium;
    if (includeLife) total += lifePremium;
    if (includeOther) total += otherPremium;
    return total;
  }, [includeHospital, hospitalPremium, includeAccident, accidentPremium, includeLife, lifePremium, includeOther, otherPremium]);

  const requiredPrincipal = useMemo(
    () => requiredPrincipalForYield(totalAnnualPremium, dividendYield),
    [totalAnnualPremium, dividendYield],
  );

  const { series, monthsToTarget } = useMemo(
    () => simulateAccumulation(initialLumpSum, monthlyContribution, accumulationGrowth, requiredPrincipal),
    [initialLumpSum, monthlyContribution, accumulationGrowth, requiredPrincipal],
  );

  return (
    <CalculatorLayout
      title="Premium Financing Calculator"
      description="Back-solve the principal needed to fund ongoing premiums from investment dividends, and how long to build it up."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 p-6">
            <h3 className="font-bold text-slate-800">Premiums to Cover</h3>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input type="checkbox" checked={includeHospital} onChange={(e) => setIncludeHospital(e.target.checked)} />
              Hospital Plan Premium
            </label>
            {includeHospital && (
              <input
                type="number"
                value={hospitalPremium}
                onChange={(e) => setHospitalPremium(Number(e.target.value))}
                className="input ml-6 w-[calc(100%-1.5rem)]"
                placeholder="Annual premium"
              />
            )}

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input type="checkbox" checked={includeAccident} onChange={(e) => setIncludeAccident(e.target.checked)} />
              Accidental Death Premium
            </label>
            {includeAccident && (
              <input
                type="number"
                value={accidentPremium}
                onChange={(e) => setAccidentPremium(Number(e.target.value))}
                className="input ml-6 w-[calc(100%-1.5rem)]"
                placeholder="Annual premium"
              />
            )}

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input type="checkbox" checked={includeLife} onChange={(e) => setIncludeLife(e.target.checked)} />
              Life (Death) Coverage Premium
            </label>
            {includeLife && (
              <input
                type="number"
                value={lifePremium}
                onChange={(e) => setLifePremium(Number(e.target.value))}
                className="input ml-6 w-[calc(100%-1.5rem)]"
                placeholder="Annual premium"
              />
            )}

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input type="checkbox" checked={includeOther} onChange={(e) => setIncludeOther(e.target.checked)} />
              Other Premium
            </label>
            {includeOther && (
              <div className="ml-6 flex flex-col gap-2">
                <input value={otherLabel} onChange={(e) => setOtherLabel(e.target.value)} className="input" placeholder="Label" />
                <input
                  type="number"
                  value={otherPremium}
                  onChange={(e) => setOtherPremium(Number(e.target.value))}
                  className="input"
                  placeholder="Annual premium"
                />
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-4 p-6">
            <h3 className="font-bold text-slate-800">Investment Assumptions</h3>
            <SliderInput label="Dividend yield" value={dividendYield} min={1} max={10} step={0.1} format={(v) => `${v.toFixed(1)}%`} onChange={setDividendYield} />
            <Field label="Initial lump sum already invested">
              <input type="number" value={initialLumpSum} onChange={(e) => setInitialLumpSum(Number(e.target.value))} className="input" />
            </Field>
            <SliderInput label="Monthly contribution toward target" value={monthlyContribution} min={0} max={10000} step={100} format={formatCurrency} onChange={setMonthlyContribution} />
            <SliderInput label="Accumulation growth / bonus rate" value={accumulationGrowth} min={0} max={10} step={0.1} format={(v) => `${v.toFixed(1)}%`} onChange={setAccumulationGrowth} />
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ResultStat label="Total annual premium need" value={formatCurrency(totalAnnualPremium)} />
            <ResultStat label="Required principal" value={formatCurrency(Math.round(requiredPrincipal))} tone="indigo" />
            <ResultStat label="Time to reach target" value={formatYearsMonths(monthsToTarget)} tone="emerald" />
          </div>
          <Card className="p-6">
            <p className="mb-2 text-sm text-slate-500">
              Investing <span className="font-bold text-slate-800">{formatCurrency(Math.round(requiredPrincipal))}</span> at{' '}
              {dividendYield.toFixed(1)}% dividend yield generates{' '}
              <span className="font-bold text-slate-800">{formatCurrency(totalAnnualPremium)}/year</span> — enough to cover the
              selected premiums indefinitely without touching principal.
            </p>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} label={{ value: 'Year', position: 'insideBottom', offset: -4 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={(l) => `Year ${l}`} />
                  <ReferenceLine y={requiredPrincipal} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'Target', fill: '#f43f5e', fontSize: 12 }} />
                  <Line type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={3} dot={false} name="Projected balance" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </CalculatorLayout>
  );
}
