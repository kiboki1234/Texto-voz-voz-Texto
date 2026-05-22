export type StationStatus = 'online' | 'stale' | 'offline';

export interface Station {
  station_id: number;
  name: string;
  code?: string;
  device_code?: string;
  rtu_info?: string;
  latest_time?: string;
  data_status: StationStatus;
  tag_count: number;
}

export interface VariableReading {
  code: string;
  standard_name: string;
  display_name: string;
  category: string;
  value: number | null;
  unit: string;
  quality: 'ok' | 'warning';
  warning?: string;
  measured_at?: string;
}

export interface LatestResponse {
  station_id: number;
  station_name: string;
  latest_time?: string;
  variables: VariableReading[];
  warnings: string[];
}

export interface SeriesPoint {
  time: string;
  value: number;
}

export interface SeriesResponse {
  station_id: number;
  station_name: string;
  variable: string;
  unit: string;
  resolution: string;
  points: SeriesPoint[];
}

export interface Summary {
  station_id: number;
  station_name: string;
  latest_time?: string;
  data_status: StationStatus;
  temperature_avg?: number | null;
  temperature_min?: number | null;
  temperature_max?: number | null;
  humidity_avg?: number | null;
  rainfall?: number | null;
  solar_radiation_avg?: number | null;
  wind_speed_avg?: number | null;
  wind_direction_avg?: number | null;
  battery_voltage?: number | null;
  leaf_humidity_avg?: number | null;
  nitrogen?: number | null;
  phosphorus?: number | null;
  potassium?: number | null;
  alerts?: Alert[];
  warnings?: string[];
}

export interface Alert {
  id: string;
  station_id: number;
  station_name: string;
  severity: 'info' | 'warning' | 'critical';
  category: string;
  title: string;
  message: string;
  value?: number | null;
  unit?: string | null;
}

export interface SprayWindow {
  station_id: number;
  station_name: string;
  is_suitable: boolean;
  decision: 'apta' | 'no_apta';
  message: string;
  reasons: string[];
}

export interface NpkResponse {
  station_id: number;
  station_name: string;
  warning?: string | null;
  nutrients: Record<'N' | 'P' | 'K', { status: string; label: string; value: number | null }>;
}

export interface OmbrothermalResponse {
  station_id: number;
  year: number;
  months: { month: string; temperature_avg: number | null; precipitation: number; dry: boolean }[];
}

export interface EtoResponse {
  station_id: number;
  method: string;
  points: { date: string; eto: number | null; rainfall: number | null }[];
}

export interface WindRoseResponse {
  station_id: number;
  sectors: { sector: string; count: number; avg_speed: number }[];
}
