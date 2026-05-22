import type { NpkResponse } from '../api/types';

const statusStyles: Record<string, string> = {
  deficient: 'bg-amber-50 text-amber-800 border-amber-200',
  optimal: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  excess: 'bg-red-50 text-red-800 border-red-200',
  unknown: 'bg-slate-50 text-slate-700 border-slate-200',
};

export function NpkStatus({ data, simple = false }: { data?: NpkResponse; simple?: boolean }) {
  if (!data) return null;
  return (
    <div className="space-y-3">
      {data.warning ? <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{data.warning}</p> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        {(['N', 'P', 'K'] as const).map((key) => {
          const item = data.nutrients[key];
          return (
            <div key={key} className={`rounded-md border p-3 ${statusStyles[item.status] ?? statusStyles.unknown}`}>
              <p className="text-xs font-bold uppercase">{simple ? nutrientName(key) : key}</p>
              <p className="mt-1 text-xl font-bold">{item.value ?? '--'}</p>
              <p className="text-sm">{item.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function nutrientName(key: 'N' | 'P' | 'K') {
  return key === 'N' ? 'Nitrogeno' : key === 'P' ? 'Fosforo' : 'Potasio';
}
