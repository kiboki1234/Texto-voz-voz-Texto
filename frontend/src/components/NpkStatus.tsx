import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, CheckCircle2, Leaf, Sprout } from 'lucide-react';
import type { NpkResponse } from '../api/types';
import { humanizeWarning, humanSoilNutrientLabel, humanSoilNutrientStatus, simpleSoilStatus } from '../lib/humanizer';

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

  if (simple) {
    const { label, message, tone } = simpleSoilStatus(
      data.nutrients.N,
      data.nutrients.P,
      data.nutrients.K,
    );
    const isGreen = tone === 'green';
    return (
      <div className={`rounded-2xl border-2 p-6 shadow-card ${isGreen ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
        {warning ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-800 shadow-sm">
            <AlertTriangle className="mt-0.5 shrink-0" size={24} />
            <p className="font-medium leading-snug">{warning}</p>
          </div>
        ) : null}
        <div className="flex items-start gap-5">
          <div className={`shrink-0 rounded-2xl p-4 ${isGreen ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {isGreen ? <Sprout className="text-emerald-800" size={40} /> : <Leaf className="text-amber-800" size={40} />}
          </div>
          <div>
            <p className={`text-3xl font-black ${isGreen ? 'text-emerald-900' : 'text-amber-900'}`}>{label}</p>
            <p className={`mt-2 text-xl leading-snug ${isGreen ? 'text-emerald-800' : 'text-amber-800'}`}>{message}</p>
          </div>
        </div>
      </div>
    );
  }

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
                <span>{humanSoilNutrientLabel(key)}</span>
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
