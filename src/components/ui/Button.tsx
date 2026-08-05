import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    />
  );
}
