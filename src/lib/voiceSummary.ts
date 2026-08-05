export interface MeetingSummary {
  journal: string;
  nextStep: string;
}

export function templateSummary(transcript: string): MeetingSummary {
  const cleaned = transcript.trim();
  if (!cleaned) {
    return { journal: '', nextStep: '' };
  }
  const journal = `[Auto-transcribed from voice recording — please review and edit]\n\n${cleaned}`;
  return { journal, nextStep: '' };
}

export interface SummaryEndpointConfig {
  url: string | null;
  apiKey: string | null;
}

export async function summarizeTranscript(transcript: string, endpoint: SummaryEndpointConfig): Promise<MeetingSummary> {
  const fallback = templateSummary(transcript);
  if (!endpoint.url || !transcript.trim()) return fallback;

  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(endpoint.apiKey ? { Authorization: `Bearer ${endpoint.apiKey}` } : {}),
      },
      body: JSON.stringify({ transcript }),
    });
    if (!response.ok) return fallback;
    const data = (await response.json()) as Partial<MeetingSummary>;
    if (!data.journal) return fallback;
    return { journal: data.journal, nextStep: data.nextStep ?? '' };
  } catch {
    return fallback;
  }
}
