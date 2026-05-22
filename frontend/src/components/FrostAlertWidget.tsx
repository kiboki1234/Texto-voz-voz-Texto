import { AlertTriangle, Snowflake, Zap } from 'lucide-react';

const MIN_TEMP = -5;
const MAX_TEMP = 10;
const RANGE = MAX_TEMP - MIN_TEMP;

function tempPct(value: number): number {
  return Math.max(0, Math.min(100, ((value - MIN_TEMP) / RANGE) * 100));
}

interface FrostInfo {
  type: 'black' | 'white' | 'watch';
  title: string;
  explanation: string;
  mitigation: string;
  border: string;
  bg: string;
  icon: React.ReactNode;
  pulse: boolean;
}

function getFrostInfo(tempMin: number, humidity: number): FrostInfo | null {
  if (tempMin <= 0 && humidity < 70) {
    return {
      type: 'black',
      title: '¡ALERTA CRÍTICA DE HELADA NEGRA!',
      explanation: 'Riesgo extremo de pérdida de cultivo. El frío congelará la planta por dentro sin dejar escarcha visible.',
      mitigation: 'Activa los sistemas de calefacción o quemadores de inmediato. El riego superficial no será suficiente por la baja humedad.',
      border: 'border-red-600 shadow-alert',
      bg: 'bg-red-50',
      icon: <Zap size={48} className="text-red-700" />,
      pulse: true,
    };
  }
  if (tempMin <= 0 && humidity >= 70) {
    return {
      type: 'white',
      title: 'Alerta de Helada Blanca para esta madrugada. Riesgo moderado.',
      explanation: 'Se prevé formación de escarcha o hielo visible en las hojas.',
      mitigation: 'Enciende los aspersores de agua a las 3:00 AM para aumentar la capa protectora de hielo o prepara coberturas térmicas.',
      border: 'border-orange-400',
      bg: 'bg-orange-50',
      icon: <Snowflake size={48} className="text-orange-700" />,
      pulse: false,
    };
  }
  if (tempMin <= 2) {
    return {
      type: 'watch',
      title: 'Cuidado: posible helada esta noche',
      explanation: 'La temperatura está cerca del punto de congelación. Esté atento.',
      mitigation: 'Tenga preparados los sistemas de protección. Monitoree durante la noche.',
      border: 'border-amber-400',
      bg: 'bg-amber-50',
      icon: <AlertTriangle size={48} className="text-amber-700" />,
      pulse: false,
    };
  }
  return null;
}

export function FrostAlertWidget({
  tempMin,
  humidityAvg,
  stationName,
}: {
  tempMin?: number | null;
  humidityAvg?: number | null;
  stationName: string;
}) {
  if (tempMin == null) return null;

  const info = getFrostInfo(tempMin, humidityAvg ?? 50);
  if (!info) return null;

  const currentPct = tempPct(tempMin);

  return (
    <section
      className={`rounded-3xl border-4 p-8 shadow-card ${info.bg} ${info.border}`}
    >
      <div className="flex items-start gap-5">
        <div className="shrink-0">{info.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <p className="text-2xl font-black text-ink">ALERTA HELADA — {stationName.toUpperCase()}</p>
            {info.pulse && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-1.5 text-sm font-black text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                CRÍTICO
              </span>
            )}
          </div>
          <p className={`mt-1 text-xl font-bold ${info.type === 'black' ? 'text-red-800' : info.type === 'white' ? 'text-orange-800' : 'text-amber-800'}`}>
            {info.type === 'black' ? 'Esta noche: posible helada negra — acción inmediata' : info.type === 'white' ? 'Esta noche: posible helada blanca' : 'Esta noche: posible helada'}
          </p>
        </div>
      </div>

      {info.pulse && (
        <div className={`mt-6 rounded-2xl border-2 p-5 ${info.type === 'black' ? 'border-red-400 bg-red-50' : 'border-orange-300 bg-orange-50'}`}>
          <p className={`text-4xl font-black ${info.type === 'black' ? 'text-red-900' : 'text-orange-900'}`}>
            {info.title}
          </p>
          <p className={`mt-3 text-xl leading-snug ${info.type === 'black' ? 'text-red-800' : 'text-orange-800'}`}>
            {info.explanation}
          </p>
        </div>
      )}

      {!info.pulse && (
        <p className={`mt-4 text-2xl font-black ${info.type === 'white' ? 'text-orange-900' : 'text-amber-900'}`}>
          {info.title}
        </p>
      )}

      {!info.pulse && (
        <p className={`mt-2 text-xl leading-snug ${info.type === 'white' ? 'text-orange-800' : 'text-amber-800'}`}>
          {info.explanation}
        </p>
      )}

      <div className="mt-6">
        <p className="text-lg font-bold text-slate-600">Temperatura actual: {Math.round(tempMin)}°C</p>
        <div className="relative mt-3 h-8 w-full">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(to right, #b91c1c 0%, #ea580c 25%, #eab308 50%, #a3e635 75%, #22c55e 100%)',
            }}
          />
          <div
            className="absolute top-0 h-full w-1 rounded-full bg-black"
            style={{ left: `${tempPct(0)}%`, marginLeft: -1 }}
          />
          <div
            className="absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-ink shadow-lg"
            style={{ left: `${currentPct}%`, marginLeft: -20 }}
          >
            <span className="text-sm font-bold text-white">{Math.round(tempMin)}°</span>
          </div>
        </div>
        <div className="relative mt-1 h-5">
          <span className="absolute text-sm font-bold text-slate-500" style={{ left: '0%' }}>-5°</span>
          <span className="absolute text-sm font-bold text-slate-500" style={{ left: `${tempPct(0)}%`, marginLeft: -8 }}>0°</span>
          <span className="absolute text-sm font-bold text-slate-500" style={{ left: '100%', marginLeft: -16 }}>10°</span>
        </div>
      </div>

      <div className={`mt-6 rounded-2xl border-2 p-5 ${info.type === 'black' ? 'border-red-300 bg-red-50' : info.type === 'white' ? 'border-orange-300 bg-orange-50' : 'border-amber-300 bg-amber-50'}`}>
        <p className={`text-xl font-black ${info.type === 'black' ? 'text-red-900' : info.type === 'white' ? 'text-orange-900' : 'text-amber-900'}`}>
          Qué hacer:
        </p>
        <p className={`mt-2 text-xl leading-snug ${info.type === 'black' ? 'text-red-800' : info.type === 'white' ? 'text-orange-800' : 'text-amber-800'}`}>
          {info.mitigation}
        </p>
      </div>
    </section>
  );
}
