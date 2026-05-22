<<<<<<< HEAD
import asyncio
import logging
=======
import sys
from pathlib import Path
>>>>>>> 6979b0c (servicio voces)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings

_project_root = Path(__file__).resolve().parents[2]
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))
from app.db.client import DatabaseClient
from app.db.repository import AgroRepository
from app.modules.analytics.routes import router as analytics_router
from app.modules.alerts.rules import AlertEngine
from app.modules.alerts.routes import router as alerts_router
from app.modules.exports.routes import router as exports_router
from app.modules.stations.routes import router as stations_router
<<<<<<< HEAD
from app.modules.telegram.routes import router as telegram_router
from app.modules.telegram.service import TelegramNotifier, format_gad_alert_message


logger = logging.getLogger(__name__)
=======
from servicios_voces.routes import router as audio_router
from servicios_voces.service import VoiceboxService
>>>>>>> 6979b0c (servicio voces)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="API de solo lectura para dashboards agrometeorologicos UPEC.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    db = DatabaseClient(settings)
    repository = AgroRepository(db)
    app.state.db = db
    app.state.repository = repository

    voicebox_service = VoiceboxService()
    app.state.voicebox_service = voicebox_service

    @app.exception_handler(ValueError)
    async def value_error_handler(_: Request, exc: ValueError) -> JSONResponse:
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.exception_handler(RuntimeError)
    async def runtime_error_handler(_: Request, exc: RuntimeError) -> JSONResponse:
        return JSONResponse(status_code=503, content={"detail": str(exc)})

    @app.get("/api/health")
    def health() -> dict:
        database_status = db.ping()
        return {
            "status": "ok",
            "database": database_status,
            "version": settings.app_version,
            "mode": "sqlserver",
        }

    app.include_router(stations_router, prefix="/api")
    app.include_router(alerts_router, prefix="/api")
    app.include_router(analytics_router, prefix="/api")
    app.include_router(exports_router, prefix="/api")
<<<<<<< HEAD
    app.include_router(telegram_router, prefix="/api")

    @app.on_event("startup")
    async def start_telegram_notifications() -> None:
        if not settings.telegram_notifications_enabled:
            return
        notifier = TelegramNotifier(settings)
        if not notifier.is_configured or not notifier.has_default_chat:
            logger.warning("Telegram notifications enabled but token or chat_id is missing.")
            return
        app.state.telegram_task = asyncio.create_task(_telegram_alert_loop(app))

    @app.on_event("shutdown")
    async def stop_telegram_notifications() -> None:
        task = getattr(app.state, "telegram_task", None)
        if task is None:
            return
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

=======
    app.include_router(audio_router, prefix="/api")
>>>>>>> 6979b0c (servicio voces)
    return app


app = create_app()


async def _telegram_alert_loop(app: FastAPI) -> None:
    while True:
        try:
            await asyncio.to_thread(_send_current_alert_report, app)
        except Exception:
            logger.exception("Telegram notification cycle failed.")
        await asyncio.sleep(max(60, settings.telegram_alert_interval_seconds))


def _send_current_alert_report(app: FastAPI) -> None:
    engine = AlertEngine()
    alerts = []
    for summary in app.state.repository.get_summaries():
        alerts.extend(alert.as_dict() for alert in engine.evaluate(summary))
    TelegramNotifier(settings).send_message(format_gad_alert_message(alerts))
