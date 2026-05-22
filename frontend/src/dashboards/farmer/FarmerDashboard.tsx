import { AlertTriangle, Battery, ChevronDown, ChevronUp, CloudRain, Droplets, Leaf, Sun, Thermometer, Wind } from 'lucide-react';
import { useState } from 'react';
import { useNpk, useSprayWindow, useStations, useSummary } from '../../api/hooks';
import { MetricCard } from '../../components/MetricCard';
import { NpkStatus } from '../../components/NpkStatus';
import { SprayWindowCard } from '../../components/SprayWindowCard';
import { StationSelector } from '../../components/StationSelector';
import { formatDateTime, formatNumber } from '../../lib/format';
import { humanBattery, humanBatteryMessage, humanizeWarnings, humanLeafHumidity, humanRain, humanRainDetail, humanSun, humanTemp, humanWind } from '../../lib/humanizer';

export function FarmerDashboard() {
  const [stationId, setStationId] = useState(102);
  const [showTech, setShowTech] = useState(false);
  const { data: stations = [] } = useStations();
  const { data: summary } = useSummary(stationId);
  const { data: spray } = useSprayWindow(stationId);
  const { data: npk } = useNpk(stationId);

  const frost = frostMessage(summary?.temperature_min, summary?.humidity_avg);
  const warnings = summary?.warnings ? humanizeWarnings(summary.warnings) : [];
  const batteryMsg = humanBatteryMessage(summary?.battery_voltage);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-base font-bold uppercase tracking-wide text-canopy">Resumen Agrícola</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">¿Qué pasa hoy en mi zona?</h1>
        <p className="mt-3 text-lg leading-relaxed text-slate-600">Lectura simple del clima, suelo y fumigación para tomar decisiones rápidas.</p>
      </header>

      <StationSelector stations={stations} value={stationId} onChange={setStationId} compact />

      {warnings.length > 0 ? (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-card">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={28} />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-amber-800">Aviso importante</p>
              {warnings.map((w, i) => (
                <p key={i} className="mt-1 text-base text-amber-700">{w}</p>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <section className={`rounded-2xl border-2 p-6 shadow-lg ${frost.tone}`}>
        <div className="flex items-start gap-5">
          <div className="shrink-0">
            {frost.severity === 'high' ? (
              <AlertTriangle size={48} className="text-red-600" />
            ) : frost.severity === 'watch' ? (
              <AlertTriangle size={44} className="text-amber-600" />
            ) : (
              <div className="rounded-2xl bg-emerald-100 p-3">
                <Leaf size={36} className="text-emerald-700" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold">{frost.label}</p>
            <p className="mt-1 text-base text-slate-500">
              {summary?.station_name ?? 'Estación'} &middot; Última lectura: {formatDateTime(summary?.latest_time)}
            </p>
            <p className="mt-2 text-lg leading-relaxed">{frost.message}</p>
          </div>
        </div>
      </section>

      <SprayWindowCard data={spray} />

      <div>
        <h2 className="text-xl font-bold text-ink">Clima ahora</h2>
        <p className="mt-1 text-base text-slate-500">Resumen del clima en su zona</p>
        <section className="mt-3 grid gap-4 sm:grid-cols-2">
          <MetricCard title="Temperatura" value={humanTemp(summary?.temperature_avg)} icon={<Thermometer size={28} />} tone="blue" />
          <MetricCard title="Lluvia" value={humanRain(summary?.rainfall)} icon={<CloudRain size={28} />} tone={(summary?.rainfall ?? 0) > 0 ? 'amber' : 'green'} detail={humanRainDetail(summary?.rainfall)} />
          <MetricCard title="Viento" value={humanWind(summary?.wind_speed_avg)} icon={<Wind size={28} />} tone={(summary?.wind_speed_avg ?? 0) >= 3 ? 'amber' : 'green'} />
          <MetricCard title="Humedad de hoja" value={humanLeafHumidity(summary?.leaf_humidity_avg)} icon={<Droplets size={28} />} tone={(summary?.leaf_humidity_avg ?? 0) >= 70 ? 'amber' : 'green'} />
        </section>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-panel">
        <button
          className="flex w-full items-center justify-between gap-3 px-6 py-5 text-left"
          onClick={() => setShowTech(!showTech)}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-canopyLight p-2">
              <Leaf className="text-canopy" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink">Estado del suelo y equipo</h2>
              <p className="text-base text-slate-500">Toque para ver diagnóstico completo</p>
            </div>
          </div>
          {showTech ? (
            <ChevronUp className="shrink-0 text-slate-400" size={28} />
          ) : (
            <ChevronDown className="shrink-0 text-slate-400" size={28} />
          )}
        </button>

        {showTech ? (
          <div className="space-y-6 px-6 pb-6">
            <section>
              <h3 className="mb-3 text-lg font-bold text-ink">Nutrientes del suelo</h3>
              <NpkStatus data={npk} simple />
            </section>

            <section>
              <h3 className="mb-3 text-lg font-bold text-ink">Estado del equipo</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard title="Sol" value={humanSun(summary?.solar_radiation_avg)} icon={<Sun size={28} />} tone="amber" caption={summary?.solar_radiation_avg != null ? `${formatNumber(summary.solar_radiation_avg, 0)} W/m²` : undefined} />
                <MetricCard title="Batería estación" value={humanBattery(summary?.battery_voltage)} tone={(summary?.battery_voltage ?? 4) < 3.7 ? 'red' : 'green'} />
              </div>
            </section>

            {batteryMsg ? (
              <div className="flex items-start gap-3 rounded-2xl border-2 border-red-300 bg-red-50 px-5 py-4">
                <Battery className="mt-0.5 shrink-0 text-red-700" size={24} />
                <p className="text-base font-medium text-red-800">{batteryMsg}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {!showTech ? (
        <div className="text-center">
          <button
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-6 py-4 text-lg font-bold text-slate-600 shadow-card transition active:scale-[0.97]"
            onClick={() => setShowTech(true)}
          >
            <Leaf size={22} />
            Ver datos del suelo y equipo
          </button>
        </div>
      ) : null}
    </div>
  );
}

function frostMessage(tempMin?: number | null, humidity?: number | null) {
  if (tempMin == null) return { label: 'Sin dato de helada', message: 'No hay temperatura mínima para evaluar riesgo de helada.', tone: 'bg-slate-50 border-slate-200 text-slate-700', severity: 'none' as const };
  if (tempMin <= 0) return { label: '¡Alerta de helada!', message: humidity != null && humidity >= 70 ? 'Posible helada blanca. Proteja sus cultivos sensibles esta noche.' : 'Posible helada negra. Riesgo alto para sus cultivos.', tone: 'bg-red-50 border-red-300 text-red-800', severity: 'high' as const };
  if (tempMin <= 2) return { label: 'Vigilancia por helada', message: 'La temperatura está cerca del umbral de helada. Esté atento.', tone: 'bg-amber-50 border-amber-300 text-amber-800', severity: 'watch' as const };
  return { label: 'Sin riesgo de helada', message: 'Las condiciones actuales son seguras para sus cultivos.', tone: 'bg-emerald-50 border-emerald-300 text-emerald-800', severity: 'none' as const };
}
