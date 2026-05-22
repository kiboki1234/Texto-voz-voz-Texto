export function formatNumber(value?: number | null, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return value.toLocaleString('es-EC', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return 'Sin dato';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-EC', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function severityLabel(severity: string): string {
  const labels: Record<string, string> = {
    info: 'Info',
    warning: 'Vigilancia',
    critical: 'Alerta',
  };
  return labels[severity] ?? severity;
}
