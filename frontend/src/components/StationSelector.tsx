import type { Station } from '../api/types';

interface StationSelectorProps {
  stations?: Station[];
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
}

export function StationSelector({ stations = [], value, onChange, compact = false }: StationSelectorProps) {
  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {stations.map((station) => (
          <button
            key={station.station_id}
            className={`focus-ring rounded-md border px-3 py-2 text-sm font-bold transition ${
              value === station.station_id ? 'border-canopy bg-canopy text-white' : 'border-slate-200 bg-white text-slate-700'
            }`}
            onClick={() => onChange(station.station_id)}
          >
            {station.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Estacion</span>
      <select
        className="focus-ring w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {stations.map((station) => (
          <option key={station.station_id} value={station.station_id}>
            {station.name}
          </option>
        ))}
      </select>
    </label>
  );
}
