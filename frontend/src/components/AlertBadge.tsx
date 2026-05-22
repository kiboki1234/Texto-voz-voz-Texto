import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import type { Alert } from '../api/types';
import { severityLabel } from '../lib/format';

const styles: Record<Alert['severity'], string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  critical: 'border-red-200 bg-red-50 text-red-800',
};

export function AlertBadge({ alert }: { alert: Alert }) {
  const Icon = alert.severity === 'critical' ? ShieldAlert : alert.severity === 'warning' ? AlertTriangle : Info;
  return (
    <div className={`rounded-md border px-3 py-2 ${styles[alert.severity]}`}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 shrink-0" size={17} />
        <div>
          <p className="text-sm font-bold">{alert.title}</p>
          <p className="text-xs">{severityLabel(alert.severity)} · {alert.station_name}</p>
          <p className="mt-1 text-sm">{alert.message}</p>
        </div>
      </div>
    </div>
  );
}
