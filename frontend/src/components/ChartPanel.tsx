import type { ReactNode } from 'react';

interface ChartPanelProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function ChartPanel({ title, subtitle, action, children }: ChartPanelProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
