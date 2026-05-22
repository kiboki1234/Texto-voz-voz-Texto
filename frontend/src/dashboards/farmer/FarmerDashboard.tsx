import { AlertTriangle, Battery, CheckCircle, ChevronDown, ChevronUp, CloudRain, Droplets, Flame, Leaf, Sun, Thermometer, ThermometerSnowflake, Wind, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNpk, useSprayWindow, useStations, useSummary } from '../../api/hooks';
import { MetricCard } from '../../components/MetricCard';
import { NpkStatus } from '../../components/NpkStatus';
import { StationSelector } from '../../components/StationSelector';
import { formatNumber } from '../../lib/format';
import { humanBattery, humanBatteryMessage, humanizeWarnings, humanLeafHumidity, humanRain, humanRainDetail, humanSun, humanTemp, humanWind } from '../../lib/humanizer';

// --- LÓGICA DETERMINISTA (SIN IA) ---

interface Decision {
  accion: 'Sí' | 'No' | 'Esperar';
  razon: string;
}

function getAbonarDecision(npk: any, summary: any): Decision {
  if (!npk?.nutrients) {
    return { accion: 'Esperar', razon: 'Aún no hay lectura de los sensores de tierra hoy.' };
  }
  
  const N = npk.nutrients.N?.status;
  const P = npk.nutrients.P?.status;
  const K = npk.nutrients.K?.status;
  const needsFertilizer = N === 'deficient' || P === 'deficient' || K === 'deficient';
  const hasExcess = N === 'excess' || P === 'excess' || K === 'excess';
  const isWet = (summary?.rainfall ?? 0) > 0 || (summary?.leaf_humidity_avg ?? 0) > 60;

  if (hasExcess) {
    return { accion: 'No', razon: 'La tierra ya tiene demasiada fuerza. Echar más abono puede quemar la raíz.' };
  }
  
  if (needsFertilizer) {
    if (isWet) {
      return { accion: 'Sí', razon: 'A la tierra le falta fuerza y la humedad actual ayudará a que el abono baje.' };
    } else {
      return { accion: 'Esperar', razon: 'La tierra necesita abono, pero está muy seca. Riegue primero o espere lluvia.' };
    }
  }

  return { accion: 'No', razon: 'La tierra tiene buena fuerza y nutrientes. No gaste abono hoy.' };
}

function getFumigarDecision(spray: any, summary: any): Decision {
  if (!spray) {
    return { accion: 'Esperar', razon: 'Analizando las condiciones de viento y lluvia...' };
  }

  if (spray.is_suitable) {
    return { accion: 'Sí', razon: 'El clima está tranquilo. Buen momento para que el líquido se adhiera a la hoja.' };
  } else {
    const isWindy = (summary?.wind_speed_avg ?? 0) > 4;
    const isRainy = (summary?.rainfall ?? 0) > 0;
    
    let razon = 'Las condiciones no son buenas para fumigar hoy.';
    if (isRainy && isWindy) razon = 'Va a llover y hay viento. El líquido se volará y se lavará.';
    else if (isRainy) razon = 'Va a llover pronto. El agua lavará el producto de las hojas.';
    else if (isWindy) razon = 'Hay demasiado viento. El producto se volará y no caerá en la planta.';

    return { accion: 'No', razon };
  }
}

function getTrabajoDecision(summary: any): Decision {
  if (!summary) return { accion: 'Esperar', razon: 'Esperando datos de la estación...' };

  const isMuddy = (summary.rainfall ?? 0) > 3 || (summary.leaf_humidity_avg ?? 0) > 85;
  const isTooHot = (summary.solar_radiation_avg ?? 0) > 800 || (summary.temperature_avg ?? 0) > 28;

  if (isMuddy) {
    return { accion: 'No', razon: 'La tierra está hecha lodo. Se le pegará a las botas y maltratará el suelo.' };
  }
  if (isTooHot) {
    return { accion: 'Esperar', razon: 'El sol está muy fuerte. Trabaje bien temprano o al final de la tarde.' };
  }

  return { accion: 'Sí', razon: 'Buen clima para recorrer y trabajar en los cultivos.' };
}

// --- COMPONENTES VISUALES ---

const statusIcons = {
  Sí: CheckCircle,
  No: XCircle,
  Esperar: AlertTriangle,
};

const statusStyles: Record<string, { circle: string; label: string; bg: string; border: string }> = {
  Sí: { circle: 'bg-emerald-100 text-emerald-700', label: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-400' },
  No: { circle: 'bg-red-100 text-red-700', label: 'text-red-700', bg: 'bg-red-50', border: 'border-red-400' },
  Esperar: { circle: 'bg-amber-100 text-amber-700', label: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-400' },
};

function DecisionCard({ title, decision }: { title: string; decision: Decision }) {
  const Icon = statusIcons[decision.accion] ?? AlertTriangle;
  const style = statusStyles[decision.accion] ?? statusStyles.Esperar;
  return (
    <section className={`rounded-3xl border-4 p-8 shadow-card ${style.bg} ${style.border}`}>
      <div className="flex flex-col items-center text-center">
        <div className={`mb-5 flex h-20 w-20 items-center justify-center rounded-full ${style.circle}`}>
          <Icon size={44} />
        </div>
        <p className="text-ink text-3xl font-black leading-tight sm:text-4xl">
          {title}: <span className={style.label}>{decision.accion}</span>
        </p>
        <p className="mt-4 max-w-sm text-xl font-medium leading-snug text-slate-700">
          {decision.razon}
        </p>
      </div>
    </section>
  );
}

function FrostAlertWidget({ summary }: { summary: any }) {
  const temp = summary?.temperature_min;
  const hum = summary?.humidity_avg;
  const currentTemp = summary?.temperature_avg != null ? Math.round(summary.temperature_avg) : (temp != null ? Math.round(temp) : 0);
  const stationName = summary?.station_name ?? 'LA ZONA';

  if (temp == null || hum == null) return null;

  // ESTADO SEGURO (Sin Helada)
  if (temp > 0) {
    return (
      <div className="rounded-3xl border-4 border-emerald-400 bg-emerald-50 p-8 shadow-md">
        <div className="flex flex-col items-center text-center md:flex-row md:text-left md:items-start gap-6">
          <div className="rounded-full bg-emerald-200 p-4">
            <CheckCircle size={56} className="text-emerald-700" />
          </div>
          <div className="flex-1">
            <p className="text-3xl font-black text-emerald-900 tracking-tight">Sin riesgo de helada</p>
            <p className="mt-2 text-xl font-bold text-emerald-800 opacity-90">Las condiciones actuales son seguras para sus cultivos.</p>
            <p className="mt-1 text-lg font-medium text-emerald-800 opacity-80">La temperatura mínima esperada es de {Math.round(temp)}°C, por encima del punto de congelación.</p>
          </div>
        </div>
      </div>
    );
  }

  const isNegra = temp <= 0 && hum < 70;
  const tipoHelada = isNegra ? 'negra' : 'blanca';
  const colorText = isNegra ? 'text-red-900' : 'text-orange-900';
  
  // Termómetro visual de tendencia (-5°C a +5°C)
  const minTemp = -5;
  const maxTemp = 5;
  const clampedTemp = Math.max(minTemp, Math.min(maxTemp, currentTemp));
  const pointerPercent = ((clampedTemp - minTemp) / (maxTemp - minTemp)) * 100;

  return (
    <div className={`rounded-3xl border-4 p-8 shadow-lg ${isNegra ? 'animate-pulse border-red-600 bg-red-100' : 'border-orange-400 bg-orange-50'}`}>
      
      {/* Header de Alerta */}
      <div className={`mb-6 border-b-4 border-current pb-4 opacity-90 ${colorText}`}>
        <h2 className="text-2xl font-black uppercase tracking-widest">ALERTA HELADA — {stationName}</h2>
        <p className="mt-1 text-xl font-bold">Esta noche: posible helada {tipoHelada}</p>
        <p className="text-xl font-medium">Proteja sus cultivos antes de las 18h00</p>
      </div>

      <div className="flex flex-col items-center text-center md:flex-row md:text-left md:items-start gap-8">
        <div className={`rounded-full p-4 ${isNegra ? 'bg-red-200' : 'bg-orange-200'}`}>
           {isNegra ? <Flame size={64} className="text-red-700" /> : <ThermometerSnowflake size={64} className="text-orange-700" />}
        </div>
        <div className={`flex-1 ${colorText}`}>
          <p className="text-4xl font-black tracking-tight uppercase">
            {isNegra ? '¡Alerta Crítica de Helada Negra!' : 'Alerta de Helada Blanca'}
          </p>
          <p className="mt-2 text-2xl font-bold opacity-90">
            {isNegra ? 'Riesgo extremo de pérdida de cultivo.' : 'Riesgo moderado para esta madrugada.'}
          </p>
          <p className="mt-2 text-xl font-medium opacity-80">
            {isNegra 
              ? 'El frío congelará la planta por dentro sin dejar escarcha visible.' 
              : 'Se prevé formación de escarcha/hielo visible en las hojas.'}
          </p>
          
          <div className={`mt-6 rounded-2xl p-6 border-4 ${isNegra ? 'bg-red-50 border-red-200' : 'bg-white border-orange-200'}`}>
            <p className="text-2xl font-black flex items-center justify-center md:justify-start gap-3">
              {isNegra ? <AlertTriangle size={32} /> : <Droplets size={32} />} Acción Inmediata:
            </p>
            <p className="mt-3 text-xl font-bold">
              {isNegra 
                ? 'Activa los sistemas de calefacción/quemadores de inmediato. El riego superficial no será suficiente por la baja humedad.' 
                : 'Enciende los aspersores de agua a las 3:00 AM para aumentar la capa protectora de hielo o prepara coberturas térmicas.'}
            </p>
          </div>

          {/* Gráfico Simple de Tendencia */}
          <div className="mt-8 rounded-2xl bg-white/50 p-6 shadow-sm">
             <p className="mb-4 text-xl font-bold opacity-90">Tendencia de Temperatura</p>
             <div className="relative h-14 w-full rounded-full bg-gradient-to-r from-blue-600 via-sky-300 to-emerald-400 shadow-inner overflow-hidden border-2 border-slate-200">
                {/* Límite 0 grados */}
                <div className="absolute top-0 bottom-0 left-[50%] w-1.5 bg-red-600 z-10 shadow-[0_0_8px_rgba(220,38,38,1)]"></div>
                <div className="absolute top-1 left-[50%] -translate-x-1/2 rounded bg-red-600 px-2 py-0.5 text-sm font-black text-white z-20 shadow-sm">0°C LÍMITE</div>
                
                {/* Indicador Actual */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 h-10 w-10 -ml-5 rounded-full border-4 border-white bg-slate-800 shadow-lg transition-all z-30 flex items-center justify-center"
                  style={{ left: `${pointerPercent}%` }}
                >
                  <div className="h-3 w-3 rounded-full bg-white"></div>
                </div>
             </div>
             <div className="mt-3 flex justify-between text-lg font-bold opacity-80">
                <span>-5°C</span>
                <span>Actual: {currentTemp}°C</span>
                <span>+5°C</span>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export function FarmerDashboard() {
  const [stationId, setStationId] = useState(102);
  const [showTech, setShowTech] = useState(false);

  const { data: stations = [] } = useStations();
  const { data: summary } = useSummary(stationId);
  const { data: spray } = useSprayWindow(stationId);
  const { data: npk } = useNpk(stationId);

  const warnings = summary?.warnings ? humanizeWarnings(summary.warnings) : [];
  const batteryMsg = humanBatteryMessage(summary?.battery_voltage);

  const decisionAbonar = getAbonarDecision(npk, summary);
  const decisionFumigar = getFumigarDecision(spray, summary);
  const decisionTrabajo = getTrabajoDecision(summary);

  const temp = humanTemp(summary?.temperature_avg);
  const rain = humanRain(summary?.rainfall);
  const wind = humanWind(summary?.wind_speed_avg);
  const leaf = humanLeafHumidity(summary?.leaf_humidity_avg);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <StationSelector stations={stations} value={stationId} onChange={setStationId} compact />

      <FrostAlertWidget summary={summary} />

      <div className="grid gap-6 md:grid-cols-3">
        <DecisionCard title="Abonar" decision={decisionAbonar} />
        <DecisionCard title="Fumigar" decision={decisionFumigar} />
        <DecisionCard title="Trabajo" decision={decisionTrabajo} />
      </div>

      {batteryMsg && (
        <div className="flex items-start gap-4 rounded-3xl border-4 border-red-400 bg-red-50 p-6 shadow-sm">
          <AlertTriangle className="mt-1 shrink-0 text-red-700" size={32} />
          <div>
            <p className="text-xl font-bold text-red-900">Aviso de Equipo</p>
            <p className="mt-1 text-lg font-medium text-red-800">{batteryMsg}</p>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="flex items-start gap-4 rounded-3xl border-4 border-amber-400 bg-amber-50 p-6 shadow-sm">
          <AlertTriangle className="mt-1 shrink-0 text-amber-700" size={32} />
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold text-amber-900">Aviso del Sistema</p>
            {warnings.map((w, i) => (
              <p key={i} className="mt-1 text-lg font-medium text-amber-800">{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* --- INFORMACIÓN SECUNDARIA (Detalles) --- */}
      <div>
        <h2 className="text-2xl font-black text-ink">Clima ahora</h2>
        <p className="mt-1 text-lg font-medium text-slate-500">Resumen del clima en su zona</p>
        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          <MetricCard title="Temperatura" value={temp} icon={<Thermometer size={28} />} tone="blue" />
          <MetricCard title="Lluvia" value={rain} icon={<CloudRain size={28} />} tone={(summary?.rainfall ?? 0) > 0 ? 'amber' : 'green'} detail={humanRainDetail(summary?.rainfall)} />
          <MetricCard title="Viento" value={wind} icon={<Wind size={28} />} tone={(summary?.wind_speed_avg ?? 0) >= 3 ? 'amber' : 'green'} />
          <MetricCard title="Humedad de hoja" value={leaf} icon={<Droplets size={28} />} tone={(summary?.leaf_humidity_avg ?? 0) >= 70 ? 'amber' : 'green'} />
        </section>
      </div>

      <div className="rounded-3xl border-4 border-slate-200 bg-white shadow-panel">
        <button
          className="flex w-full items-center justify-between gap-4 px-6 py-6 text-left"
          onClick={() => setShowTech(!showTech)}
        >
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-canopyLight p-3">
              <Leaf className="text-canopy" size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-ink">Estado del suelo y equipo</h2>
              <p className="text-lg font-medium text-slate-500">Toque para ver diagnóstico completo</p>
            </div>
          </div>
          {showTech ? (
            <ChevronUp className="shrink-0 text-slate-400" size={32} />
          ) : (
            <ChevronDown className="shrink-0 text-slate-400" size={32} />
          )}
        </button>

        {showTech ? (
          <div className="space-y-8 px-6 pb-8 border-t-2 border-slate-100 pt-6">
            <section>
              <h3 className="mb-4 text-xl font-black text-ink">Nutrientes del suelo</h3>
              <NpkStatus data={npk} simple />
            </section>

            <section>
              <h3 className="mb-4 text-xl font-black text-ink">Estado del equipo</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard title="Sol" value={humanSun(summary?.solar_radiation_avg)} icon={<Sun size={28} />} tone="amber" caption={summary?.solar_radiation_avg != null ? `${formatNumber(summary.solar_radiation_avg, 0)} W/m²` : undefined} />
                <MetricCard title="Batería estación" value={humanBattery(summary?.battery_voltage)} icon={<Battery size={28} />} tone={(summary?.battery_voltage ?? 4) < 3.7 ? 'red' : 'green'} />
              </div>
            </section>
          </div>
        ) : null}
      </div>

      {!showTech ? (
        <div className="text-center">
          <button
            className="inline-flex items-center gap-3 rounded-2xl border-4 border-slate-200 bg-white px-8 py-5 text-xl font-black text-slate-600 shadow-card transition active:scale-[0.97]"
            onClick={() => setShowTech(true)}
          >
            <Leaf size={28} />
            Ver datos del suelo y equipo
          </button>
        </div>
      ) : null}
    </div>
  );
}
