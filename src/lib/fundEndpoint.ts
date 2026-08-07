export interface FundEndpointConfig {
  url: string | null;
  apiKey: string | null;
}

export interface FundQuote {
  nav: number | null;
  return1y: number | null;
  return3y: number | null;
  return5y: number | null;
}

export async function fetchFundQuote(fundName: string, endpoint: FundEndpointConfig): Promise<FundQuote | null> {
  if (!endpoint.url || !fundName.trim()) return null;
  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(endpoint.apiKey ? { Authorization: `Bearer ${endpoint.apiKey}` } : {}),
      },
      body: JSON.stringify({ fundName }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<FundQuote>;
    return {
      nav: typeof data.nav === 'number' ? data.nav : null,
      return1y: typeof data.return1y === 'number' ? data.return1y : null,
      return3y: typeof data.return3y === 'number' ? data.return3y : null,
      return5y: typeof data.return5y === 'number' ? data.return5y : null,
    };
  } catch {
    return null;
  }
}
