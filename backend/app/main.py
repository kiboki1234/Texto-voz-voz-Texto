from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.client import DatabaseClient
from app.db.repository import AgroRepository
from app.modules.analytics.routes import router as analytics_router
from app.modules.alerts.routes import router as alerts_router
from app.modules.exports.routes import router as exports_router
from app.modules.stations.routes import router as stations_router


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
    return app


app = create_app()
