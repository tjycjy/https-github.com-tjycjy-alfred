import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { getClient } from '../../db/clients';
import { getHousehold } from '../../db/households';
import { calcAge, formatDate } from '../../lib/age';
import { useAppMode } from '../../state/AppModeContext';
import { Button } from '../../components/ui/Button';
import type { Client, Household } from '../../types';

const TABS = [
  { to: 'basic-info', label: 'Basic Info' },
  { to: 'meetings', label: 'Meeting Log' },
  { to: 'fact-find', label: 'Fact-Find' },
  { to: 'portfolio', label: 'Portfolio' },
  { to: 'household', label: 'Household' },
  { to: 'report', label: 'Report' },
];

export default function ClientProfile() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { mode, setActiveClientId, enterClientMode } = useAppMode();
  const [client, setClient] = useState<Client | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    getClient(clientId).then(async (c) => {
      setClient(c ?? null);
      if (c?.householdId) {
        setHousehold((await getHousehold(c.householdId)) ?? null);
      } else {
        setHousehold(null);
      }
      setLoading(false);
    });
    if (mode === 'advisor') {
      setActiveClientId(clientId);
    }
  }, [clientId, mode, setActiveClientId]);

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (!client || !clientId) {
    return (
      <div className="text-center text-slate-500">
        <p>Client not found.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/clients')}>
          Back to Clients
        </Button>
      </div>
    );
  }

  const isClientMode = mode === 'client';
  const visibleTabs = isClientMode ? TABS.filter((t) => t.to === 'portfolio') : TABS;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {!isClientMode && (
            <button onClick={() => navigate('/clients')} className="mb-1 text-sm font-medium text-indigo-600">
              ← All Clients
            </button>
          )}
          <h1 className="text-2xl font-bold text-slate-800">{client.name}</h1>
          <p className="text-slate-500">
            {calcAge(client.dob) !== null && `Age ${calcAge(client.dob)} · `}
            {client.occupation || 'No occupation set'}
            {household && ` · ${household.name} household`}
          </p>
          <p className="text-sm text-slate-400">Last visit: {formatDate(client.lastVisitDate)}</p>
        </div>
        {!isClientMode && (
          <Button variant="secondary" onClick={() => enterClientMode(client.id)}>
            📱 Enter Client Mode
          </Button>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                isActive ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Outlet context={{ client, setClient, household }} />
    </div>
  );
}
