import { CheckCircle2, XCircle } from 'lucide-react';
import type { SprayWindow } from '../api/types';

export function SprayWindowCard({ data }: { data?: SprayWindow }) {
  if (!data) return null;
  const Icon = data.is_suitable ? CheckCircle2 : XCircle;
  return (
    <section className={`rounded-md border p-4 ${data.is_suitable ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-start gap-3">
        <Icon className={data.is_suitable ? 'text-emerald-700' : 'text-amber-700'} size={24} />
        <div>
          <p className="text-sm font-semibold uppercase text-slate-600">Puedo fumigar hoy?</p>
          <p className="mt-1 text-2xl font-bold text-ink">{data.is_suitable ? 'Si' : 'No'}</p>
          <p className="mt-1 text-sm text-slate-700">{data.message}</p>
        </div>
      </div>
      {data.reasons.length ? (
        <ul className="mt-3 space-y-1 text-sm text-slate-700">
          {data.reasons.map((reason) => (
            <li key={reason}>- {reason}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
