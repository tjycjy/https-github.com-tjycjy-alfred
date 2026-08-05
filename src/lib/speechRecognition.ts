export interface SpeechRecognitionController {
  start: () => void;
  stop: () => void;
}

interface MinimalSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: unknown) => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognitionCtor(): (new () => MinimalSpeechRecognition) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => MinimalSpeechRecognition;
    webkitSpeechRecognition?: new () => MinimalSpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

interface SpeechResultEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: { 0: { transcript: string }; isFinal: boolean };
  };
}

export function startSpeechRecognition(
  onTranscriptUpdate: (finalText: string, interimText: string) => void,
  onError?: (message: string) => void,
): SpeechRecognitionController | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;

  let finalTranscript = '';
  let stoppedIntentionally = false;
  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-SG';

  recognition.onresult = (rawEvent: unknown) => {
    const event = rawEvent as SpeechResultEvent;
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += `${result[0].transcript} `;
      } else {
        interim += result[0].transcript;
      }
    }
    onTranscriptUpdate(finalTranscript.trim(), interim.trim());
  };

  recognition.onerror = (rawEvent: unknown) => {
    const event = rawEvent as { error?: string };
    if (event.error && event.error !== 'no-speech') {
      onError?.(event.error);
    }
  };

  recognition.onend = () => {
    if (!stoppedIntentionally) {
      try {
        recognition.start();
      } catch {
        // already running or otherwise unable to restart; ignore
      }
    }
  };

  recognition.start();

  return {
    start: () => {
      stoppedIntentionally = false;
      recognition.start();
    },
    stop: () => {
      stoppedIntentionally = true;
      recognition.stop();
    },
  };
}
