import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { calcCpfContribution, CPF_RATES_NOTE, DEFAULT_OW_CEILING, CPF_RETIREMENT_SUMS_2026 } from '../../lib/calculators/cpf';
import { formatCurrency } from '../../lib/coverageGap';
import { Card } from '../../components/ui/Card';
import { SliderInput } from '../../components/ui/SliderInput';
import { CalculatorLayout, Field, ResultStat } from './CalculatorLayout';

const ACCOUNT_COLORS = ['#6366f1', '#10b981', '#f59e0b'];

export default function CpfCalc() {
  const [wage, setWage] = useState(5000);
  const [age, setAge] = useState(35);
  const [owCeiling, setOwCeiling] = useState(DEFAULT_OW_CEILING);

  const result = useMemo(() => calcCpfContribution(wage, age, owCeiling), [wage, age, owCeiling]);
  const pieData = [
    { name: 'Ordinary Account', value: result.oaAmount },
    { name: 'Special Account', value: result.saAmount },
    { name: 'Medisave Account', value: result.maAmount },
  ];

  return (
    <CalculatorLayout title="CPF Calculator" description="Monthly CPF contribution split into OA / SA / MA by age band.">
      <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{CPF_RATES_NOTE}</div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="flex flex-col gap-5 p-6">
          <Field label="Monthly gross wage">
            <input type="number" value={wage} onChange={(e) => setWage(Number(e.target.value))} className="input" />
          </Field>
          <SliderInput label="Age" value={age} min={16} max={80} step={1} onChange={setAge} />
          <Field label="Ordinary Wage ceiling" hint="Adjust if CPF Board updates this">
            <input type="number" value={owCeiling} onChange={(e) => setOwCeiling(Number(e.target.value))} className="input" />
          </Field>
          <p className="text-sm text-slate-500">Age band: <span className="font-semibold text-slate-700">{result.band.label}</span></p>
        </Card>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ResultStat label="Employee contribution" value={formatCurrency(result.employeeContribution)} />
            <ResultStat label="Employer contribution" value={formatCurrency(result.employerContribution)} tone="amber" />
            <ResultStat label="Take-home after CPF" value={formatCurrency(result.takeHomeAfterCpf)} tone="emerald" />
          </div>
          <Card className="p-6">
            <h3 className="mb-3 font-bold text-slate-800">Total Contribution: {formatCurrency(result.totalContribution)}/mo</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={ACCOUNT_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl bg-indigo-50 p-4 text-center">
                  <p className="text-sm font-medium text-indigo-600">Ordinary Account</p>
                  <p className="text-xl font-bold text-indigo-700">{formatCurrency(result.oaAmount)}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4 text-center">
                  <p className="text-sm font-medium text-emerald-600">Special Account</p>
                  <p className="text-xl font-bold text-emerald-700">{formatCurrency(result.saAmount)}</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-4 text-center">
                  <p className="text-sm font-medium text-amber-600">Medisave Account</p>
                  <p className="text-xl font-bold text-amber-700">{formatCurrency(result.maAmount)}</p>
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="mb-3 font-bold text-slate-800">2026 Retirement Sum Benchmarks</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-slate-500">Basic (BRS)</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(CPF_RETIREMENT_SUMS_2026.basic)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-500">Full (FRS)</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(CPF_RETIREMENT_SUMS_2026.full)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-500">Enhanced (ERS)</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(CPF_RETIREMENT_SUMS_2026.enhanced)}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              For members turning 55 in 2026. BRS requires a property pledge; ERS is double the FRS.
            </p>
          </Card>
        </div>
      </div>
    </CalculatorLayout>
  );
}
