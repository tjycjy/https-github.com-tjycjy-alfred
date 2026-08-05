import { useState } from 'react';

export function PinPad({
  onSubmit,
  length = 6,
  error,
}: {
  onSubmit: (pin: string) => void;
  length?: number;
  error?: string | null;
}) {
  const [pin, setPin] = useState('');

  const press = (digit: string) => {
    if (pin.length >= length) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === length) {
      onSubmit(next);
      setPin('');
    }
  };

  const backspace = () => setPin((p) => p.slice(0, -1));

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-3">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full border-2 ${i < pin.length ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}
          />
        ))}
      </div>
      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      <div className="grid grid-cols-3 gap-4">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className="h-16 w-16 rounded-full bg-slate-100 text-2xl font-semibold text-slate-700 hover:bg-slate-200 active:bg-slate-300"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => press('0')}
          className="h-16 w-16 rounded-full bg-slate-100 text-2xl font-semibold text-slate-700 hover:bg-slate-200 active:bg-slate-300"
        >
          0
        </button>
        <button
          onClick={backspace}
          className="h-16 w-16 rounded-full text-xl font-semibold text-slate-500 hover:bg-slate-100"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
