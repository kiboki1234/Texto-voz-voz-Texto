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
              <p className="mt-1 text-base font-semibold opacity-90">{humanSoilNutrientStatus(item.status)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
