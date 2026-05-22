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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stations.map((station) => {
          const isActive = value === station.station_id;
          return (
            <button
              key={station.station_id}
              className={`flex min-h-touch w-full items-center justify-center whitespace-normal break-words rounded-2xl border-2 px-2 py-3 text-base font-bold leading-tight transition active:scale-[0.97] sm:text-lg ${
                isActive
                  ? 'border-canopy bg-canopy text-white shadow-md'
                  : 'border-slate-400 bg-white text-slate-700 shadow-sm hover:border-canopy hover:bg-canopyLight active:border-canopy active:bg-canopyLight'
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

  return (
    <label className="block">
      <span className="mb-2 block text-base font-bold text-slate-600">Elija su estación</span>
      <select
        className="focus-ring min-h-touch w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-lg font-semibold"
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
