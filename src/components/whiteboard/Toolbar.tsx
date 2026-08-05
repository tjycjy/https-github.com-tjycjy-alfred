import type { DrawTool } from './DrawingCanvas';

const COLORS = ['#0f172a', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea'];

export function Toolbar({
  tool,
  setTool,
  color,
  setColor,
  thickness,
  setThickness,
  onClear,
  onExport,
  extra,
}: {
  tool: DrawTool;
  setTool: (t: DrawTool) => void;
  color: string;
  setColor: (c: string) => void;
  thickness: number;
  setThickness: (t: number) => void;
  onClear: () => void;
  onExport: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setTool('pen')}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${tool === 'pen' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
        >
          ✏️ Pen
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${tool === 'eraser' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
        >
          🧹 Eraser
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`h-8 w-8 rounded-full border-2 transition ${color === c && tool === 'pen' ? 'border-slate-800 scale-110' : 'border-white'}`}
            style={{ backgroundColor: c }}
          />
        ))}
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-8 cursor-pointer rounded-full border-0" />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-500">Thickness</span>
        <input
          type="range"
          min={1}
          max={20}
          value={thickness}
          onChange={(e) => setThickness(Number(e.target.value))}
          className="w-28"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {extra}
        <button onClick={onClear} className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-100">
          Clear All
        </button>
        <button onClick={onExport} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
          ⬇ Export PNG
        </button>
      </div>
    </div>
  );
}
