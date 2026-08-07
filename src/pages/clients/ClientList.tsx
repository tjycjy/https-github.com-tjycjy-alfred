import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listClients, createClient } from '../../db/clients';
import { getSettings } from '../../db/settings';
import { calcAge, formatDate, monthsSince } from '../../lib/age';
import { censorName, censorPhone } from '../../lib/privacy';
import { useAppMode } from '../../state/AppModeContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { Client } from '../../types';

export default function ClientList() {
  const navigate = useNavigate();
  const { privacyMode } = useAppMode();
  const [clients, setClients] = useState<Client[]>([]);
  const [cadence, setCadence] = useState(6);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = async () => {
    setLoading(true);
    const [list, settings] = await Promise.all([listClients(), getSettings()]);
    setClients(list);
    setCadence(settings.visitCadenceMonths);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q) || c.occupation.toLowerCase().includes(q));
  }, [clients, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clients</h1>
          <p className="text-slate-500">{clients.length} client{clients.length === 1 ? '' : 's'} in your book</p>
        </div>
        <Button onClick={() => setShowNew(true)}>+ New Client</Button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or occupation…"
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-slate-400">No clients yet. Add your first client to get started.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => {
            const months = monthsSince(client.lastVisitDate);
            const overdue = months === null || months >= cadence;
            const dueSoon = !overdue && months !== null && months >= cadence - 1;
            return (
              <Card key={client.id} className="p-5" onClick={() => navigate(`/clients/${client.id}/basic-info`)}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{privacyMode ? censorName(client.name) : client.name}</h3>
                    <p className="text-sm text-slate-500">
                      {client.occupation || 'No occupation set'}
                      {calcAge(client.dob) !== null && ` · Age ${calcAge(client.dob)}`}
                    </p>
                    {client.phone && (
                      <p className="text-sm text-slate-400">{privacyMode ? censorPhone(client.phone) : client.phone}</p>
                    )}
                  </div>
                  {overdue && <Badge tone="red">Overdue</Badge>}
                  {dueSoon && <Badge tone="amber">Due soon</Badge>}
                  {!overdue && !dueSoon && <Badge tone="green">On track</Badge>}
                </div>
                <p className="mt-3 text-sm text-slate-400">
                  Last visit: {client.lastVisitDate ? formatDate(client.lastVisitDate) : 'Never'}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      <NewClientModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={(client) => {
          setShowNew(false);
          navigate(`/clients/${client.id}/basic-info`);
        }}
      />
    </div>
  );
}

function NewClientModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (client: Client) => void;
}) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [occupation, setOccupation] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const client = await createClient({
      name: name.trim(),
      dob: dob || null,
      occupation,
      salary: null,
      address: '',
      notes: '',
    });
    setSaving(false);
    setName('');
    setDob('');
    setOccupation('');
    onCreated(client);
  };

  return (
    <Modal open={open} onClose={onClose} title="New Client">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Date of birth</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Occupation</label>
          <input
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
          />
        </div>
        <Button onClick={submit} disabled={!name.trim() || saving}>
          {saving ? 'Creating…' : 'Create Client'}
        </Button>
      </div>
    </Modal>
  );
}
