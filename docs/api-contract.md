# Contrato API AgroMetrIA

Base URL local: `http://localhost:8000/api`

## Salud

`GET /health`

```json
{
  "status": "ok",
  "database": "reachable",
  "version": "1.0.0",
  "mode": "sqlserver"
}
```

## Estaciones

`GET /stations`

Devuelve las seis estaciones, excluyendo el nodo raiz `LOCID=2`.

## Ultimos valores

`GET /stations/{station_id}/latest`

Lee `recentvalues`, no `measurements`.

## Serie historica

`GET /stations/{station_id}/series?variable=Temp_AVG&from=2026-05-01&to=2026-05-19&resolution=daily`

Reglas:

- `variable`, `from` y `to` son obligatorios.
- `resolution`: `raw`, `hourly`, `daily`.
- En `daily`, `Lluvia` se suma; las demas variables se promedian.

## Analitica

- `GET /analytics/npk?station_id=102`
- `GET /analytics/spray-window?station_id=102`
- `GET /analytics/frost?station_id=102&from=2026-05-01&to=2026-05-19`
- `GET /analytics/eto?station_id=102&from=2026-05-01&to=2026-05-19`
- `GET /analytics/ombrothermal?station_id=102&year=2026`
- `GET /analytics/wind-rose?station_id=102&from=2026-05-01&to=2026-05-19`

## Alertas

- `GET /alerts/current`
- `GET /stations/{station_id}/alerts`

Todas las alertas incluyen severidad, categoria, titulo y mensaje explicable.
