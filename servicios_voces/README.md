# Voicebox Integration Adapter

Capa desacoplada entre el backend de AgroMetrIA y Voicebox (TTS/STT).

## Arquitectura

```
Frontend (React)
    │  HTTP
    ▼
Backend (FastAPI sync)
    │
    ▼
servicios_voces/
├── routes.py      →  Endpoints HTTP (/api/audio/*)
├── service.py     →  Lógica de negocio
├── client.py      →  Cliente HTTP (httpx sync)
├── schemas.py     →  DTOs con Pydantic
├── exceptions.py  →  Excepciones personalizadas
├── config.py      →  Config desde ENV
├── utils.py       →  Validación MIME/tamaño
    │  HTTP
    ▼
Voicebox REST API (http://127.0.0.1:17493)
    │
    ├── TTS  →  Texto a audio
    ├── STT  →  Audio a texto
    └── Profiles / Health
```

## Flujo de requests

```
TTS:
  POST /api/audio/tts  { text, profile_id, language }
    → VoiceboxService.synthesize()
    → VoiceboxClient.tts()
    → POST http://127.0.0.1:17493/api/audio/tts
    ← { audio_data, format, duration }

STT:
  POST /api/audio/stt  (multipart: audio file)
    → validate_audio_mime() / validate_file_size()
    → VoiceboxService.transcribe()
    → VoiceboxClient.stt()
    → POST http://127.0.0.1:17493/api/audio/stt (multipart)
    ← { text, confidence, language }
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/audio/health` | Health check de Voicebox |
| `GET` | `/api/audio/profiles` | Lista perfiles de voz |
| `POST` | `/api/audio/tts` | Texto → audio |
| `POST` | `/api/audio/stt` | Audio → texto |

## Ejemplos curl

```bash
# Health
curl http://localhost:8000/api/audio/health

# Profiles
curl http://localhost:8000/api/audio/profiles

# TTS
curl -X POST http://localhost:8000/api/audio/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hola mundo", "profile_id": "default", "language": "es"}'

# STT
curl -X POST http://localhost:8000/api/audio/stt \
  -F "audio=@audio.wav"
```

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `VOICEBOX_URL` | `http://127.0.0.1:17493` | URL base de Voicebox |
| `VOICEBOX_TIMEOUT` | `120` | Timeout en segundos |
| `VOICEBOX_MAX_FILE_SIZE` | `25` | Tamaño máximo en MB |

Agregar a `backend/.env`:

```env
VOICEBOX_URL=http://127.0.0.1:17493
VOICEBOX_TIMEOUT=120
VOICEBOX_MAX_FILE_SIZE=25
```

## Cómo levantar Voicebox localmente

```bash
# Desde servicios_voces/voicebox/
cd servicios_voces/voicebox/

# Instalar dependencias del backend
cd backend
pip install -r requirements.txt

# (O usar el entrypoint que tenga el proyecto)
# Ejemplo genérico:
uvicorn backend.main:app --host 127.0.0.1 --port 17493
```

## Streaming readiness

El cliente está diseñado para migrar a streaming async:
- `client.py` usa `httpx` (soporta nativamente streaming async)
- `service.py` puede recibir un callback para streaming
- Las rutas pueden migrarse a `async def` sin cambiar la interfaz

Para WebSockets/SSE en futuro:
- Agregar método `stream_tts()` en `VoiceboxClient` usando `client.stream()`
- Agregar ruta WebSocket en `routes.py`
- El servicio orquesta el streaming sin acoplar lógica
