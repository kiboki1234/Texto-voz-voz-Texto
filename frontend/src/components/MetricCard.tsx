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
    <section className={`rounded-[2rem] border-4 p-8 shadow-sm transition-all hover:shadow-md ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-xl font-black uppercase tracking-wider text-slate-800 opacity-80">{title}</p>
          <p className={`mt-2 text-3xl font-black tracking-tight sm:text-4xl ${tone === 'red' ? 'text-red-900' : tone === 'amber' ? 'text-amber-900' : tone === 'green' ? 'text-emerald-900' : 'text-slate-900'}`}>
            {value}
            {unit ? <span className="ml-2 text-xl font-bold text-slate-700 sm:text-2xl">{unit}</span> : null}
          </p>
          {detail ? <p className="mt-3 text-lg font-bold text-slate-800">{detail}</p> : null}
        </div>
        {icon ? <div className={`shrink-0 rounded-2xl p-5 shadow-inner border-2 border-black/5 ${iconWrappers[tone]}`}>{icon}</div> : null}
      </div>
      {caption ? <p className="mt-4 text-lg font-bold text-slate-700">{caption}</p> : null}
    </section>
  );
}
