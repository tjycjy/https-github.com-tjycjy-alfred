export interface KnowledgeEndpointConfig {
  url: string | null;
  apiKey: string | null;
}

export async function synthesizeAnswer(
  question: string,
  context: string,
  endpoint: KnowledgeEndpointConfig,
): Promise<string | null> {
  if (!endpoint.url || !question.trim()) return null;
  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(endpoint.apiKey ? { Authorization: `Bearer ${endpoint.apiKey}` } : {}),
      },
      body: JSON.stringify({ question, context }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { answer?: string };
    return typeof data.answer === 'string' && data.answer.trim() ? data.answer : null;
  } catch {
    return null;
  }
}
