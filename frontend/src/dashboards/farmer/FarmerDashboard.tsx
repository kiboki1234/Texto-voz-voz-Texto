import { CloudRain, Droplets, Leaf, Sun, Thermometer, Wind } from 'lucide-react';
import { useState } from 'react';
import { useNpk, useSprayWindow, useStations, useSummary } from '../../api/hooks';
import { MetricCard } from '../../components/MetricCard';
import { NpkStatus } from '../../components/NpkStatus';
import { SprayWindowCard } from '../../components/SprayWindowCard';
import { StationSelector } from '../../components/StationSelector';
import { formatDateTime, formatNumber } from '../../lib/format';

export function FarmerDashboard() {
  const [stationId, setStationId] = useState(102);
  const { data: stations = [] } = useStations();
  const { data: summary } = useSummary(stationId);
  const { data: spray } = useSprayWindow(stationId);
  const { data: npk } = useNpk(stationId);

  const frost = frostMessage(summary?.temperature_min, summary?.humidity_avg);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <p className="text-sm font-bold uppercase text-canopy">Dashboard agricultor</p>
        <h1 className="mt-1 text-2xl font-bold tracking-normal">Que pasa hoy en mi zona?</h1>
        <p className="mt-2 text-sm text-slate-600">Lectura simple de clima, suelo y fumigacion para tomar decisiones rapidas.</p>
      </section>

      <StationSelector stations={stations} value={stationId} onChange={setStationId} compact />

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xl font-bold">{summary?.station_name ?? 'Estacion'}</p>
            <p className="text-sm text-slate-500">Ultima lectura: {formatDateTime(summary?.latest_time)}</p>
          </div>
          <div className={`rounded-md px-3 py-2 text-sm font-bold ${frost.tone}`}>{frost.label}</div>
        </div>
        <p className="mt-3 text-sm text-slate-700">{frost.message}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <MetricCard title="Temperatura" value={formatNumber(summary?.temperature_avg)} unit="C" icon={<Thermometer size={20} />} tone="blue" />
        <MetricCard title="Lluvia" value={formatNumber(summary?.rainfall)} unit="mm" icon={<CloudRain size={20} />} tone={(summary?.rainfall ?? 0) > 0 ? 'amber' : 'green'} />
        <MetricCard title="Viento" value={formatNumber(summary?.wind_speed_avg)} unit="m/s" icon={<Wind size={20} />} tone={(summary?.wind_speed_avg ?? 0) >= 3 ? 'amber' : 'green'} />
        <MetricCard title="Humedad de hoja" value={formatNumber(summary?.leaf_humidity_avg)} unit="%" icon={<Droplets size={20} />} tone={(summary?.leaf_humidity_avg ?? 0) >= 70 ? 'amber' : 'green'} />
      </section>

      <SprayWindowCard data={spray} />

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
        <div className="mb-3 flex items-center gap-2">
          <Leaf className="text-canopy" size={22} />
          <h2 className="text-lg font-bold">Salud del suelo</h2>
        </div>
        <NpkStatus data={npk} simple />
        <p className="mt-3 text-sm text-slate-600">{soilAdvice(npk)}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard title="Sol" value={formatNumber(summary?.solar_radiation_avg, 0)} unit="W/m2" icon={<Sun size={20} />} tone="amber" caption="Radiacion actual" />
        <MetricCard title="Nitrogeno" value={formatNumber(summary?.nitrogen, 0)} unit="mg/Kg" tone={(summary?.nitrogen ?? 99) < 20 ? 'amber' : 'green'} />
        <MetricCard title="Bateria EMA" value={formatNumber(summary?.battery_voltage, 2)} unit="V" tone={(summary?.battery_voltage ?? 4) < 3.7 ? 'red' : 'green'} />
      </section>
    </div>
  );
}

function frostMessage(tempMin?: number | null, humidity?: number | null) {
  if (tempMin == null) return { label: 'Sin dato', message: 'No hay temperatura minima para evaluar helada.', tone: 'bg-slate-100 text-slate-700' };
  if (tempMin <= 0) return { label: 'Alerta de helada', message: humidity != null && humidity >= 70 ? 'Posible helada blanca. Proteja cultivos sensibles.' : 'Posible helada negra. Riesgo alto para cultivos sensibles.', tone: 'bg-red-100 text-red-800' };
  if (tempMin <= 2) return { label: 'Vigilancia', message: 'La temperatura minima esta cerca del umbral de helada.', tone: 'bg-amber-100 text-amber-800' };
  return { label: 'Normal', message: 'No se detecta riesgo de helada con la lectura actual.', tone: 'bg-emerald-100 text-emerald-800' };
}

function soilAdvice(npk?: { nutrients: Record<'N' | 'P' | 'K', { status: string }> }) {
  if (!npk) return 'Sin lectura de suelo.';
  const deficient = Object.entries(npk.nutrients).filter(([, value]) => value.status === 'deficient').map(([key]) => key);
  if (!deficient.length) return 'El suelo esta dentro del rango recomendado segun la lectura actual.';
  return `Revise aporte de ${deficient.join(', ')} antes de fertilizar.`;
}
