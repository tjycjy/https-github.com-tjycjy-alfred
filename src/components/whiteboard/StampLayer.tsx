import { useRef } from 'react';

export interface Stamp {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

export const STAMP_OPTIONS: { emoji: string; label: string }[] = [
  { emoji: '🧑', label: 'Person' },
  { emoji: '👤', label: 'Person outline' },
  { emoji: '⭐', label: 'Star' },
  { emoji: '⬤', label: 'Circle' },
  { emoji: '▲', label: 'Triangle' },
  { emoji: '⬛', label: 'Square' },
  { emoji: '💬', label: 'Speech bubble' },
  { emoji: '🏠', label: 'House' },
];

const STAMP_SIZE = 44;

// Freehand strokes are baked directly into the canvas as pixels, but stamps (a person icon to
// stand in for "this is you", shapes to point at, etc.) need to stay movable after they're
// placed — so they live as a separate layer of absolutely-positioned, draggable elements on top
// of the canvas rather than as canvas pixels.
export function StampLayer({
  stamps,
  onMove,
  onRemove,
}: {
  stamps: Stamp[];
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, stamp: Stamp) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    (e.target as HTMLDivElement).setPointerCapture(e.pointerId);
    draggingRef.current = {
      id: stamp.id,
      dx: e.clientX - rect.left - stamp.x,
      dy: e.clientY - rect.top - stamp.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const dragging = draggingRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!dragging || !rect) return;
    onMove(dragging.id, e.clientX - rect.left - dragging.dx, e.clientY - rect.top - dragging.dy);
  };

  const handlePointerUp = () => {
    draggingRef.current = null;
  };

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0">
      {stamps.map((s) => (
        <div
          key={s.id}
          onPointerDown={(e) => handlePointerDown(e, s)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="pointer-events-auto absolute flex cursor-grab touch-none items-center justify-center select-none active:cursor-grabbing"
          style={{ left: s.x - STAMP_SIZE / 2, top: s.y - STAMP_SIZE / 2, width: STAMP_SIZE, height: STAMP_SIZE, fontSize: STAMP_SIZE * 0.7 }}
        >
          {s.emoji}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onRemove(s.id)}
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
