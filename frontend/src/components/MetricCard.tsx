import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  tone?: 'neutral' | 'green' | 'blue' | 'amber' | 'red';
  icon?: ReactNode;
  caption?: string;
  detail?: string;
}

const tones = {
  neutral: 'border-slate-200 bg-white',
  green: 'border-emerald-300 bg-emerald-50',
  blue: 'border-sky-300 bg-sky-50',
  amber: 'border-amber-300 bg-amber-50',
  red: 'border-red-300 bg-red-50',
};

const iconWrappers = {
  neutral: 'bg-white text-slate-600',
  green: 'bg-white text-emerald-700',
  blue: 'bg-white text-sky-700',
  amber: 'bg-white text-amber-700',
  red: 'bg-white text-red-700',
};

export function MetricCard({ title, value, unit, icon, caption, detail, tone = 'neutral' }: MetricCardProps) {
  return (
    <section className={`rounded-2xl border-2 p-5 shadow-sm transition-all hover:shadow-md ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <p className={`mt-2 text-xl font-bold tracking-tight sm:text-2xl ${tone === 'red' ? 'text-red-800' : tone === 'amber' ? 'text-amber-800' : tone === 'green' ? 'text-emerald-800' : 'text-ink'}`}>
            {value}
            {unit ? <span className="ml-1.5 text-sm font-semibold text-slate-500 sm:text-base">{unit}</span> : null}
          </p>
          {detail ? <p className="mt-1 text-sm font-medium text-slate-600 sm:text-base">{detail}</p> : null}
        </div>
        {icon ? <div className={`shrink-0 rounded-xl p-3 shadow-sm ${iconWrappers[tone]}`}>{icon}</div> : null}
      </div>
      {caption ? <p className="mt-3 text-sm text-slate-500">{caption}</p> : null}
    </section>
  );
}
