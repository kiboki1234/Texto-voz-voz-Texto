import type { StationStatus } from '../api/types';

const styles: Record<StationStatus, string> = {
  online: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  stale: 'bg-amber-50 text-amber-700 ring-amber-200',
  offline: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const labels: Record<StationStatus, string> = {
  online: 'En linea',
  stale: 'Desfasada',
  offline: 'Sin datos',
};

export function StatusBadge({ status }: { status: StationStatus }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-1 text-xs font-semibold ring-1 ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
