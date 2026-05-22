# Decisiones tecnicas

## Stack

- Backend: FastAPI + pyodbc por compatibilidad directa con SQL Server.
- Frontend: React + Vite + TypeScript porque los tres dashboards son interactivos.
- Graficas: Apache ECharts por zoom, series temporales, barras y polar.
- Cache: TTL futuro en memoria; no se incluye Redis para el MVP.
- IA: motor de reglas explicables, no LLM tomando decisiones agronomicas criticas.

## Base de datos

La base `Insights` se trata como fuente externa de solo lectura. AgroMetrIA no ejecuta migraciones ni `ALTER TABLE` sobre SQL Server.

## Fallback demo

El backend cambia a mock si `USE_MOCK_DATA=true`, falta `MSSQL_PASSWORD` o no se puede usar `pyodbc`. El frontend tambien tiene fallback mock si la API no responde.

## Limitaciones declaradas

- El clon auditado llega hasta `2026-05-19 12:00:00`; el servidor principal puede tener datos mas recientes.
- ET0 usa Hargreaves-Samani simplificado con `Ra=15` por falta de latitud/altitud confirmada.
- HUACA muestra NPK como referencia porque su unidad debe validarse.
- Las recomendaciones son apoyo tecnico, no prescripcion agronomica definitiva.
