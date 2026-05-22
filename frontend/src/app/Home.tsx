import { Building2, FlaskConical, Leaf, MapPinned } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { useStations } from '../api/hooks';
import { formatDateTime } from '../lib/format';

const options = [
  { to: '/cientifico', title: 'Dashboard cientifico', text: 'Series, ET0, ombrotermico, heladas, NPK y rosa de vientos.', icon: FlaskConical, tone: 'border-water' },
  { to: '/gad', title: 'Dashboard GAD', text: 'Semaforos territoriales, alertas y resumen por estacion.', icon: Building2, tone: 'border-harvest' },
  { to: '/agricultor', title: 'Dashboard agricultor', text: 'Lectura movil con recomendaciones simples y accionables.', icon: Leaf, tone: 'border-canopy' },
];

export function Home() {
  const { data: stations = [] } = useStations();
  return (
    <div className="space-y-6">
      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-canopy">UPEC · Estaciones meteorologicas automaticas</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-ink md:text-4xl">AgroMetrIA</h1>
            <p className="mt-3 max-w-3xl text-slate-600">
              Plataforma web de lectura agrometeorologica sobre SQL Server Insights, orientada a investigadores,
              instituciones y agricultores.
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-field px-4 py-3 text-sm text-slate-700">
            <MapPinned className="mb-2 text-canopy" size={22} />
            6 estaciones · solo lectura · demo con fallback mock
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {options.map((option) => (
          <Link key={option.to} to={option.to} className={`focus-ring rounded-md border-l-4 ${option.tone} bg-white p-5 shadow-panel transition hover:-translate-y-0.5`}>
            <option.icon className="text-ink" size={28} />
            <h2 className="mt-4 text-lg font-bold">{option.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{option.text}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
        <h2 className="text-base font-bold">Estado de red</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stations.map((station) => (
            <div key={station.station_id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold">{station.name}</p>
                <StatusBadge status={station.data_status} />
              </div>
              <p className="mt-2 text-xs text-slate-500">Ultima lectura: {formatDateTime(station.latest_time)}</p>
              <p className="text-xs text-slate-500">{station.tag_count} sensores normalizados</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
