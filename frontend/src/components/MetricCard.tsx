import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  tone?: 'neutral' | 'green' | 'blue' | 'amber' | 'red';
  icon?: ReactNode;
  caption?: string;
}

const tones = {
  neutral: 'border-slate-200 bg-white',
  green: 'border-emerald-200 bg-emerald-50',
  blue: 'border-sky-200 bg-sky-50',
  amber: 'border-amber-200 bg-amber-50',
  red: 'border-red-200 bg-red-50',
};

export function MetricCard({ title, value, unit, icon, caption, tone = 'neutral' }: MetricCardProps) {
  return (
    <section className={`rounded-md border p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-normal text-ink">
            {value}
            {unit ? <span className="ml-1 text-sm font-semibold text-slate-500">{unit}</span> : null}
          </p>
        </div>
        {icon ? <div className="rounded-md bg-white p-2 text-slate-700 shadow-sm">{icon}</div> : null}
      </div>
      {caption ? <p className="mt-3 text-xs text-slate-500">{caption}</p> : null}
    </section>
  );
}
