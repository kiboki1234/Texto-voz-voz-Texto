import type {
  Alert,
  EtoResponse,
  LatestResponse,
  NpkResponse,
  OmbrothermalResponse,
  SeriesResponse,
  SprayWindow,
  Station,
  Summary,
  WindRoseResponse,
} from './types';

export const stationsMock: Station[] = [
  { station_id: 101, name: 'HUACA', code: '125720354', device_code: '125720354', rtu_info: 'YDOC RTU V5.0B5', latest_time: '2026-05-19T12:00:00', data_status: 'stale', tag_count: 27 },
  { station_id: 102, name: 'CAYAMBE', code: '125720355', device_code: '125720355', rtu_info: 'YDOC RTU V5.0B5', latest_time: '2026-05-19T12:00:00', data_status: 'stale', tag_count: 29 },
  { station_id: 103, name: 'CONCEPCION', code: '125720356', device_code: '125720356', rtu_info: 'YDOC RTU V5.0B5', latest_time: '2026-05-19T12:00:00', data_status: 'stale', tag_count: 29 },
  { station_id: 104, name: 'MIRA', code: '125720357', device_code: '125720357', rtu_info: 'YDOC RTU V5.0B5', latest_time: '2026-05-19T12:00:00', data_status: 'stale', tag_count: 29 },
  { station_id: 105, name: 'TULCAN', code: '125720358', device_code: '125720358', rtu_info: 'YDOC RTU V5.0B5', latest_time: '2026-05-19T12:00:00', data_status: 'stale', tag_count: 29 },
  { station_id: 106, name: 'CUBA', code: '125720359', device_code: '125720359', rtu_info: 'YDOC RTU V5.0B5', latest_time: '2026-05-19T12:00:00', data_status: 'stale', tag_count: 29 },
];

export const variableOptions = [
  'Temp_AVG',
  'Temp_Min',
  'Temp_Max',
  'Humedad_AVG',
  'Lluvia',
  'RadSol_AVG',
  'VV_Sonic_AVG',
  'DV_Sonic_AVG',
  'Bateria',
  'Hum_Hoja_AVG',
  'N',
  'P',
  'K',
].map((standard_name) => ({ standard_name, display_name: standard_name, category: 'demo', unit: '' }));

function base(stationId: number) {
  return (stationId - 100) * 0.7;
}

export function latestMock(stationId: number): LatestResponse {
  const station = stationsMock.find((item) => item.station_id === stationId) ?? stationsMock[1];
  const b = base(stationId);
  const values = {
    Temp_AVG: 14.8 + b,
    Temp_Min: 5.6 + b / 2,
    Temp_Max: 22.2 + b,
    Humedad_AVG: 76 - b,
    Lluvia: stationId === 104 || stationId === 106 ? 2.4 : 0,
    RadSol_AVG: 420 + b * 18,
    VV_Sonic_AVG: 2.2 + (stationId % 3) * 0.8,
    DV_Sonic_AVG: 45 + (stationId % 6) * 42,
    Bateria: stationId === 105 ? 3.64 : 3.95,
    Hum_Hoja_AVG: 61 + (stationId % 4) * 8,
    N: 18 + (stationId % 5),
    P: 14 + (stationId % 7),
    K: 95 + (stationId % 6) * 18,
  };
  const variables = Object.entries(values).map(([standard_name, value]) => ({
    code: standard_name,
    standard_name,
    display_name: standard_name.split('_').join(' '),
    category: categoryFor(standard_name),
    value: Number(value.toFixed(2)),
    unit: unitFor(standard_name),
    quality: stationId === 101 && ['N', 'P', 'K'].includes(standard_name) ? 'warning' as const : 'ok' as const,
    measured_at: station.latest_time,
  }));
  return {
    station_id: stationId,
    station_name: station.name,
    latest_time: station.latest_time,
    variables,
    warnings: stationId === 101 ? ['HUACA usa nomenclatura antigua y N/P/K con unidad por validar.'] : [],
  };
}

export function summaryMock(stationId: number): Summary {
  const latest = latestMock(stationId);
  const byName = Object.fromEntries(latest.variables.map((item) => [item.standard_name, item.value]));
  return {
    station_id: stationId,
    station_name: latest.station_name,
    latest_time: latest.latest_time,
    data_status: 'stale',
    temperature_avg: byName.Temp_AVG,
    temperature_min: byName.Temp_Min,
    temperature_max: byName.Temp_Max,
    humidity_avg: byName.Humedad_AVG,
    rainfall: byName.Lluvia,
    solar_radiation_avg: byName.RadSol_AVG,
    wind_speed_avg: byName.VV_Sonic_AVG,
    wind_direction_avg: byName.DV_Sonic_AVG,
    battery_voltage: byName.Bateria,
    leaf_humidity_avg: byName.Hum_Hoja_AVG,
    nitrogen: byName.N,
    phosphorus: byName.P,
    potassium: byName.K,
    alerts: alertsMock(stationId).alerts,
    warnings: latest.warnings,
  };
}

export function seriesMock(stationId: number, variable: string, resolution: string): SeriesResponse {
  const points = Array.from({ length: resolution === 'daily' ? 19 : 120 }, (_, index) => {
    const date = new Date('2026-05-01T00:00:00');
    if (resolution === 'daily') date.setDate(date.getDate() + index);
    else date.setHours(date.getHours() + index);
    const wave = Math.sin(index / 3) * 2.5;
    const baseValue = Number(summaryMock(stationId)[metricKey(variable)] ?? 10);
    const value = variable === 'Lluvia'
      ? (index % 5 === 0 ? Math.max(0, 1.2 + Math.sin(index / 2) * 1.8) : 0)
      : variable.startsWith('DV_')
        ? (baseValue + index * 17) % 360
        : baseValue + wave;
    return { time: date.toISOString(), value: Number(value.toFixed(2)) };
  });
  return {
    station_id: stationId,
    station_name: summaryMock(stationId).station_name,
    variable,
    unit: unitFor(variable),
    resolution,
    points,
  };
}

export function alertsMock(stationId?: number): { alerts: Alert[] } {
  const ids = stationId ? [stationId] : stationsMock.map((station) => station.station_id);
  const alerts = ids.flatMap((id) => {
    const summary = summaryMockNoAlerts(id);
    const stationName = stationsMock.find((station) => station.station_id === id)?.name ?? 'Estacion';
    const result: Alert[] = [];
    if ((summary.wind_speed_avg ?? 0) >= 3) result.push({ id: `${id}-spray`, station_id: id, station_name: stationName, severity: 'info', category: 'spray', title: 'No fumigar', message: 'El viento o la humedad de hoja no son aptos.' });
    if ((summary.battery_voltage ?? 4) < 3.7) result.push({ id: `${id}-battery`, station_id: id, station_name: stationName, severity: 'critical', category: 'battery', title: 'Bateria critica', message: 'Revisar energia del datalogger.' });
    if ((summary.nitrogen ?? 99) < 20) result.push({ id: `${id}-npk-n`, station_id: id, station_name: stationName, severity: 'warning', category: 'npk', title: 'Nitrogeno deficiente', message: 'El suelo requiere revision de nitrogeno.' });
    return result;
  });
  return { alerts };
}

export function sprayMock(stationId: number): SprayWindow {
  const summary = summaryMockNoAlerts(stationId);
  const reasons: string[] = [];
  if ((summary.wind_speed_avg ?? 0) >= 3) reasons.push(`Viento ${summary.wind_speed_avg?.toFixed(1)} m/s`);
  if ((summary.rainfall ?? 0) !== 0) reasons.push(`Lluvia ${summary.rainfall?.toFixed(1)} mm`);
  if ((summary.leaf_humidity_avg ?? 0) >= 70) reasons.push(`Humedad de hoja ${summary.leaf_humidity_avg?.toFixed(1)}%`);
  return {
    station_id: stationId,
    station_name: summary.station_name,
    is_suitable: reasons.length === 0,
    decision: reasons.length === 0 ? 'apta' : 'no_apta',
    message: reasons.length === 0 ? 'Ventana apta para fumigacion.' : 'No se recomienda fumigar ahora.',
    reasons,
  };
}

export function npkMock(stationId: number): NpkResponse {
  const summary = summaryMockNoAlerts(stationId);
  return {
    station_id: stationId,
    station_name: summary.station_name,
    warning: stationId === 101 ? 'HUACA reporta N/P/K con unidad por validar.' : null,
    nutrients: {
      N: nutrient('N', summary.nitrogen),
      P: nutrient('P', summary.phosphorus),
      K: nutrient('K', summary.potassium),
    },
  };
}

export function ombroMock(stationId: number, year: number): OmbrothermalResponse {
  return {
    station_id: stationId,
    year,
    months: Array.from({ length: 5 }, (_, index) => {
      const month = `${year}-${String(index + 1).padStart(2, '0')}`;
      const temperature_avg = 13 + index * 0.8;
      const precipitation = index % 2 === 0 ? 18 + index * 3 : 42 + index * 2;
      return { month, temperature_avg, precipitation, dry: precipitation <= 2 * temperature_avg };
    }),
  };
}

export function etoMock(stationId: number): EtoResponse {
  return {
    station_id: stationId,
    method: 'Hargreaves-Samani simplificado, Ra fija=15.',
    points: Array.from({ length: 19 }, (_, index) => ({
      date: `2026-05-${String(index + 1).padStart(2, '0')}`,
      eto: Number((2.6 + Math.sin(index / 2) * 0.7).toFixed(2)),
      rainfall: index % 5 === 0 ? 2.1 : 0,
    })),
  };
}

export function windRoseMock(stationId: number): WindRoseResponse {
  const sectors = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return {
    station_id: stationId,
    sectors: sectors.map((sector, index) => ({
      sector,
      count: 4 + ((stationId + index) % 8),
      avg_speed: Number((1.4 + index * 0.25).toFixed(2)),
    })),
  };
}

function summaryMockNoAlerts(stationId: number): Summary {
  const latest = latestMock(stationId);
  const byName = Object.fromEntries(latest.variables.map((item) => [item.standard_name, item.value]));
  return {
    station_id: stationId,
    station_name: latest.station_name,
    latest_time: latest.latest_time,
    data_status: 'stale',
    temperature_avg: byName.Temp_AVG,
    temperature_min: byName.Temp_Min,
    temperature_max: byName.Temp_Max,
    humidity_avg: byName.Humedad_AVG,
    rainfall: byName.Lluvia,
    solar_radiation_avg: byName.RadSol_AVG,
    wind_speed_avg: byName.VV_Sonic_AVG,
    wind_direction_avg: byName.DV_Sonic_AVG,
    battery_voltage: byName.Bateria,
    leaf_humidity_avg: byName.Hum_Hoja_AVG,
    nitrogen: byName.N,
    phosphorus: byName.P,
    potassium: byName.K,
  };
}

function unitFor(variable: string) {
  if (variable.includes('Temp')) return 'C';
  if (variable.includes('Humedad') || variable.includes('Hum_Hoja')) return '%';
  if (variable === 'Lluvia') return 'mm';
  if (variable.includes('RadSol')) return 'W/m2';
  if (variable.includes('VV_')) return 'm/s';
  if (variable.includes('DV_')) return 'deg';
  if (variable === 'Bateria') return 'V';
  if (['N', 'P', 'K'].includes(variable)) return 'mg/Kg';
  return '';
}

function categoryFor(variable: string) {
  if (variable.includes('Temp')) return 'temperature';
  if (variable.includes('Humedad')) return 'humidity';
  if (variable === 'Lluvia') return 'rainfall';
  if (variable.includes('RadSol')) return 'solar_radiation';
  if (variable.includes('VV_')) return 'wind_speed';
  if (variable.includes('DV_')) return 'wind_direction';
  if (variable === 'Bateria') return 'battery';
  if (variable.includes('Hum_Hoja')) return 'leaf_humidity';
  return 'soil_nutrients';
}

function metricKey(variable: string): keyof Summary {
  const map: Record<string, keyof Summary> = {
    Temp_AVG: 'temperature_avg',
    Temp_Min: 'temperature_min',
    Temp_Max: 'temperature_max',
    Humedad_AVG: 'humidity_avg',
    Lluvia: 'rainfall',
    RadSol_AVG: 'solar_radiation_avg',
    VV_Sonic_AVG: 'wind_speed_avg',
    DV_Sonic_AVG: 'wind_direction_avg',
    Bateria: 'battery_voltage',
    Hum_Hoja_AVG: 'leaf_humidity_avg',
    N: 'nitrogen',
    P: 'phosphorus',
    K: 'potassium',
  };
  return map[variable] ?? 'temperature_avg';
}

function nutrient(kind: 'N' | 'P' | 'K', value?: number | null) {
  if (value == null) return { status: 'unknown', label: 'Sin dato', value: null };
  const limits = kind === 'N' ? [20, 40] : kind === 'P' ? [10, 30] : [80, 200];
  if (value < limits[0]) return { status: 'deficient', label: 'Deficiente', value };
  if (value > limits[1]) return { status: 'excess', label: 'Exceso', value };
  return { status: 'optimal', label: 'Optimo', value };
}
