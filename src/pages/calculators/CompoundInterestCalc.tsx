import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { compoundInterestSeries, type CompoundingFrequency } from '../../lib/calculators/finance';
import { formatCurrency } from '../../lib/coverageGap';
import { Card } from '../../components/ui/Card';
import { SliderInput } from '../../components/ui/SliderInput';
import { CalculatorLayout, Field, ResultStat } from './CalculatorLayout';

export default function CompoundInterestCalc() {
  const [principal, setPrincipal] = useState(10000);
  const [rate, setRate] = useState(5);
  const [years, setYears] = useState(20);
  const [monthly, setMonthly] = useState(200);
  const [frequency, setFrequency] = useState<CompoundingFrequency>('monthly');

  const series = useMemo(
    () => compoundInterestSeries(principal, rate, years, frequency, monthly),
    [principal, rate, years, frequency, monthly],
  );
  const final = series[series.length - 1];
  const totalInterest = final.balance - final.contributed;

  return (
    <CalculatorLayout title="Compound Interest Calculator" description="Show a client how a lump sum plus regular contributions can grow.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="flex flex-col gap-5 p-6">
          <Field label="Starting principal">
            <input type="number" value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} className="input" />
          </Field>
          <SliderInput label="Annual interest rate" value={rate} min={0} max={15} step={0.1} format={(v) => `${v.toFixed(1)}%`} onChange={setRate} />
          <SliderInput label="Years" value={years} min={1} max={40} step={1} onChange={setYears} />
          <SliderInput label="Monthly contribution" value={monthly} min={0} max={5000} step={50} format={formatCurrency} onChange={setMonthly} />
          <Field label="Compounding frequency">
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as CompoundingFrequency)} className="input">
              <option value="annual">Annual</option>
              <option value="semiAnnual">Semi-annual</option>
              <option value="quarterly">Quarterly</option>
              <option value="monthly">Monthly</option>
            </select>
          </Field>
        </Card>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ResultStat label="Final balance" value={formatCurrency(final.balance)} />
            <ResultStat label="Total contributed" value={formatCurrency(final.contributed)} tone="amber" />
            <ResultStat label="Interest earned" value={formatCurrency(totalInterest)} tone="emerald" />
          </div>
          <Card className="p-6">
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} label={{ value: 'Year', position: 'insideBottom', offset: -4 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={(l) => `Year ${l}`} />
                  <Line type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={3} dot={false} name="Balance" />
                  <Line type="monotone" dataKey="contributed" stroke="#cbd5e1" strokeWidth={2} dot={false} name="Contributed" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </CalculatorLayout>
  );
}
