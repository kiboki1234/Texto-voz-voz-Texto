import ReactECharts from 'echarts-for-react';
import { Download, Droplets, Gauge, Leaf, Sun, Thermometer, Wind, Zap } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/client';
import { useEto, useFrost, useLatest, useNpk, useOmbrothermal, useSeries, useStations, useVariables, useWindRose } from '../../api/hooks';
import { ChartPanel } from '../../components/ChartPanel';
import { DateRangePicker } from '../../components/DateRangePicker';
import { LoadingState } from '../../components/LoadingState';
import { MetricCard } from '../../components/MetricCard';
import { NpkStatus } from '../../components/NpkStatus';
import { StationSelector } from '../../components/StationSelector';
import { StatusBadge } from '../../components/StatusBadge';
import { formatDateTime, formatNumber } from '../../lib/format';

export function ScientificDashboard() {
  const [stationId, setStationId] = useState(102);
  const [variable, setVariable] = useState('Temp_AVG');
  const [from, setFrom] = useState('2026-05-01');
  const [to, setTo] = useState('2026-05-19');
  const [resolution, setResolution] = useState('daily');

  const { data: stations = [] } = useStations();
  const { data: variables = [] } = useVariables();
  const { data: latest, isLoading: latestLoading } = useLatest(stationId);
  const { data: series, isLoading: seriesLoading } = useSeries(stationId, variable, from, to, resolution);
  const { data: npk } = useNpk(stationId);
  const { data: ombro } = useOmbrothermal(stationId, 2026);
  const { data: eto } = useEto(stationId, from, to);
  const { data: frost } = useFrost(stationId, from, to);
  const { data: windRose } = useWindRose(stationId, from, to);

  const selectedStation = stations.find((station) => station.station_id === stationId);
  const latestMap = Object.fromEntries((latest?.variables ?? []).map((item) => [item.standard_name, item]));

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-panel lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase text-water">Dashboard cientifico</p>
          <h1 className="mt-1 text-2xl font-bold tracking-normal">Exploracion agrometeorologica</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Variables normalizadas desde YDOC Insights. HUACA conserva advertencias por nomenclatura y unidad NPK.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StationSelector stations={stations} value={stationId} onChange={setStationId} />
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Variable</span>
            <select className="focus-ring w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold" value={variable} onChange={(event) => setVariable(event.target.value)}>
              {variables.map((item) => (
                <option key={item.standard_name} value={item.standard_name}>
                  {item.standard_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Resolucion</span>
            <select className="focus-ring w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold" value={resolution} onChange={(event) => setResolution(event.target.value)}>
              <option value="raw">Raw</option>
              <option value="hourly">Horaria</option>
              <option value="daily">Diaria</option>
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Temperatura" value={formatNumber(latestMap.Temp_AVG?.value)} unit="C" icon={<Thermometer size={20} />} tone="blue" caption="Promedio actual" />
        <MetricCard title="Humedad" value={formatNumber(latestMap.Humedad_AVG?.value)} unit="%" icon={<Droplets size={20} />} tone="green" caption="Humedad relativa" />
        <MetricCard title="Lluvia" value={formatNumber(latestMap.Lluvia?.value)} unit="mm" icon={<Gauge size={20} />} tone="neutral" caption="Lectura reciente" />
        <MetricCard title="Bateria" value={formatNumber(latestMap.Bateria?.value, 2)} unit="V" icon={<Zap size={20} />} tone={(latestMap.Bateria?.value ?? 4) < 3.7 ? 'red' : 'amber'} caption={selectedStation ? formatDateTime(selectedStation.latest_time) : ''} />
      </section>

      {latest?.warnings?.length ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {latest.warnings.join(' ')}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <ChartPanel title="Estado de estacion" subtitle={selectedStation?.rtu_info}>
            {selectedStation ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold">{selectedStation.name}</p>
                  <StatusBadge status={selectedStation.data_status} />
                </div>
                <p className="text-sm text-slate-600">Codigo: {selectedStation.code}</p>
                <p className="text-sm text-slate-600">Sensores: {selectedStation.tag_count}</p>
                <p className="text-sm text-slate-600">Ultima lectura: {formatDateTime(selectedStation.latest_time)}</p>
              </div>
            ) : <LoadingState />}
          </ChartPanel>

          <ChartPanel title="Rango historico">
            <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
            <a
              className="focus-ring mt-3 inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-bold text-white"
              href={api.exportUrl(stationId, variable, from, to, resolution)}
            >
              <Download size={16} />
              CSV
            </a>
          </ChartPanel>
        </div>

        <ChartPanel title="Serie historica" subtitle={`${variable} · ${series?.unit ?? ''}`}>
          {seriesLoading ? <LoadingState /> : (
            <ReactECharts
              style={{ height: 360 }}
              option={{
                tooltip: { trigger: 'axis' },
                grid: { left: 48, right: 24, top: 28, bottom: 70 },
                dataZoom: [{ type: 'inside' }, { type: 'slider', height: 24 }],
                xAxis: { type: 'category', data: series?.points.map((point) => point.time.slice(0, 10)) ?? [] },
                yAxis: { type: 'value', name: series?.unit },
                series: [{ type: 'line', smooth: true, symbol: 'none', lineStyle: { color: '#137ea0', width: 2 }, areaStyle: { color: 'rgba(19, 126, 160, 0.12)' }, data: series?.points.map((point) => point.value) ?? [] }],
              }}
            />
          )}
        </ChartPanel>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ChartPanel title="Ombrotermico Gaussen" subtitle="Periodo seco si P <= 2T">
          <ReactECharts
            style={{ height: 300 }}
            option={{
              tooltip: { trigger: 'axis' },
              legend: { bottom: 0 },
              grid: { left: 44, right: 20, top: 24, bottom: 48 },
              xAxis: { type: 'category', data: ombro?.months.map((month) => month.month) ?? [] },
              yAxis: [{ type: 'value', name: 'T C' }, { type: 'value', name: 'P mm' }],
              series: [
                { name: 'Temperatura', type: 'line', data: ombro?.months.map((month) => month.temperature_avg) ?? [], yAxisIndex: 0, color: '#c98320' },
                { name: 'Precipitacion', type: 'bar', data: ombro?.months.map((month) => month.precipitation) ?? [], yAxisIndex: 1, color: '#137ea0' },
              ],
            }}
          />
        </ChartPanel>

        <ChartPanel title="ET0 y lluvia" subtitle={eto?.method}>
          <ReactECharts
            style={{ height: 300 }}
            option={{
              tooltip: { trigger: 'axis' },
              legend: { bottom: 0 },
              grid: { left: 44, right: 20, top: 24, bottom: 48 },
              xAxis: { type: 'category', data: eto?.points.map((point) => point.date.slice(5)) ?? [] },
              yAxis: [{ type: 'value', name: 'ET0' }, { type: 'value', name: 'mm' }],
              series: [
                { name: 'ET0', type: 'line', data: eto?.points.map((point) => point.eto) ?? [], color: '#1f7a5c' },
                { name: 'Lluvia', type: 'bar', data: eto?.points.map((point) => point.rainfall) ?? [], yAxisIndex: 1, color: '#137ea0' },
              ],
            }}
          />
        </ChartPanel>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ChartPanel title="Heladas y punto de rocio" subtitle="Temp_Min + Humedad_AVG, clasificacion blanca/negra">
          <ReactECharts
            style={{ height: 300 }}
            option={{
              tooltip: { trigger: 'axis' },
              legend: { bottom: 0 },
              grid: { left: 44, right: 20, top: 24, bottom: 48 },
              xAxis: { type: 'category', data: frost?.events.map((event) => event.date.slice(5)) ?? [] },
              yAxis: { type: 'value', name: 'C' },
              series: [
                { name: 'Temp_Min', type: 'line', data: frost?.events.map((event) => event.temp_min) ?? [], color: '#b42318' },
                { name: 'Punto rocio', type: 'line', data: frost?.events.map((event) => event.dew_point) ?? [], color: '#137ea0' },
                { name: 'Umbral 2C', type: 'line', data: frost?.events.map(() => 2) ?? [], color: '#c98320', lineStyle: { type: 'dashed' }, symbol: 'none' },
              ],
            }}
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {frost?.events.filter((event) => event.risk !== 'normal').slice(0, 3).map((event) => (
              <div key={event.date} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p className="font-bold">{event.date}</p>
                <p>{event.message}</p>
              </div>
            ))}
          </div>
        </ChartPanel>
        <ChartPanel title="NPK suelo" subtitle="Bandas: deficiente, optimo, exceso">
          <NpkStatus data={npk} />
        </ChartPanel>
        <ChartPanel title="Rosa de vientos" subtitle="DV_Sonic_AVG + VV_Sonic_AVG">
          <ReactECharts
            style={{ height: 300 }}
            option={{
              tooltip: {},
              angleAxis: { type: 'category', data: windRose?.sectors.map((item) => item.sector) ?? [] },
              radiusAxis: {},
              polar: {},
              series: [{ type: 'bar', coordinateSystem: 'polar', data: windRose?.sectors.map((item) => item.avg_speed) ?? [], itemStyle: { color: '#1f7a5c' } }],
            }}
          />
        </ChartPanel>
      </section>

      {latestLoading ? <LoadingState /> : (
        <ChartPanel title="Ultimas lecturas normalizadas" subtitle="Contrato backend sobre recentvalues">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">TAG</th>
                  <th>Variable estandar</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                  <th>Unidad</th>
                  <th>Calidad</th>
                </tr>
              </thead>
              <tbody>
                {latest?.variables.map((item) => (
                  <tr key={`${item.code}-${item.standard_name}`} className="border-b border-slate-100">
                    <td className="py-2 font-mono text-xs">{item.code}</td>
                    <td className="font-semibold">{item.standard_name}</td>
                    <td>{item.category}</td>
                    <td>{formatNumber(item.value)}</td>
                    <td>{item.unit}</td>
                    <td className={item.quality === 'warning' ? 'text-amber-700' : 'text-emerald-700'}>{item.quality}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartPanel>
      )}
    </div>
  );
}
