import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';

const CALCULATORS = [
  { to: 'compound-interest', icon: '📈', label: 'Compound Interest', desc: 'Growth of a lump sum + contributions over time' },
  { to: 'tvm', icon: '⏳', label: 'Time Value of Money', desc: 'Future value of savings with regular contributions' },
  { to: 'roi', icon: '📊', label: 'ROI Calculator', desc: 'Total return and annualized (CAGR) return' },
  { to: 'tax', icon: '🧾', label: 'Income Tax', desc: 'Singapore resident personal income tax' },
  { to: 'cpf', icon: '🏛️', label: 'CPF Contribution', desc: 'OA / SA / MA split by age band' },
  { to: 'salary', icon: '💵', label: 'Salary Calculator', desc: 'Gross-to-net with CPF deduction' },
  { to: 'retirement', icon: '🌴', label: 'Retirement Calculator', desc: 'Target income → required nest egg' },
  { to: 'goal-savings', icon: '🎯', label: 'Goal-Based Savings', desc: 'Target sum + timeframe → monthly contribution' },
  { to: 'premium-financing', icon: '🛡️', label: 'Premium Financing', desc: 'Fund premiums from investment dividend yield' },
];

export default function CalculatorsHome() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Calculators</h1>
        <p className="text-slate-500">Client-facing tools — adjust sliders live during a meeting</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CALCULATORS.map((c) => (
          <Card key={c.to} className="p-5" onClick={() => navigate(`/calculators/${c.to}`)}>
            <div className="mb-2 text-3xl">{c.icon}</div>
            <h3 className="font-bold text-slate-800">{c.label}</h3>
            <p className="text-sm text-slate-500">{c.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
