import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, CheckCircle2 } from 'lucide-react';
import type { NpkResponse } from '../api/types';
import { humanizeWarning, humanSoilNutrientLabel, humanSoilNutrientStatus } from '../lib/humanizer';

const statusStyles: Record<string, string> = {
  deficient: 'bg-amber-50 text-amber-800 border-amber-300',
  optimal: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  excess: 'bg-red-50 text-red-800 border-red-300',
  unknown: 'bg-slate-50 text-slate-700 border-slate-200',
};

const StatusIcon = ({ status, className }: { status: string; className?: string }) => {
  if (status === 'optimal') return <CheckCircle2 className={className} />;
  if (status === 'deficient') return <ArrowDownCircle className={className} />;
  if (status === 'excess') return <ArrowUpCircle className={className} />;
  return <span className={className}>—</span>;
};

const nutrientRanges = {
  N: { name: 'Nitrógeno', deficient: '< 20 mg/Kg', optimal: '20-40 mg/Kg', excess: '> 40 mg/Kg' },
  P: { name: 'Fósforo', deficient: '< 10 mg/Kg', optimal: '10-30 mg/Kg', excess: '> 30 mg/Kg' },
  K: { name: 'Potasio', deficient: '< 80 mg/Kg', optimal: '80-200 mg/Kg', excess: '> 200 mg/Kg' },
} as const;

export function NpkStatus({ data, simple = false }: { data?: NpkResponse; simple?: boolean }) {
  if (!data) return null;
  const warning = data.warning ? humanizeWarning(data.warning) : null;
  return (
    <div className="space-y-4">
      {warning ? (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-800 shadow-sm">
          <AlertTriangle className="mt-0.5 shrink-0" size={24} />
          <p className="font-medium leading-snug">{warning}</p>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        {(['N', 'P', 'K'] as const).map((key) => {
          const item = data.nutrients[key];
          const style = statusStyles[item.status] ?? statusStyles.unknown;
          return (
            <div key={key} className={`rounded-2xl border-2 p-5 shadow-sm transition-all hover:shadow-md ${style}`}>
              <div className="flex items-center gap-2 text-lg font-bold">
                <StatusIcon status={item.status} className="h-6 w-6" />
                <span>{simple ? humanSoilNutrientLabel(key) : key}</span>
              </div>
              <p className="mt-3 text-3xl font-extrabold tracking-tight">{item.value ?? '--'}</p>
              {!simple ? <p className="mt-1 text-xs font-bold uppercase opacity-75">mg/Kg</p> : null}
              <p className="mt-1 text-base font-semibold opacity-90">{humanSoilNutrientStatus(item.status)}</p>
            </div>
          );
        })}
      </div>
      {!simple ? (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Nutriente</th>
                <th>Valor actual</th>
                <th>Estado</th>
                <th>Deficiente</th>
                <th>Óptimo</th>
                <th>Exceso</th>
              </tr>
            </thead>
            <tbody>
              {(['N', 'P', 'K'] as const).map((key) => {
                const item = data.nutrients[key];
                const ranges = nutrientRanges[key];
                return (
                  <tr key={key} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 font-bold">{ranges.name}</td>
                    <td className="font-semibold">{item.value ?? '--'} mg/Kg</td>
                    <td className="font-semibold">{humanSoilNutrientStatus(item.status)}</td>
                    <td>{ranges.deficient}</td>
                    <td>{ranges.optimal}</td>
                    <td>{ranges.excess}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
