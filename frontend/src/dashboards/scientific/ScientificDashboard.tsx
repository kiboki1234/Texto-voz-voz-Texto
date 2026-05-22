import ReactECharts from 'echarts-for-react';
import { Download, Droplets, Gauge, Leaf, Sun, Thermometer, Wind, Zap } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/client';
import { useEto, useFrost, useLatest, useNpk, useOmbrothermal, useSeries, useStations, useVariables, useWindRose } from '../../api/hooks';
import { ChartPanel } from '../../components/ChartPanel';
import { DateRangePicker } from '../../components/DateRangePicker';
import { HuacaWarningModal } from '../../components/HuacaWarningModal';
import { LoadingState } from '../../components/LoadingState';
import { MetricCard } from '../../components/MetricCard';
import { NpkStatus } from '../../components/NpkStatus';
import { StationSelector } from '../../components/StationSelector';
import { StatusBadge } from '../../components/StatusBadge';
import { formatDateTime, formatNumber } from '../../lib/format';

export function ScientificDashboard() {
  const [stationId, setStationId] = useState(102);
  const [variable, setVariable] = useState('Temp_AVG');
  const [from, setFrom] = useState(() => daysAgoInputValue(21));
  const [to, setTo] = useState(() => dateInputValue(new Date()));
  const resolution = 'daily';
  const [activeVars, setActiveVars] = useState<Set<string>>(() => new Set(['Temp_AVG', 'Lluvia']));

  const { data: stations = [] } = useStations();
  const { data: variables = [] } = useVariables();
  const { data: latest, isLoading: latestLoading } = useLatest(stationId);
  const { data: series, isLoading: seriesLoading } = useSeries(stationId, variable, from, to, resolution);
  const { data: npk } = useNpk(stationId);
  const { data: ombro } = useOmbrothermal(stationId, from, to);
  const { data: eto } = useEto(stationId, from, to);
  const { data: frost } = useFrost(stationId, from, to);
  const { data: windRose } = useWindRose(stationId, from, to);

  const { data: mvTemp }  = useSeries(stationId, 'Temp_AVG',     from, to, resolution, activeVars.has('Temp_AVG'));
  const { data: mvRain }  = useSeries(stationId, 'Lluvia',       from, to, resolution, activeVars.has('Lluvia'));
  const { data: mvHum }   = useSeries(stationId, 'Humedad_AVG',  from, to, resolution, activeVars.has('Humedad_AVG'));
  const { data: mvRad }   = useSeries(stationId, 'RadSol_AVG',   from, to, resolution, activeVars.has('RadSol_AVG'));
  const { data: mvWind }  = useSeries(stationId, 'VV_Sonic_AVG', from, to, resolution, activeVars.has('VV_Sonic_AVG'));

  const selectedStation = stations.find((station) => station.station_id === stationId);
  const latestMap = Object.fromEntries((latest?.variables ?? []).map((item) => [item.standard_name, item]));
  const seriesLabels = series?.points.map((point) => formatSeriesLabel(point.time, resolution)) ?? [];

  const mvXLabels = (mvTemp ?? mvRain ?? mvHum ?? mvRad ?? mvWind)
    ?.points.map(p => formatSeriesLabel(p.time, resolution)) ?? [];

  const mvSeries: object[] = [];
  if (activeVars.has('Temp_AVG') && mvTemp?.points?.length)
    mvSeries.push({ name: 'Temperatura (°C)', type: 'line', smooth: true, symbol: 'none', yAxisIndex: 0, color: '#ef4444', lineStyle: { color: '#ef4444', width: 2 }, data: mvTemp.points.map(p => p.value) });
  if (activeVars.has('Lluvia') && mvRain?.points?.length)
    mvSeries.push({ name: 'Precipitacion (mm)', type: 'bar', yAxisIndex: 1, color: '#06b6d4', barMaxWidth: 8, data: mvRain.points.map(p => p.value) });
  if (activeVars.has('Humedad_AVG') && mvHum?.points?.length)
    mvSeries.push({ name: 'Humedad relativa (%)', type: 'line', smooth: true, symbol: 'none', yAxisIndex: 0, color: '#10b981', lineStyle: { color: '#10b981', width: 2 }, data: mvHum.points.map(p => p.value) });
  if (activeVars.has('RadSol_AVG') && mvRad?.points?.length)
    mvSeries.push({ name: 'Radiacion solar (W/m²)', type: 'line', smooth: true, symbol: 'none', yAxisIndex: 0, color: '#eab308', lineStyle: { color: '#eab308', width: 2 }, data: mvRad.points.map(p => p.value) });
  if (activeVars.has('VV_Sonic_AVG') && mvWind?.points?.length)
    mvSeries.push({ name: 'Viento (m/s)', type: 'line', smooth: true, symbol: 'none', yAxisIndex: 0, color: '#94a3b8', lineStyle: { color: '#94a3b8', width: 2 }, data: mvWind.points.map(p => p.value) });

  function handleToggle(key: string) {
    setActiveVars(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <HuacaWarningModal active={stationId === 101} context="cientifico" />
      <section className="flex flex-col gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-panel lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase text-water">Dashboard cientifico</p>
          <h1 className="mt-1 text-2xl font-bold tracking-normal">Exploracion agrometeorologica</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Variables normalizadas desde YDOC Insights. HUACA conserva advertencias porque sus nutrientes usan unidades distintas.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard title="Temperatura" value={formatNumber(latestMap.Temp_AVG?.value)} unit="C" icon={<Thermometer size={20} />} tone="blue" caption="Promedio actual" />
        <MetricCard title="Humedad" value={formatNumber(latestMap.Humedad_AVG?.value)} unit="%" icon={<Droplets size={20} />} tone="green" caption="Humedad relativa" />
        <MetricCard title="Lluvia" value={formatNumber(latestMap.Lluvia?.value)} unit="mm" icon={<Gauge size={20} />} tone="neutral" caption="Lectura reciente" />
        <MetricCard title="Radiacion" value={formatNumber(latestMap.RadSol_AVG?.value, 0)} unit="W/m2" icon={<Sun size={20} />} tone="amber" caption="Radiacion solar promedio" />
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

        <ChartPanel title="Variables en el tiempo" subtitle="Eje izquierdo: temp / humedad / radiacion / viento · Eje derecho: precipitacion">
          <div className="flex gap-4">
            <div className="flex-1 min-w-0">
              <ReactECharts
                notMerge
                style={{ height: 360 }}
                option={{
                  tooltip: {
                    trigger: 'axis',
                    formatter: (params: any[]) =>
                      `<b>${params[0]?.name ?? ''}</b><br/>` +
                      params.map((p: any) =>
                        `${p.marker}${p.seriesName}: <b>${p.value != null ? Number(p.value).toFixed(2) : '—'}</b>`
                      ).join('<br/>'),
                  },
                  legend: { data: mvSeries.map((s: any) => s.name), bottom: 0, textStyle: { fontSize: 11 } },
                  grid: { left: 48, right: 48, top: 12, bottom: 56 },
                  dataZoom: [{ type: 'inside' }, { type: 'slider', height: 20 }],
                  xAxis: { type: 'category', data: mvXLabels, axisLabel: { fontSize: 11 } },
                  yAxis: [
                    { type: 'value', position: 'left', axisLabel: { fontSize: 10, formatter: (v: number) => v.toFixed(1) }, splitLine: { lineStyle: { color: '#f1f5f9' } } },
                    { type: 'value', name: 'mm', position: 'right', splitLine: { show: false }, axisLabel: { fontSize: 10, formatter: (v: number) => v.toFixed(1) } },
                  ],
                  series: mvSeries,
                }}
              />
            </div>
            <div className="w-40 shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Variables</p>
              {MULTI_VARS.map(v => (
                <label key={v.key} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={activeVars.has(v.key)}
                    onChange={() => handleToggle(v.key)}
                    style={{ accentColor: v.color }}
                    className="h-4 w-4 shrink-0 rounded"
                  />
                  <span className="h-2.5 w-5 shrink-0 rounded-sm" style={{ backgroundColor: v.color }} />
                  <span className="leading-tight">
                    <span className="text-xs font-medium text-slate-700">{v.label}</span>
                    <span className="ml-1 text-xs text-slate-400">({v.unit})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </ChartPanel>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ChartPanel title="Diagrama Ombrotermico (P vs 2T)" subtitle={`${from} a ${to} · Precipitacion mensual P vs temperatura duplicada 2T`}>
          <ReactECharts
            style={{ height: 300 }}
            option={{
              tooltip: { trigger: 'axis' },
              legend: { bottom: 0 },
              grid: { left: 44, right: 20, top: 24, bottom: 48 },
              xAxis: { type: 'category', data: ombro?.months.map((month) => month.month) ?? [] },
              yAxis: { type: 'value', name: 'P mm / 2xTemp C' },
              series: [
                {
                  name: 'Precipitacion',
                  type: 'line',
                  smooth: false,
                  symbol: 'circle',
                  symbolSize: 7,
                  color: '#4f8df7',
                  data: ombro?.months.map((month) => ({
                    value: month.precipitation,
                    itemStyle: { color: month.dry ? '#c98320' : '#4f8df7' },
                  })) ?? [],
                },
                {
                  name: 'Temperatura (2T)',
                  type: 'line',
                  smooth: false,
                  symbol: 'circle',
                  symbolSize: 7,
                  color: '#85dc8b',
                  data: ombro?.months.map((month) => ({
                    value: month.temperature_2x,
                    itemStyle: { color: '#85dc8b' },
                  })) ?? [],
                },
              ],
            }}
          />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="border-b border-slate-200 uppercase text-slate-500">
                <tr>
                  <th className="py-2">Mes</th>
                  <th>T media</th>
                  <th>2T</th>
                  <th>P real</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ombro?.months.map((month) => (
                  <tr key={month.month} className="border-b border-slate-100">
                    <td className="py-2 font-semibold">{month.month}</td>
                    <td>{formatNumber(month.temperature_avg)} C</td>
                    <td>{formatNumber(month.temperature_2x)}</td>
                    <td>{formatNumber(month.precipitation)} mm</td>
                    <td className={month.data_status === 'missing' ? 'text-slate-500' : month.dry ? 'text-amber-700' : 'text-emerald-700'}>
                      {month.data_status === 'missing' ? 'sin datos' : month.dry ? 'seco' : 'humedo'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartPanel>

        <ChartPanel title="ET0, lluvia y deficit hídrico" subtitle={eto?.method}>
          <ReactECharts
            style={{ height: 300 }}
            option={{
              tooltip: { trigger: 'axis' },
              legend: { bottom: 0 },
              grid: { left: 44, right: 20, top: 24, bottom: 48 },
              xAxis: { type: 'category', data: eto?.points.map((point) => point.date.slice(5)) ?? [] },
              yAxis: { type: 'value', name: 'mm/dia' },
              series: [
                { name: 'ET0', type: 'line', data: eto?.points.map((point) => point.eto) ?? [], color: '#1f7a5c' },
                { name: 'Lluvia', type: 'bar', data: eto?.points.map((point) => point.rainfall) ?? [], color: '#137ea0' },
                { name: 'Deficit Hídrico', type: 'line', data: eto?.points.map((point) => point.deficit) ?? [], color: '#b42318', lineStyle: { type: 'dashed' }, symbol: 'none' },
              ],
            }}
          />
        </ChartPanel>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ChartPanel title="Probabilidad de helada" subtitle="Ecuaciones con Temp_Min y Temp_AVG: e, e_s, HR estimada y probabilidad">
          <ReactECharts
            style={{ height: 380 }}
            option={{
              tooltip: { trigger: 'axis' },
              legend: {
                type: 'scroll',
                top: 0,
                left: 8,
                right: 8,
                itemGap: 12,
                textStyle: { fontSize: 11 },
              },
              grid: { left: 48, right: 54, top: 88, bottom: 78 },
              xAxis: {
                type: 'category',
                data: frost?.events.map((event) => event.date.slice(5)) ?? [],
                axisLabel: {
                  interval: 'auto',
                  rotate: 35,
                  hideOverlap: true,
                  margin: 14,
                  fontSize: 11,
                },
              },
              yAxis: [
                { type: 'value', name: 'C', nameGap: 26 },
                { type: 'value', name: 'HR / Prob %', min: 0, max: 100, nameGap: 30 },
              ],
              series: [
                { name: 'Temp_Min', type: 'line', data: frost?.events.map((event) => event.temp_min) ?? [], color: '#b42318', symbolSize: 6 },
                { name: 'Temp_AVG', type: 'line', data: frost?.events.map((event) => event.temp_avg) ?? [], color: '#64748b', symbolSize: 5 },
                { name: 'HR estimada', type: 'line', yAxisIndex: 1, data: frost?.events.map((event) => event.estimated_humidity) ?? [], color: '#7c3aed', symbolSize: 6 },
                { name: 'Probabilidad helada', type: 'line', yAxisIndex: 1, data: frost?.events.map((event) => event.frost_probability) ?? [], color: '#b42318', lineStyle: { type: 'dashed' }, symbolSize: 6 },
                { name: 'Umbral helada 0C', type: 'line', data: frost?.events.map(() => 0) ?? [], color: '#b42318', lineStyle: { type: 'dotted' }, symbol: 'none' },
                { name: 'Umbral HR 70%', type: 'line', yAxisIndex: 1, data: frost?.events.map(() => 70) ?? [], color: '#7c3aed', lineStyle: { type: 'dotted' }, symbol: 'none' },
              ],
            }}
          />
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <p className="font-semibold">Metodologia aplicada</p>
            <p className="mt-1">e con Temp_Min; e_s con Temp_AVG; HR estimada=(e/e_s)*100. Probabilidad = factor temperatura * (0.70 + 0.30 * factor humedad) * 100. Si Temp_Min ≤ 0 C: blanca con HR ≥ 70%, negra con HR &lt; 70%.</p>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-slate-200 uppercase text-slate-500">
                <tr>
                  <th className="py-2">Fecha</th>
                  <th>Temp_Min</th>
                  <th>Temp_AVG</th>
                  <th>e</th>
                  <th>e_s</th>
                  <th>HR estimada</th>
                  <th>Probabilidad</th>
                  <th>Clasificacion</th>
                </tr>
              </thead>
              <tbody>
                {frost?.events.map((event) => (
                  <tr key={event.date} className="border-b border-slate-100">
                    <td className="py-2 font-semibold">{event.date}</td>
                    <td>{formatNumber(event.temp_min)} C</td>
                    <td>{formatNumber(event.temp_avg)} C</td>
                    <td>{formatNumber(event.actual_vapor_pressure, 3)} hPa</td>
                    <td>{formatNumber(event.saturation_vapor_pressure, 3)} hPa</td>
                    <td>{formatNumber(event.estimated_humidity)}%</td>
                    <td className={(event.frost_probability ?? 0) >= 50 ? 'font-bold text-amber-700' : 'text-emerald-700'}>{formatNumber(event.frost_probability)}%</td>
                    <td className={event.risk === 'critical' ? 'font-bold text-red-700' : event.risk === 'watch' ? 'font-bold text-amber-700' : 'text-emerald-700'}>{event.type ? `Helada ${event.type}` : event.risk === 'watch' ? 'Vigilancia' : 'Sin helada'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {frost?.events.filter((event) => event.risk !== 'normal').slice(0, 3).map((event) => (
              <div key={event.date} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p className="font-bold">{event.date}</p>
                <p>{event.message}</p>
                <p className="mt-1 text-xs">Probabilidad: {formatNumber(event.frost_probability)}%</p>
                <p className="mt-1 text-xs">HR estimada: {formatNumber(event.estimated_humidity)}%</p>
              </div>
            ))}
          </div>
        </ChartPanel>
        <ChartPanel title="Estado Nutricional del Suelo (NPK)" subtitle="Comparacion contra rangos optimos por cultivo · mg/Kg">
          <NpkStatus data={npk} />
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2 text-left">Nutriente</th>
                  <th className="px-4 py-2 text-center text-amber-700">Deficiente</th>
                  <th className="px-4 py-2 text-center text-emerald-700">Optimo</th>
                  <th className="px-4 py-2 text-center text-red-700">Exceso</th>
                </tr>
              </thead>
              <tbody>
                {NPK_RANGES.map((r) => (
                  <tr key={r.key} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 font-semibold text-slate-700">{r.label}</td>
                    <td className="px-4 py-2.5 text-center text-amber-700">&lt; {r.low} mg/Kg</td>
                    <td className="px-4 py-2.5 text-center font-semibold text-emerald-700">{r.low}–{r.high} mg/Kg</td>
                    <td className="px-4 py-2.5 text-center text-red-700">&gt; {r.high} mg/Kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartPanel>
        <ChartPanel title="Rosa de vientos" subtitle={windRose?.method ?? 'Direccion por muestra, velocidad media por sector'}>
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
        <ChartPanel title="Ultimas lecturas normalizadas" subtitle="Contrato backend sobre measurements">
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

function dateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function daysAgoInputValue(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return dateInputValue(date);
}

function formatSeriesLabel(time: string, resolution: string) {
  if (resolution === 'daily') return time.slice(0, 10);
  return time.replace('T', ' ').slice(0, 16);
}

const MULTI_VARS = [
  { key: 'Temp_AVG',     label: 'Temperatura',      unit: '°C',   color: '#ef4444' },
  { key: 'Lluvia',       label: 'Precipitacion',    unit: 'mm',   color: '#06b6d4' },
  { key: 'Humedad_AVG',  label: 'Humedad relativa', unit: '%',    color: '#10b981' },
  { key: 'RadSol_AVG',   label: 'Radiacion solar',  unit: 'W/m²', color: '#eab308' },
  { key: 'VV_Sonic_AVG', label: 'Viento',           unit: 'm/s',  color: '#94a3b8' },
] as const;

const NPK_RANGES = [
  { key: 'N', label: 'Nitrogeno', low: 20, high: 40 },
  { key: 'P', label: 'Fosforo',   low: 10, high: 30 },
  { key: 'K', label: 'Potasio',   low: 80, high: 200 },
] as const;
