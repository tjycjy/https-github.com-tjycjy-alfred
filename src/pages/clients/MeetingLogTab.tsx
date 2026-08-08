import { useEffect, useState } from 'react';
import { listMeetingsForClient, createMeeting } from '../../db/meetings';
import { createTask } from '../../db/tasks';
import { getClient } from '../../db/clients';
import { formatDate } from '../../lib/age';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DateInput } from '../../components/ui/DateInput';
import { RecordMeetingModal } from '../../components/meeting/RecordMeetingModal';
import { useClientTab } from './ClientTabContext';
import type { Client, MeetingLogEntry } from '../../types';

export default function MeetingLogTab() {
  const { client, setClient } = useClientTab();
  const [meetings, setMeetings] = useState<MeetingLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [showRecord, setShowRecord] = useState(false);

  const load = async () => {
    setLoading(true);
    setMeetings(await listMeetingsForClient(client.id));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Meeting Log</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowRecord(true)}>🎙️ Record Meeting</Button>
          <Button onClick={() => setShowNew(true)}>+ New Meeting</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : meetings.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">No meetings logged yet.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {meetings.map((m) => (
            <Card key={m.id} className="p-5">
              <p className="text-sm font-semibold text-indigo-600">{formatDate(m.date)}</p>
              <p className="mt-2 whitespace-pre-wrap text-slate-700">{m.journal}</p>
              {m.nextStep && (
                <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <span className="font-semibold">Next step: </span>
                  {m.nextStep}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <NewMeetingModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={async (updatedClient) => {
          setShowNew(false);
          if (updatedClient) setClient(updatedClient);
          await load();
        }}
      />
      <RecordMeetingModal
        open={showRecord}
        onClose={() => setShowRecord(false)}
        client={client}
        onSaved={async () => {
          setShowRecord(false);
          const refreshedClient = await getClient(client.id);
          if (refreshedClient) setClient(refreshedClient);
          await load();
        }}
      />
    </div>
  );
}

function NewMeetingModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (client: Client | null) => void;
}) {
  const { client } = useClientTab();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [journal, setJournal] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [addAsTask, setAddAsTask] = useState(true);
  const [taskDueDate, setTaskDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!journal.trim()) return;
    setSaving(true);
    const meeting = await createMeeting({
      clientId: client.id,
      date: new Date(date).toISOString(),
      journal: journal.trim(),
      nextStep: nextStep.trim(),
    });
    if (addAsTask && nextStep.trim()) {
      await createTask({
        clientId: client.id,
        description: nextStep.trim(),
        dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : null,
        sourceMeetingId: meeting.id,
      });
    }
    setSaving(false);
    setJournal('');
    setNextStep('');
    setTaskDueDate('');
    const refreshedClient = await getClient(client.id);
    onCreated(refreshedClient ?? null);
  };

  return (
    <Modal open={open} onClose={onClose} title="New Meeting">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Date</label>
          <DateInput value={date} onChange={setDate} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Journal entry</label>
          <textarea
            value={journal}
            onChange={(e) => setJournal(e.target.value)}
            rows={5}
            className="input resize-none"
            placeholder="What was discussed…"
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Next step</label>
          <input
            value={nextStep}
            onChange={(e) => setNextStep(e.target.value)}
            className="input"
            placeholder="e.g. Send updated illustration"
          />
        </div>
        {nextStep.trim() && (
          <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input type="checkbox" checked={addAsTask} onChange={(e) => setAddAsTask(e.target.checked)} />
              Add "Next step" to Task list
            </label>
            {addAsTask && <DateInput value={taskDueDate} onChange={setTaskDueDate} />}
          </div>
        )}
        <Button onClick={submit} disabled={!journal.trim() || saving}>
          {saving ? 'Saving…' : 'Save Meeting'}
        </Button>
      </div>
    </Modal>
  );
}
