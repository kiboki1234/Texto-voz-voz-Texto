from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _load_env_file() -> None:
    backend_dir = Path(__file__).resolve().parents[2]
    env_path = backend_dir / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _csv_env(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


_load_env_file()


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "AgroMetrIA")
    app_env: str = os.getenv("APP_ENV", "local")
    app_version: str = os.getenv("APP_VERSION", "1.0.0")

    mssql_host: str = os.getenv("MSSQL_HOST", "10.100.100.45")
    mssql_port: int = int(os.getenv("MSSQL_PORT", "1433"))
    mssql_database: str = os.getenv("MSSQL_DATABASE", "Insights")
    mssql_user: str = os.getenv("MSSQL_USER", "agro8")
    mssql_password: str = os.getenv("MSSQL_PASSWORD", "")
    mssql_driver: str = os.getenv("MSSQL_DRIVER", "ODBC Driver 17 for SQL Server")

    cors_origins: list[str] = None  # type: ignore[assignment]
    cache_ttl_seconds: int = int(os.getenv("CACHE_TTL_SECONDS", "60"))

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "cors_origins",
            _csv_env("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"),
        )


settings = Settings()
