from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterable

from app.core.config import Settings


class DatabaseClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.use_mock_data = settings.force_mock_data or not bool(settings.mssql_password)
        self._last_error: str | None = None

    def _connection_string(self) -> str:
        return (
            f"DRIVER={{{self.settings.mssql_driver}}};"
            f"SERVER={self.settings.mssql_host},{self.settings.mssql_port};"
            f"DATABASE={self.settings.mssql_database};"
            f"UID={self.settings.mssql_user};"
            f"PWD={self.settings.mssql_password};"
            "TrustServerCertificate=yes;"
            "Encrypt=no;"
        )

    @contextmanager
    def connect(self):
        if self.use_mock_data:
            raise RuntimeError("SQL Server no configurado; API usando datos mock.")
        try:
            import pyodbc  # type: ignore
        except ImportError as exc:
            self.use_mock_data = True
            self._last_error = "pyodbc no esta instalado; API usando datos mock."
            raise RuntimeError(self._last_error) from exc

        connection = None
        try:
            connection = pyodbc.connect(self._connection_string(), timeout=5)
            yield connection
        except Exception as exc:  # pragma: no cover - depends on local SQL Server
            self._last_error = str(exc)
            raise RuntimeError(f"No se pudo consultar SQL Server: {exc}") from exc
        finally:
            if connection is not None:
                connection.close()

    def ping(self) -> str:
        if self.use_mock_data:
            return "mock"
        try:
            rows = self.fetch_all("SELECT 1 AS ok", [])
            return "reachable" if rows and rows[0]["ok"] == 1 else "unreachable"
        except RuntimeError:
            self.use_mock_data = True
            return "mock"

    def fetch_all(self, sql: str, params: Iterable[Any] | None = None) -> list[dict[str, Any]]:
        with self.connect() as connection:
            cursor = connection.cursor()
            cursor.execute(sql, list(params or []))
            columns = [column[0].lower() for column in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

    def fetch_one(self, sql: str, params: Iterable[Any] | None = None) -> dict[str, Any] | None:
        rows = self.fetch_all(sql, params)
        return rows[0] if rows else None
