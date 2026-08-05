export function SliderInput({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-slate-600">{label}</label>
        <span className="text-sm font-bold text-indigo-600">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-3 cursor-pointer"
      />
    </div>
  );
}
