import { useMemo, useState } from 'react';
import { updateClient } from '../../db/clients';
import { newId } from '../../lib/id';
import { calcAge } from '../../lib/age';
import { calcCpfContribution, CPF_RATES_NOTE, DEFAULT_OW_CEILING } from '../../lib/calculators/cpf';
import { formatCurrency } from '../../lib/coverageGap';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useClientTab } from './ClientTabContext';
import type { EmploymentType, FamilyMember } from '../../types';

const EMPLOYMENT_TYPES: EmploymentType[] = ['Employed', 'Self-Employed', 'Not Working'];

export default function BasicInfoTab() {
  const { client, setClient } = useClientTab();
  const [form, setForm] = useState({
    name: client.name,
    dob: client.dob ?? '',
    occupation: client.occupation,
    employmentType: client.employmentType,
    salary: client.salary ?? '',
    address: client.address,
    notes: client.notes,
  });
  const [family, setFamily] = useState<FamilyMember[]>(client.familyMembers);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const save = async () => {
    setSaving(true);
    const updated = {
      ...client,
      name: form.name,
      dob: form.dob || null,
      occupation: form.occupation,
      employmentType: form.employmentType,
      salary: form.salary === '' ? null : Number(form.salary),
      address: form.address,
      notes: form.notes,
      familyMembers: family,
    };
    await updateClient(updated);
    setClient(updated);
    setSaving(false);
    setSavedAt(Date.now());
  };

  const addFamilyMember = () => {
    setFamily((f) => [...f, { id: newId(), name: '', relationship: 'Spouse', dob: null }]);
  };

  const updateFamilyMember = (id: string, patch: Partial<FamilyMember>) => {
    setFamily((f) => f.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const removeFamilyMember = (id: string) => {
    setFamily((f) => f.filter((m) => m.id !== id));
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Basic Info</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="input"
            />
          </Field>
          <Field label={`Date of birth${form.dob ? ` (age ${calcAge(form.dob)})` : ''}`}>
            <input
              type="date"
              value={form.dob}
              onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
              className="input"
            />
          </Field>
          <Field label="Occupation">
            <input
              value={form.occupation}
              onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))}
              className="input"
            />
          </Field>
          <Field label="Employment type">
            <select
              value={form.employmentType}
              onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value as EmploymentType }))}
              className="input"
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Salary (monthly, SGD)">
            <input
              type="number"
              value={form.salary}
              onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
              className="input"
            />
          </Field>
          <Field label="Address" full>
            <input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="input"
            />
          </Field>
          <Field label="Notes" full>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={4}
              className="input resize-none"
            />
          </Field>
        </div>
      </Card>

      <CpfSummaryCard employmentType={form.employmentType} salary={form.salary} dob={form.dob} />

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Family Members</h2>
          <Button variant="secondary" onClick={addFamilyMember}>+ Add</Button>
        </div>
        {family.length === 0 ? (
          <p className="text-slate-400">No spouse or kids added yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {family.map((member) => (
              <div key={member.id} className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
                <input
                  value={member.name}
                  onChange={(e) => updateFamilyMember(member.id, { name: e.target.value })}
                  placeholder="Name"
                  className="input"
                />
                <select
                  value={member.relationship}
                  onChange={(e) => updateFamilyMember(member.id, { relationship: e.target.value as FamilyMember['relationship'] })}
                  className="input"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="date"
                  value={member.dob ?? ''}
                  onChange={(e) => updateFamilyMember(member.id, { dob: e.target.value || null })}
                  className="input"
                />
                <button
                  onClick={() => removeFamilyMember(member.id)}
                  className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-100"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
        {savedAt && <span className="text-sm text-emerald-600">Saved ✓</span>}
      </div>
    </div>
  );
}

function CpfSummaryCard({
  employmentType,
  salary,
  dob,
}: {
  employmentType: EmploymentType;
  salary: number | string;
  dob: string;
}) {
  const age = calcAge(dob || null);
  const monthlySalary = salary === '' ? 0 : Number(salary);

  const cpf = useMemo(() => {
    if (employmentType !== 'Employed' || age === null || monthlySalary <= 0) return null;
    return calcCpfContribution(monthlySalary, age, DEFAULT_OW_CEILING);
  }, [employmentType, age, monthlySalary]);

  return (
    <Card className="p-6">
      <h2 className="mb-1 text-lg font-bold text-slate-800">CPF & Take-Home</h2>

      {employmentType === 'Employed' && (
        <>
          <p className="mb-4 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{CPF_RATES_NOTE}</p>
          {cpf ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Employee CPF ({cpf.band.label})</p>
                <p className="text-xl font-bold text-slate-800">{formatCurrency(cpf.employeeContribution)}/mo</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Employer CPF</p>
                <p className="text-xl font-bold text-slate-800">{formatCurrency(cpf.employerContribution)}/mo</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-sm text-emerald-600">Take-home pay</p>
                <p className="text-xl font-bold text-emerald-700">{formatCurrency(cpf.takeHomeAfterCpf)}/mo</p>
              </div>
            </div>
          ) : (
            <p className="text-slate-400">Add date of birth and salary above to compute CPF contribution.</p>
          )}
        </>
      )}

      {employmentType === 'Self-Employed' && (
        <p className="text-slate-600">
          Self-employed persons don't have employer/employee CPF contributions. They're required by law to contribute
          to their <span className="font-semibold">Medisave Account</span> based on net trade income (rate varies by
          age and income — see the CPF Board's Self-Employed Scheme for exact figures). OA/SA contributions are
          voluntary.
        </p>
      )}

      {employmentType === 'Not Working' && (
        <p className="text-slate-400">No CPF contribution applies — client is not currently earning income.</p>
      )}
    </Card>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="mb-1 block text-sm font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}
