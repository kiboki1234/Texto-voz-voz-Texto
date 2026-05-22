import { AlertTriangle, Battery, CheckCircle, ChevronDown, ChevronUp, CloudRain, Droplets, Flame, Leaf, Sun, Thermometer, ThermometerSnowflake, Wind, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNpk, useStations, useSummary } from '../../api/hooks';
import { MetricCard } from '../../components/MetricCard';
import { HuacaWarningModal } from '../../components/HuacaWarningModal';
import { NpkStatus } from '../../components/NpkStatus';
import { StationSelector } from '../../components/StationSelector';
import { formatNumber } from '../../lib/format';
import { humanBattery, humanBatteryMessage, humanizeWarnings, humanLeafHumidity, humanRain, humanRainDetail, humanSun, humanTemp, humanWind } from '../../lib/humanizer';
import type { Station } from '../../api/types';
import type { ReactNode } from 'react';

// --- COMPONENTES ESPECÍFICOS DEL AGRICULTOR (Bento UI Pro Max) ---

function FarmerStationSelector({ stations = [], value, onChange }: { stations?: Station[]; value: number; onChange: (v: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {stations.map((station) => {
        const isActive = value === station.station_id;
        return (
          <button
            key={station.station_id}
            className={`flex min-h-touch w-full items-center justify-center whitespace-normal break-words rounded-3xl border-4 px-3 py-4 text-lg font-bold leading-tight transition-all active:scale-[0.97] sm:text-xl ${
              isActive
                ? 'border-canopy bg-canopy text-white shadow-md'
                : 'border-slate-300 bg-white text-slate-800 shadow-sm hover:border-canopy hover:bg-canopyLight active:border-canopy active:bg-canopyLight'
            }`}
            onClick={() => onChange(station.station_id)}
          >
            {station.name}
          </button>
        );
      })}
    </div>
  );
}

const tones = {
  neutral: 'border-slate-200 bg-white',
  green: 'border-emerald-300 bg-emerald-50',
  blue: 'border-sky-300 bg-sky-50',
  amber: 'border-amber-300 bg-amber-50',
  red: 'border-red-300 bg-red-50',
};

const iconWrappers = {
  neutral: 'bg-white text-slate-600',
  green: 'bg-white text-emerald-700',
  blue: 'bg-white text-sky-700',
  amber: 'bg-white text-amber-700',
  red: 'bg-white text-red-700',
};

function FarmerMetricCard({ title, value, unit, icon, caption, detail, tone = 'neutral' }: any) {
  return (
    <section className={`rounded-3xl border-4 p-6 shadow-sm transition-all hover:shadow-md ${tones[tone as keyof typeof tones]}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold uppercase tracking-wider text-slate-800 opacity-80">{title}</p>
          <p className={`mt-1 text-2xl font-black tracking-tight sm:text-3xl ${tone === 'red' ? 'text-red-900' : tone === 'amber' ? 'text-amber-900' : tone === 'green' ? 'text-emerald-900' : 'text-slate-900'}`}>
            {value}
            {unit ? <span className="ml-1.5 text-lg font-bold text-slate-700 sm:text-xl">{unit}</span> : null}
          </p>
          {detail ? <p className="mt-2 text-base font-bold text-slate-800">{detail}</p> : null}
        </div>
        {icon ? <div className={`shrink-0 rounded-2xl p-4 shadow-inner border-2 border-black/5 ${iconWrappers[tone as keyof typeof iconWrappers]}`}>{icon}</div> : null}
      </div>
      {caption ? <p className="mt-3 text-base font-bold text-slate-700">{caption}</p> : null}
    </section>
  );
}

// --- LÓGICA DETERMINISTA (SIN IA) ---

interface Decision {
  accion: 'Sí' | 'No' | 'Esperar';
  razon: string;
}

// --- ELIMINADOS getAbonarDecision y getFumigarDecision por solicitud de UX ---

function getTrabajoDecision(summary: any): Decision {
  if (!summary) return { accion: 'Esperar', razon: 'Esperando conexión con la estación meteorológica...' };

  const rain = summary.rainfall ?? 0;
  const leafHum = summary.leaf_humidity_avg ?? 0;
  const sol = summary.solar_radiation_avg ?? 0;
  const temp = Math.round(summary.temperature_avg ?? 0);

  const isMuddy = rain > 3 || leafHum > 85;
  const isTooHot = sol > 800 || temp > 28;

  if (isMuddy) {
    return { accion: 'No', razon: `La estación reporta demasiada humedad (Lluvia: ${rain} mm, Hoja: ${leafHum}%). La tierra está hecha lodo, se le pegará a las botas y maltratará el suelo.` };
  }
  if (isTooHot) {
    return { accion: 'Esperar', razon: `Los sensores indican radiación solar extrema (${sol} W/m², Temp: ${temp}°C). Peligro de insolación. Trabaje temprano o al final de la tarde.` };
  }

  return { accion: 'Sí', razon: `Los sensores confirman buen clima para recorrer los cultivos (Lluvia: ${rain} mm, Temp: ${temp}°C).` };
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

function WeatherBox({ title, value, desc, Icon, colorClass }: { title: string; value: string; desc: string; Icon: any; colorClass: string }) {
  return (
    <div className={`p-4 sm:p-5 rounded-2xl border-4 ${colorClass} flex flex-col items-center text-center shadow-sm h-full w-full`}>
      <Icon size={32} className="mb-2 opacity-80 shrink-0" />
      <p className="text-sm sm:text-base font-bold uppercase tracking-widest shrink-0">{title}</p>
      <div className="flex-1 flex items-center justify-center w-full my-2">
        <p className="text-lg sm:text-xl font-black bg-white/70 px-3 py-2 rounded-xl border border-white/60 w-full break-words leading-tight">{value}</p>
      </div>
      <p className="text-sm sm:text-base font-bold opacity-90 leading-snug shrink-0">{desc}</p>
    </div>
  );
}

function WorkdayCard({ decision, summary }: { decision: Decision; summary: any }) {
  const Icon = statusIcons[decision.accion] ?? AlertTriangle;
  const style = statusStyles[decision.accion] ?? statusStyles.Esperar;

  const sol = summary?.solar_radiation_avg ?? 0;
  const temp = Math.round(summary?.temperature_avg ?? 0);
  const rain = summary?.rainfall ?? 0;

  const getSolInfo = (w: number) => {
    if (w < 100) return { title: 'Radiación', value: 'Nublado', desc: 'Sin riesgo de quemaduras', color: 'bg-slate-100 border-slate-300 text-slate-800' };
    if (w < 400) return { title: 'Radiación', value: 'Sol Moderado', desc: 'Clima agradable para salir', color: 'bg-amber-50 border-amber-300 text-amber-900' };
    if (w < 700) return { title: 'Radiación', value: 'Sol Fuerte', desc: 'Use sombrero y mangas largas', color: 'bg-orange-100 border-orange-400 text-orange-900' };
    return { title: 'Radiación', value: 'Sol Peligroso', desc: 'Evite trabajar bajo el sol', color: 'bg-red-100 border-red-400 text-red-900' };
  };

  const getTempInfo = (t: number) => {
    if (t < 10) return { title: 'Temperatura', value: `${t}°C`, desc: 'Hace frío, abríguese bien', color: 'bg-sky-100 border-sky-300 text-sky-900' };
    if (t < 20) return { title: 'Temperatura', value: `${t}°C`, desc: 'Clima fresco e ideal', color: 'bg-blue-50 border-blue-300 text-blue-900' };
    if (t < 28) return { title: 'Temperatura', value: `${t}°C`, desc: 'Clima cálido, hidrátese', color: 'bg-amber-100 border-amber-300 text-amber-900' };
    return { title: 'Temperatura', value: `${t}°C`, desc: 'Peligro de fatiga por calor', color: 'bg-red-100 border-red-300 text-red-900' };
  };

  const getRainInfo = (r: number) => {
    if (r === 0) return { title: 'Lluvia', value: '0 mm', desc: 'Tierra seca y firme', color: 'bg-emerald-50 border-emerald-300 text-emerald-900' };
    if (r < 2) return { title: 'Lluvia', value: `${formatNumber(r, 1)} mm`, desc: 'Llovizna leve', color: 'bg-teal-50 border-teal-300 text-teal-900' };
    if (r < 10) return { title: 'Lluvia', value: `${formatNumber(r, 1)} mm`, desc: 'Suelo húmedo, posible lodo', color: 'bg-cyan-100 border-cyan-300 text-cyan-900' };
    return { title: 'Lluvia', value: `${formatNumber(r, 1)} mm`, desc: 'Mucho lodo en el suelo', color: 'bg-indigo-100 border-indigo-400 text-indigo-900' };
  };

  const solInfo = getSolInfo(sol);
  const tempInfo = getTempInfo(temp);
  const rainInfo = getRainInfo(rain);

  return (
    <div className={`overflow-hidden rounded-3xl border-4 ${style.border} ${style.bg} shadow-md transition-all`}>
      <div className="flex flex-col md:flex-row items-center gap-6 p-6 md:p-8">
        <div className={`flex h-28 w-28 shrink-0 items-center justify-center rounded-[1.5rem] ${style.circle} shadow-inner bg-white/60`}>
          <Icon size={64} strokeWidth={2.5} />
        </div>
        <div className="flex-1 text-center md:text-left w-full">
          <h3 className="text-lg font-bold uppercase tracking-widest opacity-80 text-slate-800">Estado de la Jornada Laboral</h3>
          <p className="mt-2 text-4xl md:text-5xl font-black tracking-tight text-slate-900">
            Trabajo en campo: <span className={style.label}>{decision.accion}</span>
          </p>
          <div className="mt-6 rounded-3xl bg-white/80 p-5 md:p-6 backdrop-blur-md border-2 border-white shadow-sm">
             <p className="text-xl md:text-2xl font-bold leading-relaxed text-slate-900 mb-6 border-b-2 border-slate-200/60 pb-5">
               {decision.razon}
             </p>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               <WeatherBox Icon={Sun} {...solInfo} />
               <WeatherBox Icon={Thermometer} {...tempInfo} />
               <WeatherBox Icon={CloudRain} {...rainInfo} />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NutrientBox({ name, status, desc }: { name: string; status: string; desc: string }) {
  const bg = status === 'deficient' ? 'bg-amber-100 border-amber-400 text-amber-900' : status === 'excess' ? 'bg-red-100 border-red-400 text-red-900' : 'bg-emerald-100 border-emerald-400 text-emerald-900';
  const label = status === 'deficient' ? 'Hace Falta' : status === 'excess' ? 'Demasiado' : 'Excelente';
  
  return (
    <div className={`p-4 sm:p-5 rounded-2xl border-4 ${bg} flex flex-col items-center text-center shadow-sm h-full w-full`}>
      <p className="text-lg sm:text-xl font-black shrink-0">{name}</p>
      <p className="text-sm sm:text-base font-bold opacity-80 mt-1 shrink-0">{desc}</p>
      <div className="flex-1 flex items-center justify-center w-full mt-3">
        <div className="bg-white/70 px-3 py-2 rounded-xl w-full border border-white/60">
           <p className="text-base sm:text-lg font-black uppercase tracking-widest leading-tight">{label}</p>
        </div>
      </div>
    </div>
  );
}

function FertilizerAdviceCard({ npk }: { npk: any }) {
  if (!npk?.nutrients) return null;

  const N = npk.nutrients.N?.status;
  const P = npk.nutrients.P?.status;
  const K = npk.nutrients.K?.status;

  const NVal = npk.nutrients.N?.value;
  const PVal = npk.nutrients.P?.value;
  const KVal = npk.nutrients.K?.value;

  const traduccionEstado = (status: string) => {
    if (status === 'deficient') return <span className="text-red-700 bg-red-100 px-3 py-1 rounded-xl">Hace falta</span>;
    if (status === 'excess') return <span className="text-purple-700 bg-purple-100 px-3 py-1 rounded-xl">Abundante</span>;
    return <span className="text-emerald-700 bg-emerald-100 px-3 py-1 rounded-xl">Está bien</span>;
  };
  const sobran = [];
  if (N === 'excess') sobran.push('Nitrógeno');
  if (P === 'excess') sobran.push('Fósforo');
  if (K === 'excess') sobran.push('Potasio');

  return (
    <div className="rounded-3xl border-2 border-blue-400 bg-blue-50 p-6 md:p-8 shadow-md">
      <h3 className="text-xl md:text-2xl font-black text-blue-900 flex items-center gap-3 mb-6">
        <Leaf size={28} className="text-blue-600" /> Estado de la Tierra y Abonos
      </h3>

      <div className="mb-6 bg-white/70 p-5 md:p-6 rounded-3xl border border-blue-200 shadow-inner">
        <p className="text-base md:text-lg font-bold text-blue-900 mb-5 uppercase tracking-widest border-b border-blue-100 pb-3 text-center">Niveles de Nutrientes</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
           <NutrientBox name="Nitrógeno" status={N || 'optimal'} desc="Para hojas verdes" />
           <NutrientBox name="Fósforo" status={P || 'optimal'} desc="Fuerza de la raíz" />
           <NutrientBox name="Potasio" status={K || 'optimal'} desc="Frutos grandes" />
        </div>
      </div>
      

      {sobran.length > 0 && (
        <div className="mt-6 p-6 bg-amber-100 rounded-3xl border-2 border-amber-300">
           <p className="text-lg font-black text-amber-900 flex items-center gap-2">
             <AlertTriangle size={24} className="text-amber-700" /> Sugerencia Importante
           </p>
           <p className="mt-3 text-base font-bold text-amber-800 leading-snug">
             Su tierra tiene nivel abundante de <strong>{sobran.join(' y ')}</strong>.<br/><br/>
             No gaste dinero en abonos completos. Pida en el almacén un abono específico que <strong>NO contenga lo que ya le sobra</strong>.
           </p>
        </div>
      )}
    </div>
  );
}

function FrostAlertWidget({ summary }: { summary: any }) {
  const temp = summary?.temperature_min;
  const hum = summary?.humidity_avg;
  const currentTemp = summary?.temperature_avg != null ? Math.round(summary.temperature_avg) : (temp != null ? Math.round(temp) : 0);
  const stationName = summary?.station_name ?? 'LA ZONA';

  if (temp == null || hum == null) return null;

  if (temp > 0) {
    return (
      <div className="rounded-3xl border-2 border-emerald-400 bg-emerald-50 p-6 md:p-8 shadow-md">
        <div className="flex flex-col items-center text-center md:flex-row md:text-left md:items-start gap-6">
          <div className="rounded-2xl bg-emerald-200 p-4 shadow-inner">
            <CheckCircle size={48} className="text-emerald-700" />
          </div>
          <div className="flex-1">
            <p className="text-2xl md:text-3xl font-black text-emerald-900 tracking-tight">Sin riesgo de helada</p>
            <p className="mt-2 text-lg md:text-xl font-bold text-emerald-800 opacity-90">Las condiciones actuales son seguras para sus cultivos.</p>
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
    <div className={`rounded-[2.5rem] border-[6px] p-10 shadow-2xl ${isNegra ? 'animate-pulse border-red-600 bg-red-100' : 'border-orange-400 bg-orange-50'}`}>
      
      {/* Header de Alerta */}
      <div className={`mb-8 border-b-[6px] border-current pb-6 opacity-90 ${colorText}`}>
        <h2 className="text-3xl font-black uppercase tracking-widest">ALERTA HELADA — {stationName}</h2>
        <p className="mt-2 text-3xl font-bold">Esta noche: posible helada {tipoHelada}</p>
        <p className="text-2xl font-bold">Proteja sus cultivos antes de las 18h00</p>
      </div>

      <div className="flex flex-col items-center text-center md:flex-row md:text-left md:items-start gap-10">
        <div className={`rounded-[2.5rem] p-6 shadow-inner ${isNegra ? 'bg-red-200' : 'bg-orange-200'}`}>
           {isNegra ? <Flame size={96} className="text-red-700" /> : <ThermometerSnowflake size={96} className="text-orange-700" />}
        </div>
        <div className={`flex-1 ${colorText}`}>
          <p className="text-5xl md:text-6xl font-black tracking-tight uppercase leading-tight">
            {isNegra ? '¡Alerta Crítica de Helada Negra!' : 'Alerta de Helada Blanca'}
          </p>
          <p className="mt-4 text-3xl font-bold opacity-90">
            {isNegra ? 'Riesgo extremo de pérdida de cultivo.' : 'Riesgo moderado para esta madrugada.'}
          </p>
          <p className="mt-3 text-2xl font-bold opacity-80">
            {isNegra 
              ? 'El frío congelará la planta por dentro sin dejar escarcha visible.' 
              : 'Se prevé formación de escarcha/hielo visible en las hojas.'}
          </p>
          
          <div className={`mt-8 rounded-[2rem] p-8 border-[6px] shadow-md ${isNegra ? 'bg-red-50 border-red-300' : 'bg-white border-orange-300'}`}>
            <p className="text-3xl font-black flex items-center justify-center md:justify-start gap-4">
              {isNegra ? <AlertTriangle size={48} /> : <Droplets size={48} />} Acción Inmediata:
            </p>
            <p className="mt-4 text-2xl font-bold leading-snug">
              {isNegra 
                ? 'Activa los sistemas de calefacción/quemadores de inmediato. El riego superficial no será suficiente por la baja humedad.' 
                : 'Enciende los aspersores de agua a las 3:00 AM para aumentar la capa protectora de hielo o prepara coberturas térmicas.'}
            </p>
          </div>

          {/* Gráfico Simple de Tendencia */}
          <div className="mt-10 rounded-[2rem] bg-white/60 p-8 border-4 border-white shadow-sm">
             <p className="mb-6 text-2xl font-black opacity-90">Tendencia de Temperatura Actual</p>
             <div className="relative h-16 w-full rounded-full bg-gradient-to-r from-blue-600 via-sky-300 to-emerald-400 shadow-inner overflow-hidden border-4 border-slate-200">
                {/* Límite 0 grados */}
                <div className="absolute top-0 bottom-0 left-[50%] w-2 bg-red-600 z-10 shadow-[0_0_12px_rgba(220,38,38,1)]"></div>
                <div className="absolute top-1 left-[50%] -translate-x-1/2 rounded-md bg-red-600 px-3 py-1 text-base font-black text-white z-20 shadow-md">0°C LÍMITE</div>
                
                {/* Indicador Actual */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 h-14 w-14 -ml-7 rounded-full border-[6px] border-white bg-slate-800 shadow-xl transition-all z-30 flex items-center justify-center"
                  style={{ left: `${pointerPercent}%` }}
                >
                  <div className="h-4 w-4 rounded-full bg-white"></div>
                </div>
             </div>
             <div className="mt-4 flex justify-between text-2xl font-black opacity-80">
                <span>-5°C</span>
                <span className="text-slate-900 bg-white/50 px-4 py-1 rounded-full">Actual: {currentTemp}°C</span>
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

  const { data: stations = [] } = useStations();
  const { data: summary } = useSummary(stationId);
  const { data: npk } = useNpk(stationId);


  const warnings = summary?.warnings ? humanizeWarnings(summary.warnings) : [];
  const batteryMsg = humanBatteryMessage(summary?.battery_voltage);

  const decisionTrabajo = getTrabajoDecision(summary);

  const temp = humanTemp(summary?.temperature_avg);
  const rain = humanRain(summary?.rainfall);
  const wind = humanWind(summary?.wind_speed_avg);
  const leaf = humanLeafHumidity(summary?.leaf_humidity_avg);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <HuacaWarningModal active={stationId === 101} context="agricultor" />
      <FarmerStationSelector stations={stations} value={stationId} onChange={setStationId} />

      <FrostAlertWidget summary={summary} />

      <WorkdayCard decision={decisionTrabajo} summary={summary} />

      <FertilizerAdviceCard npk={npk} />

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
      <div className="pt-6">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Clima actual de la zona</h2>
        <p className="mt-1 text-lg sm:text-xl font-bold text-slate-700">Resumen de los sensores</p>
        <section className="mt-6 grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          <FarmerMetricCard title="Temperatura" value={temp} icon={<Thermometer size={40} />} tone="blue" />
          <FarmerMetricCard title="Lluvia" value={rain} icon={<CloudRain size={40} />} tone={(summary?.rainfall ?? 0) > 0 ? 'amber' : 'green'} detail={humanRainDetail(summary?.rainfall)} />
          <FarmerMetricCard title="Viento" value={wind} icon={<Wind size={40} />} tone={(summary?.wind_speed_avg ?? 0) >= 3 ? 'amber' : 'green'} />
          <FarmerMetricCard title="Humedad de hoja" value={leaf} icon={<Droplets size={40} />} tone={(summary?.leaf_humidity_avg ?? 0) >= 70 ? 'amber' : 'green'} />
        </section>
      </div>

    </div>
  );
}

