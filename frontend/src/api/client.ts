import {
  alertsMock,
  etoMock,
  latestMock,
  npkMock,
  ombroMock,
  seriesMock,
  sprayMock,
  stationsMock,
  summaryMock,
  variableOptions,
  windRoseMock,
} from './mocks';
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

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

async function request<T>(path: string, fallback: T): Promise<T> {
  if (USE_MOCKS) return fallback;
  try {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as T;
  } catch {
    return fallback;
  }
}

function params(query: Record<string, string | number>) {
  return new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)])).toString();
}

export const api = {
  stations: () => request<Station[]>('/stations', stationsMock),
  variables: () => request('/variables', variableOptions),
  latest: (stationId: number) => request<LatestResponse>(`/stations/${stationId}/latest`, latestMock(stationId)),
  summary: (stationId: number) => request<Summary>(`/stations/${stationId}/summary`, summaryMock(stationId)),
  summaries: async () => {
    const stations = await api.stations();
    return Promise.all(stations.map((station) => api.summary(station.station_id)));
  },
  series: (stationId: number, variable: string, from: string, to: string, resolution: string) =>
    request<SeriesResponse>(
      `/stations/${stationId}/series?${params({ variable, from, to, resolution })}`,
      seriesMock(stationId, variable, resolution),
    ),
  alerts: () => request<{ alerts: Alert[] }>('/alerts/current', alertsMock()),
  stationAlerts: (stationId: number) => request<{ alerts: Alert[] }>(`/stations/${stationId}/alerts`, alertsMock(stationId)),
  sprayWindow: (stationId: number) => request<SprayWindow>(`/analytics/spray-window?${params({ station_id: stationId })}`, sprayMock(stationId)),
  npk: (stationId: number) => request<NpkResponse>(`/analytics/npk?${params({ station_id: stationId })}`, npkMock(stationId)),
  ombrothermal: (stationId: number, year: number) =>
    request<OmbrothermalResponse>(`/analytics/ombrothermal?${params({ station_id: stationId, year })}`, ombroMock(stationId, year)),
  eto: (stationId: number, from: string, to: string) =>
    request<EtoResponse>(`/analytics/eto?${params({ station_id: stationId, from, to })}`, etoMock(stationId)),
  windRose: (stationId: number, from: string, to: string) =>
    request<WindRoseResponse>(`/analytics/wind-rose?${params({ station_id: stationId, from, to })}`, windRoseMock(stationId)),
  exportUrl: (stationId: number, variable: string, from: string, to: string, resolution: string) =>
    `${API_BASE}/export/series.csv?${params({ station_id: stationId, variable, from, to, resolution })}`,
};
