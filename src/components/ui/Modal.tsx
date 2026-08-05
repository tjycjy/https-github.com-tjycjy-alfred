import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/40" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
            <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700">
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
