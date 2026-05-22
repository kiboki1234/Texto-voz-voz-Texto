import { AlertTriangle, Battery, CloudRain, Droplets, MapPinned, Thermometer, Wind } from 'lucide-react';
import type { Alert, Summary } from '../../api/types';
import type { ReactNode } from 'react';
import { useAlerts, useSummaries } from '../../api/hooks';
import { AlertBadge } from '../../components/AlertBadge';
import { ChartPanel } from '../../components/ChartPanel';
import { HuacaWarningModal } from '../../components/HuacaWarningModal';
import { LoadingState } from '../../components/LoadingState';
import { MetricCard } from '../../components/MetricCard';
import { StatusBadge } from '../../components/StatusBadge';
import { formatDateTime, formatNumber } from '../../lib/format';

export function GadDashboard() {
  const { data: summaries = [], isLoading } = useSummaries();
  const { data: alerts } = useAlerts();
  const avgTemp = average(summaries.map((item) => item.temperature_avg));
  const stationsWithRain = summaries.filter((item) => (item.rainfall ?? 0) > 0).length;
  const maxWind = max(summaries.map((item) => item.wind_speed_max ?? item.wind_speed_avg));
  const alertCount = alerts?.alerts.length ?? 0;

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <HuacaWarningModal active={summaries.some((summary) => summary.station_id === 101)} context="gad" />
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-bold uppercase text-harvest">Dashboard GAD / institucional</p>
        <h1 className="mt-1 text-2xl font-bold tracking-normal">Estado territorial de estaciones UPEC</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Priorizacion de alertas climaticas, estado de red y condiciones agricolas por zona.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Temperatura media" value={formatNumber(avgTemp)} unit="C" icon={<Thermometer size={20} />} tone="blue" caption="Promedio de la ultima lectura de estaciones activas" />
        <MetricCard title="Estaciones con lluvia" value={`${stationsWithRain}/${summaries.length}`} icon={<CloudRain size={20} />} tone={stationsWithRain > 0 ? 'amber' : 'green'} caption="Lectura reciente, no acumulado mensual" />
        <MetricCard title="Viento maximo" value={formatNumber(maxWind)} unit="m/s" icon={<Wind size={20} />} tone={(maxWind ?? 0) >= 3 ? 'amber' : 'neutral'} caption="Maximo reportado por la red" />
        <MetricCard title="Alertas activas" value={String(alertCount)} icon={<AlertTriangle size={20} />} tone={alertCount > 0 ? 'amber' : 'green'} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {summaries.map((summary) => (
          <article key={summary.station_id} className={`rounded-md border bg-white p-4 shadow-sm ${stationBorder(summary)}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold">{summary.station_name}</p>
                <p className="text-xs text-slate-500">{formatDateTime(summary.latest_time)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={summary.data_status} />
                <span className={`rounded px-2 py-1 text-xs font-bold ${stationLevel(summary).className}`}>{stationLevel(summary).label}</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Stat icon={<Thermometer size={16} />} label="Temp" value={`${formatNumber(summary.temperature_avg)} C`} />
              <Stat icon={<Droplets size={16} />} label="Lluvia" value={`${formatNumber(summary.rainfall)} mm`} />
              <Stat icon={<Wind size={16} />} label="Viento" value={`${formatNumber(summary.wind_speed_avg)} m/s`} />
              <Stat icon={<Battery size={16} />} label="Bateria" value={`${formatNumber(summary.battery_voltage, 2)} V`} />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded bg-slate-100">
              <div className={`h-full ${stationTone(summary)}`} style={{ width: stationWidth(summary) }} />
            </div>
            {summary.alerts?.length ? (
              <p className="mt-3 text-xs font-semibold text-slate-600">{summary.alerts.length} alerta(s): {summary.alerts.slice(0, 2).map((alert) => alert.title).join(', ')}</p>
            ) : (
              <p className="mt-3 text-xs font-semibold text-emerald-700">Sin alertas activas</p>
            )}
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <ChartPanel title="NPK por zona" subtitle="Semaforo rapido para decision territorial">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Estacion</th>
                  <th>N</th>
                  <th>P</th>
                  <th>K</th>
                  <th>Bateria</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((summary) => (
                  <tr key={summary.station_id} className="border-b border-slate-100">
                    <td className="py-2 font-bold">{summary.station_name}</td>
                    <td className={nutrientClass('N', summary.nitrogen)}>{formatNumber(summary.nitrogen, 0)}</td>
                    <td className={nutrientClass('P', summary.phosphorus)}>{formatNumber(summary.phosphorus, 0)}</td>
                    <td className={nutrientClass('K', summary.potassium)}>{formatNumber(summary.potassium, 0)}</td>
                    <td>{formatNumber(summary.battery_voltage, 2)} V</td>
                    <td><span className={`rounded px-2 py-1 text-xs font-bold ${stationLevel(summary).className}`}>{stationLevel(summary).label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartPanel>

        <ChartPanel title="Alertas institucionales">
          <div className="space-y-3">
            {alerts?.alerts.length ? alerts.alerts.map((alert) => <AlertBadge key={alert.id} alert={alert} />) : (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Red sin alertas criticas activas.
              </div>
            )}
          </div>
        </ChartPanel>
      </section>

      <ChartPanel title="Cobertura territorial" subtitle="Vista operativa cuando no existen coordenadas confiables">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {summaries.map((summary) => (
            <div key={summary.station_id} className={`rounded-md border bg-field p-3 text-center ${stationBorder(summary)}`}>
              <MapPinned className="mx-auto text-canopy" size={24} />
              <p className="mt-2 font-bold">{summary.station_name}</p>
              <p className="text-xs text-slate-500">{summary.data_status}</p>
              <p className="mt-2 text-xs font-semibold">{formatNumber(summary.rainfall)} mm lluvia</p>
            </div>
          ))}
        </div>
      </ChartPanel>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-2">
      <div className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">{icon}{label}</div>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === 'number');
  return valid.length ? valid.reduce((total, value) => total + value, 0) / valid.length : null;
}

function max(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === 'number');
  return valid.length ? Math.max(...valid) : null;
}

function stationLevel(summary: Summary) {
  const severities = new Set((summary.alerts ?? []).map((alert: Alert) => alert.severity));
  if (summary.data_status === 'offline' || severities.has('critical')) return { label: 'Alerta', className: 'bg-red-100 text-red-800' };
  if (summary.data_status === 'stale' || severities.has('warning') || (summary.rainfall ?? 0) > 0) return { label: 'Vigilancia', className: 'bg-amber-100 text-amber-800' };
  return { label: 'Normal', className: 'bg-emerald-100 text-emerald-800' };
}

function stationTone(summary: Summary) {
  const level = stationLevel(summary).label;
  if (level === 'Alerta') return 'bg-danger';
  if (level === 'Vigilancia') return 'bg-harvest';
  return 'bg-canopy';
}

function stationWidth(summary: Summary) {
  const level = stationLevel(summary).label;
  if (level === 'Alerta') return '95%';
  if (level === 'Vigilancia') return '70%';
  return '45%';
}

function stationBorder(summary: Summary) {
  const level = stationLevel(summary).label;
  if (level === 'Alerta') return 'border-red-300';
  if (level === 'Vigilancia') return 'border-amber-300';
  return 'border-emerald-200';
}

function nutrientClass(kind: 'N' | 'P' | 'K', value?: number | null) {
  if (value === null || value === undefined) return 'text-slate-500';
  const limits = {
    N: [20, 40],
    P: [10, 30],
    K: [80, 200],
  } as const;
  const [low, high] = limits[kind];
  if (value < low) return 'font-bold text-amber-700';
  if (value > high) return 'font-bold text-red-700';
  return 'font-bold text-emerald-700';
}
