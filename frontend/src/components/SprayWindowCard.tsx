import { CheckCircle2, XCircle } from 'lucide-react';
import type { SprayWindow } from '../api/types';

export function SprayWindowCard({ data }: { data?: SprayWindow }) {
  if (!data) return null;
  const suitable = data.is_suitable;
  const Icon = suitable ? CheckCircle2 : XCircle;
  return (
    <section className={`rounded-2xl border-2 p-6 shadow-card ${suitable ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
      <div className="flex items-start gap-4">
        <div className={`rounded-xl p-3 ${suitable ? 'bg-emerald-100' : 'bg-amber-100'}`}>
          <Icon className={suitable ? 'text-emerald-700' : 'text-amber-700'} size={36} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-slate-600">¿Puedo fumigar hoy?</p>
          <p className={`mt-1 text-3xl font-bold ${suitable ? 'text-emerald-800' : 'text-amber-800'}`}>
            {suitable ? 'Sí, puede fumigar' : 'No, espere'}
          </p>
          <p className="mt-2 text-lg leading-relaxed text-slate-700">{data.message}</p>
        </div>
      </div>
      {data.reasons.length ? (
        <ul className="mt-4 space-y-2 border-t border-current border-opacity-20 pt-4">
          {data.reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-2 text-base text-slate-700">
              <span className="mt-1 block h-2 w-2 shrink-0 rounded-full bg-current opacity-40" />
              {reason}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
