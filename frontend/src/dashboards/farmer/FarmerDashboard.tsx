import { AlertTriangle, Battery, Bot, ChevronDown, ChevronUp, CloudRain, Droplets, Leaf, Loader2, Sparkles, Sun, Thermometer, Wind, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNpk, useSprayWindow, useStations, useSummary } from '../../api/hooks';
import { MetricCard } from '../../components/MetricCard';
import { HuacaWarningModal } from '../../components/HuacaWarningModal';
import { NpkStatus } from '../../components/NpkStatus';
import { SprayWindowCard } from '../../components/SprayWindowCard';
import { StationSelector } from '../../components/StationSelector';
import { formatDateTime, formatNumber } from '../../lib/format';
import { humanBattery, humanBatteryMessage, humanizeWarnings, humanLeafHumidity, humanRain, humanRainDetail, humanSun, humanTemp, humanWind } from '../../lib/humanizer';

const OPENROUTER_MODEL = 'openrouter/free';

export function FarmerDashboard() {
  const [stationId, setStationId] = useState(102);
  const [showTech, setShowTech] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: stations = [] } = useStations();
  const { data: summary } = useSummary(stationId);
  const { data: spray } = useSprayWindow(stationId);
  const { data: npk } = useNpk(stationId);

  useEffect(() => {
    setAdvice(null);
    setError(null);
  }, [stationId]);

  const frost = frostMessage(summary?.temperature_min, summary?.temperature_avg);
  const warnings = summary?.warnings ? humanizeWarnings(summary.warnings) : [];
  const batteryMsg = humanBatteryMessage(summary?.battery_voltage);

  const stationName = summary?.station_name ?? 'su estación';
  const temp = humanTemp(summary?.temperature_avg);
  const rain = humanRain(summary?.rainfall);
  const wind = humanWind(summary?.wind_speed_avg);
  const leaf = humanLeafHumidity(summary?.leaf_humidity_avg);

  function buildPrompt(): string {
    const lines: string[] = [];
    lines.push(`Estación: ${stationName}`);
    lines.push(`Helada: ${frost.label} — ${frost.message}`);
    if (spray) lines.push(`Fumigación: ${spray.is_suitable ? 'Apta' : 'No apta'} — ${spray.message}`);
    lines.push(`Temperatura: ${temp}`);
    lines.push(`Lluvia: ${rain}${summary?.rainfall != null && summary.rainfall >= 0.5 ? ` (${formatNumber(summary.rainfall)} mm)` : ''}`);
    lines.push(`Viento: ${wind}`);
    lines.push(`Humedad de hoja: ${leaf}`);
    lines.push(`Batería estación: ${humanBattery(summary?.battery_voltage)}`);
    if (batteryMsg) lines.push(`Alerta batería: ${batteryMsg}`);
    if (summary?.solar_radiation_avg != null) lines.push(`Radiación solar: ${formatNumber(summary.solar_radiation_avg, 0)} W/m² (${humanSun(summary.solar_radiation_avg)})`);
    if (summary?.nitrogen != null) lines.push(`Nitrógeno en suelo: ${formatNumber(summary.nitrogen, 0)} mg/Kg`);
    if (npk?.nutrients) {
      for (const k of ['N', 'P', 'K'] as const) {
        const n = npk.nutrients[k];
        lines.push(`${k === 'N' ? 'Nitrógeno' : k === 'P' ? 'Fósforo' : 'Potasio'}: ${n.value ?? '--'} mg/Kg — ${n.status}`);
      }
    }
    return lines.join('\n');
  }

  async function askAI() {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) {
      setError('Para usar el asistente IA, configura VITE_OPENROUTER_API_KEY en tu archivo .env');
      return;
    }

    setLoading(true);
    setError(null);
    setAdvice(null);

    const systemPrompt =
      'Eres un asesor agrícola experto que habla con agricultores mayores de 50 años. ' +
      'Responde siempre en español, con máximo 3 oraciones simples y directas. ' +
      'Usa un tono cálido, respetuoso y práctico. ' +
      'Da recomendaciones accionables: qué hacer HOY en el campo. ' +
      'No uses jerga técnica ni números. ' +
      'Si no hay problemas, tranquiliza al usuario.';

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Estos son los datos actuales de la estación meteorológica:\n\n${buildPrompt()}\n\n¿Qué consejo le darías hoy al agricultor?` },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`OpenRouter respondió con error ${res.status}: ${errText}`);
      }

      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content;
      if (!text) throw new Error('La IA no generó ninguna respuesta.');
      setAdvice(text.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al consultar la IA.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <HuacaWarningModal active={stationId === 101} context="agricultor" />
      <div className="flex items-center justify-between gap-4">
        <StationSelector stations={stations} value={stationId} onChange={setStationId} compact />
        <button
          className="flex shrink-0 items-center gap-2 rounded-2xl border-2 border-canopy bg-canopy px-5 py-4 text-lg font-bold text-white shadow-card transition active:scale-[0.97] disabled:opacity-60"
          onClick={askAI}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
          {loading ? 'Pensando...' : 'Pedir consejo a la IA'}
        </button>
      </div>

      {advice ? (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6 shadow-card">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-emerald-100 p-3">
              <Bot className="text-emerald-700" size={32} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg font-bold text-emerald-800">Consejo del Asesor IA</p>
                <button className="shrink-0 rounded-lg p-1 text-emerald-500 hover:bg-emerald-100" onClick={() => setAdvice(null)}>
                  <X size={22} />
                </button>
              </div>
              <p className="mt-2 text-lg leading-relaxed text-emerald-900">{advice}</p>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 shadow-card">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-red-700" size={28} />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-red-800">No pude consultar a la IA</p>
              <p className="mt-1 text-base text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : null}

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
          <MetricCard title="Temperatura" value={temp} icon={<Thermometer size={28} />} tone="blue" />
          <MetricCard title="Lluvia" value={rain} icon={<CloudRain size={28} />} tone={(summary?.rainfall ?? 0) > 0 ? 'amber' : 'green'} detail={humanRainDetail(summary?.rainfall)} />
          <MetricCard title="Viento" value={wind} icon={<Wind size={28} />} tone={(summary?.wind_speed_avg ?? 0) >= 3 ? 'amber' : 'green'} />
          <MetricCard title="Humedad de hoja" value={leaf} icon={<Droplets size={28} />} tone={(summary?.leaf_humidity_avg ?? 0) >= 70 ? 'amber' : 'green'} />
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

function frostMessage(tempMin?: number | null, tempAvg?: number | null) {
  if (tempMin == null) return { label: 'Sin dato de helada', message: 'No hay temperatura mínima para evaluar riesgo de helada.', tone: 'bg-slate-50 border-slate-200 text-slate-700', severity: 'none' as const };
  const estimatedHumidity = estimatedRelativeHumidityFromTemperatures(tempMin, tempAvg);
  const probability = frostProbabilityFromTemperatures(tempMin, estimatedHumidity);
  if (estimatedHumidity == null || probability == null) {
    return { label: 'Sin dato completo de helada', message: 'Falta temperatura promedio para calcular la probabilidad de helada.', tone: 'bg-slate-50 border-slate-200 text-slate-700', severity: 'none' as const };
  }
  if (tempMin <= 0) {
    if (estimatedHumidity >= 70) {
      return { label: '¡Alerta de helada blanca!', message: `Probabilidad calculada ${probability.toFixed(0)}%. Proteja sus cultivos sensibles esta noche.`, tone: 'bg-red-50 border-red-300 text-red-800', severity: 'high' as const };
    }
    return { label: '¡Alerta de helada negra!', message: `Probabilidad calculada ${probability.toFixed(0)}%. Riesgo alto para sus cultivos.`, tone: 'bg-red-50 border-red-300 text-red-800', severity: 'high' as const };
  }
  if (probability >= 50) {
    return { label: 'Vigilancia por helada', message: `Probabilidad calculada ${probability.toFixed(0)}%. La temperatura mínima está cerca de cero grados.`, tone: 'bg-amber-50 border-amber-300 text-amber-800', severity: 'watch' as const };
  }
  return { label: 'Sin riesgo de helada', message: 'Las condiciones actuales son seguras para sus cultivos.', tone: 'bg-emerald-50 border-emerald-300 text-emerald-800', severity: 'none' as const };
}

function estimatedRelativeHumidityFromTemperatures(tempMin: number, tempAvg?: number | null) {
  if (tempAvg == null) return null;
  const vaporPressure = (temperature: number) => 6.11 * 10 ** ((7.5 * temperature) / (237.3 + temperature));
  const e = vaporPressure(tempMin);
  const es = vaporPressure(tempAvg);
  if (es === 0) return 0;
  return Math.min(100, Math.max(0, (e / es) * 100));
}

function frostProbabilityFromTemperatures(tempMin: number, estimatedHumidity: number | null) {
  if (estimatedHumidity == null) return null;
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  const temperatureFactor = clamp((2 - tempMin) / 2);
  const humidityFactor = clamp(estimatedHumidity / 70);
  return clamp(temperatureFactor * (0.7 + 0.3 * humidityFactor)) * 100;
}
