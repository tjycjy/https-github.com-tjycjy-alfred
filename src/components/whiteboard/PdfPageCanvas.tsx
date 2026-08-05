import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export function PdfPageCanvas({
  pdfDoc,
  pageNumber,
  onSize,
}: {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  onSize?: (size: { width: number; height: number }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let renderTask: ReturnType<import('pdfjs-dist').PDFPageProxy['render']> | null = null;

    const render = async () => {
      setRendering(true);
      const page = await pdfDoc.getPage(pageNumber);
      if (cancelled) return;
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const unscaledViewport = page.getViewport({ scale: 1 });
      const containerWidth = container.clientWidth;
      const scale = containerWidth / unscaledViewport.width;
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * dpr });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;
      onSize?.({ width: viewport.width / dpr, height: viewport.height / dpr });

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderTask = page.render({ canvas, canvasContext: ctx, viewport });
      await renderTask.promise;
      if (!cancelled) setRendering(false);
    };

    render();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, pageNumber]);

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-4xl">
      <canvas ref={canvasRef} className="w-full rounded-lg shadow-md" />
      {rendering && <div className="absolute inset-0 flex items-center justify-center text-slate-400">Rendering…</div>}
    </div>
  );
}
