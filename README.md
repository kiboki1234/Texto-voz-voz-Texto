# AgroMetrIA

Plataforma web agrometeorologica para el reto DevIAthon UPEC. Lee SQL Server `Insights` en modo solo lectura y ofrece tres dashboards: cientifico, GAD/institucional y agricultor.

## Estructura

```text
backend/    FastAPI, pyodbc, reglas agrometeorologicas
frontend/   React + Vite + TypeScript + ECharts
docs/       DER, contrato API, QA, pitch
```

## Backend

```powershell
cd C:\Users\andres\Documents\Deviathon\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Para demo sin SQL Server:

```powershell
$env:USE_MOCK_DATA="true"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend

```powershell
cd C:\Users\andres\Documents\Deviathon\frontend
npm install
npm run dev
```

Variables opcionales:

```text
VITE_API_URL=http://localhost:8000/api
VITE_USE_MOCKS=true
```

## Endpoints principales

- `GET /api/health`
- `GET /api/stations`
- `GET /api/stations/{station_id}/latest`
- `GET /api/stations/{station_id}/series`
- `GET /api/alerts/current`
- `GET /api/analytics/spray-window`
- `GET /api/analytics/npk`
- `GET /api/export/series.csv`

## Seguridad de datos

AgroMetrIA no crea tablas, no altera relaciones fisicas y no escribe en SQL Server. Toda relacion se resuelve en backend sobre el modelo logico YDOC.
