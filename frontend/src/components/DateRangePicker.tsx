interface DateRangePickerProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

export function DateRangePicker({ from, to, onFromChange, onToChange }: DateRangePickerProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label>
        <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Desde</span>
        <input
          className="focus-ring w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          type="date"
          value={from}
          onInput={(event) => onFromChange(event.currentTarget.value)}
          onChange={(event) => onFromChange(event.target.value)}
        />
      </label>
      <label>
        <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Hasta</span>
        <input
          className="focus-ring w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          type="date"
          value={to}
          onInput={(event) => onToChange(event.currentTarget.value)}
          onChange={(event) => onToChange(event.target.value)}
        />
      </label>
    </div>
  );
}
