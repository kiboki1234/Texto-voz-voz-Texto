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

export interface VariableOption {
  standard_name: string;
  display_name: string;
  category: string;
  unit: string;
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
  solar_radiation_max?: number | null;
  wind_speed_avg?: number | null;
  wind_speed_max?: number | null;
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
  year: number | null;
  from?: string;
  to?: string;
  rule?: string;
  months: {
    month: string;
    temperature_avg: number | null;
    temperature_2x: number | null;
    precipitation: number | null;
    dry: boolean | null;
    temperature_days: number;
    rain_days: number;
    data_status: 'ok' | 'missing';
  }[];
}

export interface EtoResponse {
  station_id: number;
  method: string;
  points: { date: string; eto: number | null; rainfall: number | null; water_balance?: number | null; deficit?: number | null }[];
}

export interface WindRoseResponse {
  station_id: number;
  source?: string;
  total_samples?: number;
  method?: string;
  sectors: { sector: string; count: number; avg_speed: number }[];
}

export interface FrostResponse {
  station_id: number;
  method?: string;
  events: {
    date: string;
    temp_min: number | null;
    temp_avg?: number | null;
    estimated_humidity: number | null;
    frost_probability: number | null;
    temperature_factor?: number | null;
    humidity_factor?: number | null;
    actual_vapor_pressure?: number | null;
    saturation_vapor_pressure?: number | null;
    risk: 'unknown' | 'normal' | 'watch' | 'critical';
    type: string | null;
    message: string;
  }[];
}
