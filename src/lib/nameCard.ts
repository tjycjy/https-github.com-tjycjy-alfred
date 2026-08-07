export interface ShareResult {
  ok: boolean;
  message: string;
}

export async function shareNameCard(namecard: string, advisorName: string, contact: string): Promise<ShareResult> {
  try {
    const res = await fetch(namecard);
    const blob = await res.blob();
    const file = new File([blob], 'namecard.png', { type: blob.type });
    const nav = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean;
      share?: (data: unknown) => Promise<void>;
    };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({
        files: [file],
        title: `${advisorName || 'Financial Adviser'}'s Name Card`,
        text: [advisorName, contact].filter(Boolean).join(' · '),
      });
      return { ok: true, message: '' };
    }
    const a = document.createElement('a');
    a.href = namecard;
    a.download = 'namecard.png';
    a.click();
    return { ok: true, message: 'Sharing isn’t supported on this browser — downloaded instead, so you can attach it manually.' };
  } catch (err) {
    if ((err as Error).name === 'AbortError') return { ok: true, message: '' };
    return { ok: false, message: 'Could not share — try downloading instead.' };
  }
}
