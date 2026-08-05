import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-white shadow-sm border border-slate-200 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-indigo-200 transition' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
