import { formatDate } from '../../lib/age';

// Native <input type="date"> always renders its visible text in the browser/OS locale
// format (mm/dd/yyyy on most Windows/US-locale setups) — there is no cross-browser way to
// override that from CSS or JS. So we keep the native input (for its picker, keyboard input,
// and validation) but make its own text invisible and draw our own dd/mm/yyyy label on top;
// clicks/typing still hit the real input underneath.
export function DateInput({
  value,
  onChange,
  className = '',
  required,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={`relative min-w-0 w-full ${className}`}>
      <input
        type="date"
        value={value}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="input w-full min-w-0 dark:[&::-webkit-calendar-picker-indicator]:invert disabled:opacity-60"
        style={{ color: 'transparent', caretColor: 'transparent' }}
      />
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-800">
        {value ? formatDate(value) : 'dd/mm/yyyy'}
      </span>
    </div>
  );
}
