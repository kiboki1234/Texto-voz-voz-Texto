# QA checklist

## Backend

- [ ] `GET /api/health` responde en modo SQL Server o mock.
- [ ] `GET /api/stations` devuelve seis estaciones.
- [ ] `GET /api/stations/102/latest` usa datos de `recentvalues`.
- [ ] `GET /api/stations/102/series` exige `variable`, `from` y `to`.
- [ ] HUACA muestra advertencia en NPK.
- [ ] Fumigacion devuelve `is_suitable` y razones.
- [ ] Helada blanca/negra se clasifica con temperatura minima y humedad.
- [ ] Export CSV descarga la serie filtrada.

## Frontend

- [ ] `/` muestra selector de dashboards.
- [ ] `/cientifico` permite cambiar estacion, variable y rango.
- [ ] `/cientifico` grafica serie con zoom y export CSV.
- [ ] `/gad` muestra las seis estaciones y alertas.
- [ ] `/agricultor` funciona en ancho movil.
- [ ] La app sobrevive si la API cae usando fallback mock.

## Demo

- [ ] Ejecutar con SQL Server real.
- [ ] Ejecutar con `USE_MOCK_DATA=true`.
- [ ] Mostrar DER logico.
- [ ] Explicar por que no se modifica la base YDOC.
- [ ] Mostrar una alerta explicable y una recomendacion de fumigacion.
