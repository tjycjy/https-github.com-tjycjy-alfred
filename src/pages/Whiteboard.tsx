import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { pdfjsLib } from '../lib/pdfjs';
import { DrawingCanvas, type DrawingCanvasHandle, type DrawTool } from '../components/whiteboard/DrawingCanvas';
import { PdfPageCanvas } from '../components/whiteboard/PdfPageCanvas';
import { Toolbar } from '../components/whiteboard/Toolbar';
import { StampLayer, type Stamp } from '../components/whiteboard/StampLayer';
import { newId } from '../lib/id';
import { listBrochures, addBrochure, touchBrochure, deleteBrochure } from '../db/brochures';
import { formatDate } from '../lib/age';
import { useTheme } from '../state/ThemeContext';
import type { Brochure } from '../types';

type Mode = 'blank' | 'pdf';

const LIGHT_INK = '#0f172a';
const DARK_INK = '#f8fafc';
const LIGHT_BG = '#ffffff';
const DARK_BG = '#0f172a';

export default function Whiteboard() {
  const { resolvedDark } = useTheme();
  const [mode, setMode] = useState<Mode>('blank');
  const [tool, setTool] = useState<DrawTool>('pen');
  const [color, setColor] = useState(resolvedDark ? DARK_INK : LIGHT_INK);
  const [thickness, setThickness] = useState(4);
  const colorCustomizedRef = useRef(false);

  useEffect(() => {
    if (!colorCustomizedRef.current) {
      setColor(resolvedDark ? DARK_INK : LIGHT_INK);
    }
  }, [resolvedDark]);

  const handleSetColor = (c: string) => {
    colorCustomizedRef.current = true;
    setColor(c);
  };

  const [brochures, setBrochures] = useState<Brochure[]>([]);
  const [showShelf, setShowShelf] = useState(false);
  const [activeBrochure, setActiveBrochure] = useState<Brochure | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfSize, setPdfSize] = useState({ width: 800, height: 1000 });

  const blankCanvasRef = useRef<DrawingCanvasHandle>(null);
  const pdfAnnotationRef = useRef<DrawingCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stamps, setStamps] = useState<Stamp[]>([]);
  const addStamp = (emoji: string) => {
    const count = stamps.length;
    setStamps((prev) => [...prev, { id: newId(), emoji, x: 140 + (count % 5) * 50, y: 120 + Math.floor(count / 5) * 50 }]);
  };
  const moveStamp = (id: string, x: number, y: number) => setStamps((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s)));
  const removeStamp = (id: string) => setStamps((prev) => prev.filter((s) => s.id !== id));

  const loadBrochures = async () => setBrochures(await listBrochures());

  useEffect(() => {
    loadBrochures();
  }, []);

  const openPdfFile = async (file: File) => {
    const brochure = await addBrochure(file.name, file);
    await loadBrochures();
    await openBrochure(brochure);
  };

  const openBrochure = async (brochure: Brochure) => {
    await touchBrochure(brochure.id);
    await loadBrochures();
    const arrayBuffer = await brochure.file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    setPdfDoc(doc);
    setActiveBrochure(brochure);
    setPageNumber(1);
    setMode('pdf');
    setShowShelf(false);
    pdfAnnotationRef.current?.clear();
    setStamps([]);
  };

  const clear = () => {
    if (mode === 'blank') blankCanvasRef.current?.clear();
    else pdfAnnotationRef.current?.clear();
    setStamps([]);
  };

  const exportPng = () => {
    let dataUrl: string;
    if (mode === 'blank') {
      dataUrl = blankCanvasRef.current?.exportPng() ?? '';
    } else {
      dataUrl = pdfAnnotationRef.current?.exportPng() ?? '';
    }
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div
      className="flex flex-col"
      style={{ height: 'calc(100dvh - 3.75rem - 4.5rem - env(safe-area-inset-bottom))' }}
    >
      <Toolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={handleSetColor}
        thickness={thickness}
        setThickness={setThickness}
        onClear={clear}
        onExport={exportPng}
        onAddStamp={addStamp}
        extra={
          <>
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => setMode('blank')}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${mode === 'blank' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              >
                Blank Canvas
              </button>
              <button
                onClick={() => setMode('pdf')}
                disabled={!pdfDoc}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-40 ${mode === 'pdf' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              >
                PDF Annotate
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && openPdfFile(e.target.files[0])}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
            >
              📄 Open PDF
            </button>
            <button
              onClick={() => setShowShelf((s) => !s)}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
            >
              🗂 Recent ({brochures.length})
            </button>
          </>
        }
      />

      {showShelf && (
        <div className="flex gap-3 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-3">
          {brochures.length === 0 ? (
            <p className="text-sm text-slate-400">No brochures uploaded yet.</p>
          ) : (
            brochures.map((b) => (
              <div
                key={b.id}
                className="flex min-w-[160px] flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 hover:border-indigo-300 cursor-pointer"
                onClick={() => openBrochure(b)}
              >
                <p className="truncate text-sm font-semibold text-slate-700">{b.name}</p>
                <p className="text-xs text-slate-400">Opened {formatDate(b.lastOpenedAt)}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBrochure(b.id).then(loadBrochures);
                  }}
                  className="self-start text-xs text-rose-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {mode === 'pdf' && pdfDoc && (
        <div className="flex items-center justify-center gap-4 border-b border-slate-200 bg-white px-4 py-2">
          <button
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-sm font-medium text-slate-500">
            Page {pageNumber} / {pdfDoc.numPages} — {activeBrochure?.name}
          </span>
          <button
            onClick={() => setPageNumber((p) => Math.min(pdfDoc.numPages, p + 1))}
            disabled={pageNumber >= pdfDoc.numPages}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto bg-slate-200">
        {mode === 'blank' ? (
          <div className="relative h-full w-full">
            <DrawingCanvas
              ref={blankCanvasRef}
              color={color}
              thickness={thickness}
              tool={tool}
              bgColor={resolvedDark ? DARK_BG : LIGHT_BG}
            />
            <StampLayer stamps={stamps} onMove={moveStamp} onRemove={removeStamp} />
          </div>
        ) : pdfDoc ? (
          <div className="relative mx-auto my-4" style={{ width: pdfSize.width, height: pdfSize.height }}>
            <PdfPageCanvas pdfDoc={pdfDoc} pageNumber={pageNumber} onSize={setPdfSize} />
            <div className="absolute inset-0">
              <DrawingCanvas ref={pdfAnnotationRef} color={color} thickness={thickness} tool={tool} transparent />
            </div>
            <StampLayer stamps={stamps} onMove={moveStamp} onRemove={removeStamp} />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <p>No PDF loaded.</p>
            <button onClick={() => fileInputRef.current?.click()} className="font-semibold text-indigo-600">
              Open a brochure to annotate →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
