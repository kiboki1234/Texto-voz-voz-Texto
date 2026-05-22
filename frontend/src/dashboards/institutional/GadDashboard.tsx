import { AlertTriangle, Droplets, Leaf, MapPinned, Sun, Thermometer, Wind } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAlerts, useSummaries } from '../../api/hooks';
import { AlertBadge } from '../../components/AlertBadge';
import { ChartPanel } from '../../components/ChartPanel';
import { LoadingState } from '../../components/LoadingState';
import { MetricCard } from '../../components/MetricCard';
import { StatusBadge } from '../../components/StatusBadge';
import { formatDateTime, formatNumber } from '../../lib/format';

export function GadDashboard() {
  const { data: summaries = [], isLoading } = useSummaries();
  const { data: alerts } = useAlerts();
  const avgTemp = average(summaries.map((item) => item.temperature_avg));
  const rainTotal = sum(summaries.map((item) => item.rainfall));
  const avgWind = average(summaries.map((item) => item.wind_speed_avg));
  const alertCount = alerts?.alerts.length ?? 0;

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-bold uppercase text-harvest">Dashboard GAD / institucional</p>
        <h1 className="mt-1 text-2xl font-bold tracking-normal">Estado territorial de estaciones UPEC</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Priorizacion de alertas climaticas, estado de red y condiciones agricolas por zona.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Temperatura media" value={formatNumber(avgTemp)} unit="C" icon={<Thermometer size={20} />} tone="blue" />
        <MetricCard title="Lluvia red" value={formatNumber(rainTotal)} unit="mm" icon={<Droplets size={20} />} tone="green" />
        <MetricCard title="Viento medio" value={formatNumber(avgWind)} unit="m/s" icon={<Wind size={20} />} tone="neutral" />
        <MetricCard title="Alertas activas" value={String(alertCount)} icon={<AlertTriangle size={20} />} tone={alertCount > 0 ? 'amber' : 'green'} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {summaries.map((summary) => (
          <article key={summary.station_id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold">{summary.station_name}</p>
                <p className="text-xs text-slate-500">{formatDateTime(summary.latest_time)}</p>
              </div>
              <StatusBadge status={summary.data_status} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Stat icon={<Thermometer size={16} />} label="Temp" value={`${formatNumber(summary.temperature_avg)} C`} />
              <Stat icon={<Droplets size={16} />} label="Humedad" value={`${formatNumber(summary.humidity_avg)}%`} />
              <Stat icon={<Sun size={16} />} label="Radiacion" value={`${formatNumber(summary.solar_radiation_avg)} W/m2`} />
              <Stat icon={<Leaf size={16} />} label="NPK N" value={`${formatNumber(summary.nitrogen, 0)} mg/Kg`} />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded bg-slate-100">
              <div className={`h-full ${stationTone(summary)}`} style={{ width: stationWidth(summary) }} />
            </div>
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
                </tr>
              </thead>
              <tbody>
                {summaries.map((summary) => (
                  <tr key={summary.station_id} className="border-b border-slate-100">
                    <td className="py-2 font-bold">{summary.station_name}</td>
                    <td>{formatNumber(summary.nitrogen, 0)}</td>
                    <td>{formatNumber(summary.phosphorus, 0)}</td>
                    <td>{formatNumber(summary.potassium, 0)}</td>
                    <td>{formatNumber(summary.battery_voltage, 2)} V</td>
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
            <div key={summary.station_id} className="rounded-md border border-slate-200 bg-field p-3 text-center">
              <MapPinned className="mx-auto text-canopy" size={24} />
              <p className="mt-2 font-bold">{summary.station_name}</p>
              <p className="text-xs text-slate-500">{summary.data_status}</p>
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

function sum(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function stationTone(summary: { battery_voltage?: number | null; rainfall?: number | null }) {
  if ((summary.battery_voltage ?? 4) < 3.7) return 'bg-danger';
  if ((summary.rainfall ?? 0) > 0) return 'bg-harvest';
  return 'bg-canopy';
}

function stationWidth(summary: { battery_voltage?: number | null; rainfall?: number | null }) {
  if ((summary.battery_voltage ?? 4) < 3.7) return '95%';
  if ((summary.rainfall ?? 0) > 0) return '70%';
  return '45%';
}
