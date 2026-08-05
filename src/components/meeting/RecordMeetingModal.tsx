import { useEffect, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { createMeeting } from '../../db/meetings';
import { createTask } from '../../db/tasks';
import { saveRecording } from '../../db/recordings';
import { getSettings } from '../../db/settings';
import { isSpeechRecognitionSupported, startSpeechRecognition, type SpeechRecognitionController } from '../../lib/speechRecognition';
import { summarizeTranscript, templateSummary } from '../../lib/voiceSummary';
import type { Client } from '../../types';

type Step = 'consent' | 'recording' | 'processing' | 'review';

export function RecordMeetingModal({
  open,
  onClose,
  client,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  client: Client;
  onSaved: () => void;
}) {
  const [step, setStep] = useState<Step>('consent');
  const [consentChecked, setConsentChecked] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [micError, setMicError] = useState<string | null>(null);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [journal, setJournal] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [addAsTask, setAddAsTask] = useState(true);
  const [keepAudio, setKeepAudio] = useState(false);
  const [saving, setSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const speechRef = useRef<SpeechRecognitionController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const speechSupported = isSpeechRecognitionSupported();

  const reset = () => {
    setStep('consent');
    setConsentChecked(false);
    setElapsedSec(0);
    setFinalTranscript('');
    setInterimTranscript('');
    setMicError(null);
    setJournal('');
    setNextStep('');
    setAddAsTask(true);
    setKeepAudio(false);
    audioBlobRef.current = null;
    chunksRef.current = [];
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const cleanupMedia = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    speechRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  useEffect(() => () => cleanupMedia(), []);

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        audioBlobRef.current = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      };
      mediaRecorderRef.current = recorder;
      recorder.start();

      if (speechSupported) {
        speechRef.current = startSpeechRecognition(
          (final, interim) => {
            setFinalTranscript(final);
            setInterimTranscript(interim);
          },
          (err) => setMicError(`Speech recognition: ${err}`),
        );
      }

      setStep('recording');
      timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    } catch {
      setMicError('Could not access microphone. Check browser/site permissions and try again.');
    }
  };

  const stopRecording = async () => {
    // Each stop call is isolated: on iOS Safari, MediaRecorder/SpeechRecognition can throw
    // depending on internal state, and a single uncaught throw here used to leave the UI
    // stuck on the recording screen forever. Every branch below is now allowed to fail
    // independently so the flow always reaches the review step.
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      speechRef.current?.stop();
    } catch {
      // already stopped or unsupported mid-call — safe to ignore
    }
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch {
      // recorder already inactive/errored — audioBlobRef simply stays null
    }
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore — worst case the mic indicator stays on until the tab closes
    }

    setStep('processing');

    const transcript = (finalTranscript + ' ' + interimTranscript).trim();
    let summary;
    try {
      const settings = await getSettings();
      summary = await summarizeTranscript(transcript, {
        url: settings.summaryEndpointUrl,
        apiKey: settings.summaryApiKey,
      });
    } catch {
      summary = templateSummary(transcript);
    }
    setJournal(summary.journal);
    setNextStep(summary.nextStep);
    setStep('review');
  };

  const save = async () => {
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
        dueDate: null,
        sourceMeetingId: meeting.id,
      });
    }
    if (keepAudio && audioBlobRef.current) {
      await saveRecording(meeting.id, client.id, audioBlobRef.current);
    }
    setSaving(false);
    onSaved();
  };

  const formatElapsed = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <Modal open={open} onClose={onClose} title="Record Meeting">
      {step === 'consent' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">PDPA reminder</p>
            <p className="mt-1">
              Please also tell {client.name} out loud that you're recording this meeting for note-taking — ticking the
              box below is not a substitute for informing them verbally.
            </p>
          </div>
          <label className="flex items-start gap-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-1 h-5 w-5"
            />
            I confirm the client has been informed this meeting is being recorded for note-taking purposes.
          </label>
          {!speechSupported && (
            <p className="text-sm text-rose-600">
              Live transcription isn't supported in this browser. Audio will still record; you can type notes manually
              afterward.
            </p>
          )}
          {micError && <p className="text-sm text-rose-600">{micError}</p>}
          <Button onClick={startRecording} disabled={!consentChecked}>
            🎙️ Start Recording
          </Button>
        </div>
      )}

      {step === 'recording' && (
        <div className="flex flex-col items-center gap-5 py-2">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-100">
            <span className="h-8 w-8 animate-pulse rounded-full bg-rose-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatElapsed(elapsedSec)}</p>
          <div className="max-h-40 w-full overflow-y-auto rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            {finalTranscript || interimTranscript ? (
              <>
                {finalTranscript}
                <span className="text-slate-400">{interimTranscript}</span>
              </>
            ) : (
              <span className="text-slate-400">Listening…</span>
            )}
          </div>
          <Button variant="danger" onClick={stopRecording}>⏹ Stop Recording</Button>
        </div>
      )}

      {step === 'processing' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <p className="text-slate-500">Preparing summary…</p>
        </div>
      )}

      {step === 'review' && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Journal entry</label>
            <textarea value={journal} onChange={(e) => setJournal(e.target.value)} rows={7} className="input resize-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Next step</label>
            <input value={nextStep} onChange={(e) => setNextStep(e.target.value)} className="input" placeholder="e.g. Send updated illustration" />
          </div>
          {nextStep.trim() && (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input type="checkbox" checked={addAsTask} onChange={(e) => setAddAsTask(e.target.checked)} />
              Add "Next step" to Task list
            </label>
          )}
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <input type="checkbox" checked={keepAudio} onChange={(e) => setKeepAudio(e.target.checked)} />
            Keep raw audio recording (default: deleted after transcription)
          </label>
          <Button onClick={save} disabled={!journal.trim() || saving}>
            {saving ? 'Saving…' : 'Save Meeting'}
          </Button>
        </div>
      )}
    </Modal>
  );
}
