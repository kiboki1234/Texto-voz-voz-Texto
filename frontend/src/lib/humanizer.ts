import { formatNumber } from './format';

const warningTranslations: Record<string, string> = {
  'HUACA puede reportar solo HumHoja sin minimo/maximo.': 'El sensor de humedad de hoja tiene lectura limitada en esta estación.',
  'HUACA usa sensores con unidades distintas; los nutrientes se muestran solo como referencia y no deben compararse directamente con otras estaciones.': 'Esta estación usa sensores con unidades distintas. Los datos de nutrientes son referenciales.',
  'HUACA usa sensores de suelo con unidades distintas; los nutrientes se muestran solo como referencia.': 'Esta estación usa sensores con unidades distintas. Los datos de nutrientes son referenciales.',
  'HUACA usa sensores de nutrientes con unidades distintas; validar antes de comparar con otras estaciones.': 'Esta estación usa sensores con unidades distintas. Los datos de nutrientes son referenciales.',
};

export function humanizeWarning(raw: string): string {
  return warningTranslations[raw] ?? raw;
}

export function humanizeWarnings(raws: string[]): string[] {
  return raws.map(humanizeWarning);
}

export function humanTemp(value?: number | null): string {
  if (value == null) return '--';
  return `Hace ${Math.round(value)}°C`;
}

export function humanRain(value?: number | null): string {
  if (value == null) return '--';
  if (value < 0.5) return 'Sin lluvia';
  if (value < 5) return 'Ligera';
  if (value < 20) return 'Moderada';
  return 'Fuerte';
}

export function humanRainDetail(value?: number | null): string | undefined {
  if (value == null || value < 0.5) return undefined;
  return `${formatNumber(value)} mm hoy`;
}

export function humanWind(value?: number | null): string {
  if (value == null) return '--';
  if (value < 3) return 'Suave';
  if (value < 6) return 'Moderado';
  if (value < 10) return 'Fuerte';
  return 'Muy fuerte';
}

export function humanLeafHumidity(value?: number | null): string {
  if (value == null) return '--';
  if (value < 40) return 'Secas';
  if (value < 70) return 'Húmedas';
  return 'Muy húmedas';
}

export function humanSun(value?: number | null): string {
  if (value == null) return '--';
  if (value < 100) return 'Día nublado';
  if (value < 400) return 'Parcialmente nublado';
  return 'Día soleado';
}

export function humanBattery(value?: number | null): string {
  if (value == null) return '--';
  if (value < 3.5) return 'Crítica';
  if (value < 3.7) return 'Baja';
  return 'Bien';
}

export function humanBatteryMessage(value?: number | null): string | undefined {
  if (value == null) return undefined;
  if (value < 3.5) return '¡Recargue la batería pronto! La estación podría apagarse.';
  if (value < 3.7) return 'La batería está baja. Programe un mantenimiento.';
  return undefined;
}

export function humanSoilNutrientLabel(key: string): string {
  const labels: Record<string, string> = {
    N: 'Nitrógeno',
    P: 'Fósforo',
    K: 'Potasio',
  };
  return labels[key] ?? key;
}

export function humanSoilNutrientStatus(status: string): string {
  const labels: Record<string, string> = {
    deficient: 'Hace falta',
    optimal: 'Está bien',
    excess: 'En exceso',
    unknown: 'Sin dato',
  };
  return labels[status] ?? status;
}

export function simpleSoilStatus(
  n?: { status: string; value: number | null },
  p?: { status: string; value: number | null },
  k?: { status: string; value: number | null },
): { label: string; message: string; tone: string } {
  const deficits = [n, p, k].filter((x) => x?.status === 'deficient');
  const excesses = [n, p, k].filter((x) => x?.status === 'excess');
  if (deficits.length >= 2)
    return { label: 'Tierra necesita abono', message: 'La tierra está falta de fuerza. Eche abono compuesto.', tone: 'amber' };
  if (deficits.length === 1) {
    const names = { N: 'nitrógeno (fuerza de hoja)', P: 'fósforo (fuerza de raíz)', K: 'potasio (fuerza de fruto)' };
    const key = n?.status === 'deficient' ? 'N' : p?.status === 'deficient' ? 'P' : 'K';
    return { label: 'Falta abono', message: `A la tierra le falta ${names[key]}. Eche abono de ese.`, tone: 'amber' };
  }
  if (excesses.length > 0)
    return { label: 'Mucho abono', message: 'La tierra tiene mucho abono guardado. No eche más por ahora.', tone: 'amber' };
  return { label: 'Tierra buena', message: 'La tierra está bien abonada. Siga así.', tone: 'green' };
}

export function humanTempSimple(value?: number | null): string {
  if (value == null) return '--';
  if (value < 10) return 'Hace frío';
  if (value < 20) return 'Templado';
  if (value < 30) return 'Hace calor';
  return 'Hace mucho calor';
}

export function humanRainSimple(value?: number | null): string {
  if (value == null) return '--';
  if (value < 0.5) return 'Sin lluvia';
  if (value < 10) return 'Lloviendo';
  return 'Lluvia fuerte';
}

export function humanWindSimple(value?: number | null): string {
  if (value == null) return '--';
  if (value < 3) return 'Tranquilo';
  if (value < 6) return 'Ventilando';
  return 'Mucho viento';
}

export function humanSoilOverall(npk?: { status: string; value: number | null }[]): string {
  if (!npk || npk.length === 0) return '--';
  const deficits = npk.filter((x) => x.status === 'deficient');
  if (deficits.length >= 2) return 'Hace falta abono';
  return 'Tierra buena';
}
