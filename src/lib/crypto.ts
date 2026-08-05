function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function randomSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return toHex(bytes.buffer);
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}
