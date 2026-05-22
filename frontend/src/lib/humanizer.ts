import { formatNumber } from './format';

const warningTranslations: Record<string, string> = {
  'HUACA reporta N/P/K con PARID=1; validar unidad antes de comparaciones agronomicas.': 'El sensor de nutrientes del suelo necesita revisión. Los datos pueden no ser precisos.',
  'HUACA reporta N/P/K con unidad no confiable (PARID=1); usar como referencia.': 'El sensor de tierra está fallando. Los datos pueden ser inexactos.',
  'HUACA puede reportar solo HumHoja sin minimo/maximo.': 'El sensor de humedad de hoja tiene lectura limitada en esta estación.',
  'HUACA usa nomenclatura antigua y N/P/K con PARID=1; los nutrientes se muestran como referencia tecnica.': 'Esta estación usa sensores antiguos. Los datos de nutrientes son referenciales.',
  'HUACA usa nomenclatura antigua y N/P/K con PARID=1; los nutrientes se muestran como referencia técnica.': 'Esta estación usa sensores antiguos. Los datos de nutrientes son referenciales.',
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
