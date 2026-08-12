import { useEffect, useMemo, useState } from 'react';
import { listCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../db/calendarEvents';
import { listClients } from '../db/clients';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { DateInput } from '../components/ui/DateInput';
import { sgHolidayOn } from '../lib/sgHolidays';
import { EVENT_TYPES } from '../types';
import type { CalendarEvent, Client } from '../types';

const TYPE_ICON: Record<string, string> = { Appointment: '🤝', Meeting: '📋', Course: '🎓', Other: '📌' };

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function eventTimeLabel(e: CalendarEvent): string {
  if (!e.time) return 'All day';
  return e.endTime ? `${e.time} – ${e.endTime}` : e.time;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const load = async () => {
    const [e, c] = await Promise.all([listCalendarEvents(), listClients()]);
    setEvents(e);
    setClients(c);
  };

  useEffect(() => {
    load();
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return map;
  }, [events]);

  const monthGrid = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const todayStr = toDateStr(new Date());
  const selectedEvents = (eventsByDate.get(selectedDate) ?? []).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  const selectedHoliday = sgHolidayOn(selectedDate);
  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Calendar</h1>
        <Button onClick={() => setShowAdd(true)}>+ Add Event</Button>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
          >
            ←
          </button>
          <h2 className="font-bold text-slate-800">
            {cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
          >
            →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {monthGrid.map((d, i) => {
            if (!d) return <div key={i} />;
            const dstr = toDateStr(d);
            const dayEvents = eventsByDate.get(dstr) ?? [];
            const holiday = sgHolidayOn(dstr);
            const isToday = dstr === todayStr;
            const isSelected = dstr === selectedDate;
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(dstr)}
                title={holiday?.name}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition ${
                  isSelected
                    ? 'bg-indigo-600 font-bold text-white'
                    : isToday
                      ? 'bg-indigo-50 font-bold text-indigo-600'
                      : holiday
                        ? 'bg-rose-50 font-semibold text-rose-600 hover:bg-rose-100'
                        : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {d.getDate()}
                {dayEvents.length > 0 && (
                  <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 font-bold text-slate-800">
          {selectedDate === todayStr
            ? 'Today'
            : new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h3>
        {selectedHoliday && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-600">
            🇸🇬 {selectedHoliday.name} — Singapore Public Holiday
          </div>
        )}
        {selectedEvents.length === 0 ? (
          <p className="text-slate-400">No events on this day.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {selectedEvents.map((e) => (
              <div
                key={e.id}
                className={`flex items-center gap-3 rounded-xl p-3 ${e.completed ? 'bg-slate-50' : 'bg-slate-50 hover:bg-slate-100'}`}
              >
                <input
                  type="checkbox"
                  checked={e.completed}
                  onChange={async () => {
                    await updateCalendarEvent({ ...e, completed: !e.completed });
                    load();
                  }}
                  className="h-4 w-4 shrink-0 accent-indigo-600"
                  aria-label="Mark complete"
                />
                <button onClick={() => setEditing(e)} className="flex flex-1 cursor-pointer items-start gap-3 text-left">
                  <span className="text-xl">{TYPE_ICON[e.type] ?? '📌'}</span>
                  <div className="flex-1">
                    <p className={`font-medium ${e.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{e.title}</p>
                    <p className="text-sm text-slate-400">
                      {eventTimeLabel(e)} · {e.type}
                      {e.clientId && clientName(e.clientId) && ` · ${clientName(e.clientId)}`}
                    </p>
                    {e.notes && <p className="text-sm text-slate-400">{e.notes}</p>}
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <EventModal
        open={showAdd || !!editing}
        initial={editing}
        defaultDate={selectedDate}
        clients={clients}
        onClose={() => {
          setShowAdd(false);
          setEditing(null);
        }}
        onSaved={() => {
          setShowAdd(false);
          setEditing(null);
          load();
        }}
        onDeleted={() => {
          setEditing(null);
          load();
        }}
      />
    </div>
  );
}

export function EventModal({
  open,
  initial,
  defaultDate,
  clients,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  initial: CalendarEvent | null;
  defaultDate: string;
  clients: Client[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<CalendarEvent['type']>('Appointment');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [clientId, setClientId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setType(initial.type);
      setDate(initial.date);
      setTime(initial.time ?? '');
      setEndTime(initial.endTime ?? '');
      setNotes(initial.notes);
      setClientId(initial.clientId ?? '');
    } else {
      setTitle('');
      setType('Appointment');
      setDate(defaultDate);
      setTime('');
      setEndTime('');
      setNotes('');
      setClientId('');
    }
  }, [initial, defaultDate, open]);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    if (initial) {
      await updateCalendarEvent({
        ...initial,
        title: title.trim(),
        type,
        date,
        time: time || null,
        endTime: endTime || null,
        notes,
        clientId: clientId || null,
      });
    } else {
      await createCalendarEvent({ title: title.trim(), type, date, time: time || null, endTime: endTime || null, notes, clientId: clientId || null });
    }
    setSaving(false);
    onSaved();
  };

  const remove = async () => {
    if (!initial) return;
    await deleteCalendarEvent(initial.id);
    onDeleted();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Event' : 'Add Event'}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            autoFocus
            placeholder="e.g. Meet Mr Tan for FNA review"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as CalendarEvent['type'])} className="input">
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Date</label>
            <DateInput value={date} onChange={setDate} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Start time (optional)</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">End time (optional)</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input" disabled={!time} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Link to client (optional)</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="input">
            <option value="">— None —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input" />
        </div>
        <div className="flex gap-3">
          <Button onClick={submit} disabled={!title.trim() || saving} className="flex-1">
            {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Event'}
          </Button>
          {initial && (
            <Button variant="danger" onClick={remove}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
