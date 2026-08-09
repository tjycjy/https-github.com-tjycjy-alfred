import { formatDate } from '../../lib/age';

// Two separate problems with native <input type="date">:
//  1) it always renders its visible text in the browser/OS locale (mm/dd/yyyy on US-locale
//     setups) — no cross-browser way to override that.
//  2) on iOS Safari specifically, the control ignores CSS width/min-width and paints at its
//     own fixed minimum width regardless of the box it's given — so even a shrink-to-fit fix
//     (min-w-0) doesn't stop it overflowing into neighboring fields in a tight grid/flex row.
// Fix for both: the native input is positioned absolutely (fully invisible, but still
// tappable) so it's removed from normal layout flow entirely and can never affect the size
// of its container or siblings, no matter how wide it insists on painting itself. A plain
// div — ordinary block-level sizing, no native-control quirks — carries the actual layout
// box and shows our own dd/mm/yyyy text.
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
    <div className={`relative w-full ${className}`}>
      <div className={`input w-full ${disabled ? 'opacity-60' : ''}`}>
        {value ? formatDate(value) : 'dd/mm/yyyy'}
      </div>
      <input
        type="date"
        value={value}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        aria-label="Date"
      />
    </div>
  );
}
