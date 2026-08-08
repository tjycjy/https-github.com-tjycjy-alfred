import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Commission from './Commission';
import Goals from './Goals';

export default function CommissionGoals() {
  const location = useLocation();
  const [tab, setTab] = useState<'commission' | 'goals'>(location.pathname.startsWith('/goals') ? 'goals' : 'commission');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        <button
          onClick={() => setTab('commission')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'commission' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          💰 Commission
        </button>
        <button
          onClick={() => setTab('goals')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'goals' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          🎯 Goals
        </button>
      </div>
      {tab === 'commission' ? <Commission /> : <Goals />}
    </div>
  );
}
