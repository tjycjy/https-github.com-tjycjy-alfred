import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export type DrawTool = 'pen' | 'eraser';

export interface DrawingCanvasHandle {
  clear: () => void;
  exportPng: () => string;
  isBlank: () => boolean;
}

interface Stroke {
  points: { x: number; y: number; pressure: number }[];
  color: string;
  thickness: number;
  tool: DrawTool;
}

interface DrawingCanvasProps {
  color: string;
  thickness: number;
  tool: DrawTool;
  transparent?: boolean;
  bgColor?: string;
  className?: string;
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  ({ color, thickness, tool, transparent = false, bgColor = '#ffffff', className = '' }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const strokesRef = useRef<Stroke[]>([]);
    const activeStrokeRef = useRef<Stroke | null>(null);
    const colorRef = useRef(color);
    const thicknessRef = useRef(thickness);
    const toolRef = useRef(tool);
    const bgColorRef = useRef(bgColor);

    colorRef.current = color;
    thicknessRef.current = thickness;
    toolRef.current = tool;
    bgColorRef.current = bgColor;

    const redraw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!transparent) {
        ctx.fillStyle = bgColorRef.current;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const stroke of strokesRef.current) {
        if (stroke.points.length < 2) continue;
        ctx.strokeStyle = stroke.tool === 'eraser' ? (transparent ? '#000000' : bgColorRef.current) : stroke.color;
        ctx.globalCompositeOperation = stroke.tool === 'eraser' && transparent ? 'destination-out' : 'source-over';
        for (let i = 1; i < stroke.points.length; i++) {
          const p0 = stroke.points[i - 1];
          const p1 = stroke.points[i];
          ctx.lineWidth = stroke.thickness * dpr * (0.5 + p1.pressure);
          ctx.beginPath();
          ctx.moveTo(p0.x * dpr, p0.y * dpr);
          ctx.lineTo(p1.x * dpr, p1.y * dpr);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    useImperativeHandle(ref, () => ({
      clear: () => {
        strokesRef.current = [];
        redraw();
      },
      exportPng: () => canvasRef.current?.toDataURL('image/png') ?? '',
      isBlank: () => strokesRef.current.length === 0,
    }));

    useEffect(() => {
      const resize = () => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        redraw();
      };
      resize();
      window.addEventListener('resize', resize);
      const observer = new ResizeObserver(resize);
      if (containerRef.current) observer.observe(containerRef.current);
      return () => {
        window.removeEventListener('resize', resize);
        observer.disconnect();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      redraw();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bgColor]);

    const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5,
      };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      const stroke: Stroke = {
        points: [getPos(e)],
        color: colorRef.current,
        thickness: thicknessRef.current,
        tool: toolRef.current,
      };
      activeStrokeRef.current = stroke;
      strokesRef.current.push(stroke);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!activeStrokeRef.current) return;
      activeStrokeRef.current.points.push(getPos(e));
      redraw();
    };

    const handlePointerUp = () => {
      activeStrokeRef.current = null;
    };

    return (
      <div ref={containerRef} className={`relative h-full w-full ${className}`}>
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none"
          style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
    );
  },
);

DrawingCanvas.displayName = 'DrawingCanvas';
