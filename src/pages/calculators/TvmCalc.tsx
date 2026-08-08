import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { compoundInterestSeries } from '../../lib/calculators/finance';
import { formatCurrency } from '../../lib/coverageGap';
import { Card } from '../../components/ui/Card';
import { SliderInput } from '../../components/ui/SliderInput';
import { CalculatorLayout, Field, ResultStat } from './CalculatorLayout';

export default function TvmCalc() {
  const [presentValue, setPresentValue] = useState(20000);
  const [monthly, setMonthly] = useState(500);
  const [rate, setRate] = useState(5);
  const [years, setYears] = useState(15);

  const series = useMemo(
    () => compoundInterestSeries(presentValue, rate, years, 'monthly', monthly),
    [presentValue, rate, years, monthly],
  );
  const fv = series[series.length - 1].balance;
  const totalContributed = presentValue + monthly * 12 * years;

  return (
    <CalculatorLayout title="Time Value of Money" description="What will today's savings plan be worth in the future?">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="flex flex-col gap-5 p-6">
          <Field label="Present value (PV)">
            <input type="number" value={presentValue} onChange={(e) => setPresentValue(Number(e.target.value))} className="input" />
          </Field>
          <SliderInput label="Monthly contribution (PMT)" value={monthly} min={0} max={5000} step={50} format={formatCurrency} onChange={setMonthly} />
          <SliderInput label="Expected annual return" value={rate} min={0} max={15} step={0.1} format={(v) => `${v.toFixed(1)}%`} onChange={setRate} />
          <SliderInput label="Number of years (N)" value={years} min={1} max={40} step={1} onChange={setYears} />
        </Card>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ResultStat label="Future value (FV)" value={formatCurrency(fv)} />
            <ResultStat label="Total contributed" value={formatCurrency(totalContributed)} tone="amber" />
            <ResultStat label="Growth" value={formatCurrency(fv - totalContributed)} tone="emerald" />
          </div>
          <Card className="p-6">
            <p className="mb-4 text-slate-500">
              With {formatCurrency(presentValue)} today plus {formatCurrency(monthly)}/month for {years} years at{' '}
              {rate.toFixed(1)}% p.a., the plan is projected to reach <span className="font-bold text-slate-800">{formatCurrency(fv)}</span>.
            </p>
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
