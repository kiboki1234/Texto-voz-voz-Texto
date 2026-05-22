import type {
  Alert,
  EtoResponse,
  FrostResponse,
  LatestResponse,
  NpkResponse,
  OmbrothermalResponse,
  SeriesResponse,
  SprayWindow,
  Station,
  Summary,
  VariableOption,
  WindRoseResponse,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json() as T;
}

function params(query: Record<string, string | number>) {
  return new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)])).toString();
}

export const api = {
  stations: () => request<Station[]>('/stations'),
  variables: () => request<VariableOption[]>('/variables'),
  latest: (stationId: number) => request<LatestResponse>(`/stations/${stationId}/latest`),
  summary: (stationId: number) => request<Summary>(`/stations/${stationId}/summary`),
  summaries: async () => {
    const stations = await api.stations();
    return Promise.all(stations.map((station) => api.summary(station.station_id)));
  },
  series: (stationId: number, variable: string, from: string, to: string, resolution: string) =>
    request<SeriesResponse>(
      `/stations/${stationId}/series?${params({ variable, from, to, resolution })}`,
    ),
  alerts: () => request<{ alerts: Alert[] }>('/alerts/current'),
  stationAlerts: (stationId: number) => request<{ alerts: Alert[] }>(`/stations/${stationId}/alerts`),
  sprayWindow: (stationId: number) => request<SprayWindow>(`/analytics/spray-window?${params({ station_id: stationId })}`),
  npk: (stationId: number) => request<NpkResponse>(`/analytics/npk?${params({ station_id: stationId })}`),
  ombrothermal: (stationId: number, from: string, to: string) =>
    request<OmbrothermalResponse>(`/analytics/ombrothermal?${params({ station_id: stationId, from, to })}`),
  eto: (stationId: number, from: string, to: string) =>
    request<EtoResponse>(`/analytics/eto?${params({ station_id: stationId, from, to })}`),
  frost: (stationId: number, from: string, to: string) =>
    request<FrostResponse>(`/analytics/frost?${params({ station_id: stationId, from, to })}`),
  windRose: (stationId: number, from: string, to: string) =>
    request<WindRoseResponse>(`/analytics/wind-rose?${params({ station_id: stationId, from, to })}`),
  exportUrl: (stationId: number, variable: string, from: string, to: string, resolution: string) =>
    `${API_BASE}/export/series.csv?${params({ station_id: stationId, variable, from, to, resolution })}`,
};
