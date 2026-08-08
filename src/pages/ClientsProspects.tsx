import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import ClientList from './clients/ClientList';
import Prospects from './Prospects';

export default function ClientsProspects() {
  const location = useLocation();
  const [tab, setTab] = useState<'clients' | 'prospects'>(location.pathname.startsWith('/prospects') ? 'prospects' : 'clients');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        <button
          onClick={() => setTab('clients')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'clients' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          👤 Clients
        </button>
        <button
          onClick={() => setTab('prospects')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'prospects' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          🌱 Prospects
        </button>
      </div>
      {tab === 'clients' ? <ClientList /> : <Prospects />}
    </div>
  );
}
