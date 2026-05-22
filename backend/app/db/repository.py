from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from app.db.client import DatabaseClient
from app.modules.telemetry.normalizer import VariableNormalizer


class AgroRepository:
    def __init__(self, db: DatabaseClient) -> None:
        self.db = db
        self.normalizer = VariableNormalizer()

    def get_stations(self) -> list[dict[str, Any]]:
        sql = """
            SELECT
                l.LOCID AS station_id,
                l.LOCNAME AS name,
                l.LOCCODE AS code,
                l.DAQCODE AS device_code,
                da.DESCRIPTION AS rtu_info,
                mx.latest_time AS latest_time,
                COUNT(DISTINCT t.TAGID) AS tag_count
            FROM dbo.locations l
            LEFT JOIN dbo.DigitalAssets da
                ON da.LOCID = l.LOCID
               AND da.ASSETNAME = 'RTUINFO'
            LEFT JOIN dbo.tags t
                ON t.LOCID = l.LOCID
            LEFT JOIN (
                SELECT
                    tx.LOCID,
                    MAX(m.TIMEOFMEASUREMENT) AS latest_time
                FROM dbo.measurements m
                JOIN dbo.tags tx ON tx.TAGID = m.TAGID
                GROUP BY tx.LOCID
            ) mx ON mx.LOCID = l.LOCID
            WHERE l.LOCID <> 2
            GROUP BY l.LOCID, l.LOCNAME, l.LOCCODE, l.DAQCODE, da.DESCRIPTION, mx.latest_time
            ORDER BY l.LOCID
        """
        rows = self.db.fetch_all(sql)
        return [self._station_from_row(row) for row in rows]

    def get_station(self, station_id: int) -> dict[str, Any] | None:
        return next((station for station in self.get_stations() if station["station_id"] == station_id), None)

    def get_latest(self, station_id: int) -> dict[str, Any]:
        station = self.get_station(station_id)
        if station is None:
            raise ValueError(f"Estacion {station_id} no existe.")

        sql = """
            WITH latest AS (
                SELECT TOP 1
                    m.TIMEOFMEASUREMENT AS latest_time
                FROM dbo.measurements m
                JOIN dbo.tags tx ON tx.TAGID = m.TAGID
                WHERE tx.LOCID = ?
                GROUP BY m.TIMEOFMEASUREMENT
                HAVING COUNT(DISTINCT tx.TAGID) = (
                    SELECT COUNT(*) FROM dbo.tags WHERE LOCID = ?
                )
                ORDER BY m.TIMEOFMEASUREMENT DESC
            )
            SELECT
                latest.latest_time AS snapshot_time,
                m.TIMEOFMEASUREMENT AS measured_at,
                t.TAGID AS tag_id,
                t.TAGCODE AS variable_code,
                t.TAGNAME AS variable_name,
                t.PARID AS parameter_id,
                m.MEASUREDVALUE AS value,
                COALESCE(p.UNIT, p.DISPUNIT) AS unit
            FROM dbo.tags t
            CROSS JOIN latest
            LEFT JOIN dbo.measurements m
                ON m.TAGID = t.TAGID
               AND m.TIMEOFMEASUREMENT = latest.latest_time
            LEFT JOIN dbo.params p ON p.PARID = t.PARID
            WHERE t.LOCID = ?
            ORDER BY t.ORDERNR, t.TAGID
        """
        rows = self.db.fetch_all(sql, [station_id, station_id, station_id])
        if not rows:
            raise ValueError(f"Estacion {station_id} no tiene mediciones historicas.")
        variables: list[dict[str, Any]] = []
        latest_measurement_time: datetime | None = None
        for row in rows:
            variable = self.normalizer.normalize(
                code=row.get("variable_code"),
                name=row.get("variable_name"),
                parameter_id=row.get("parameter_id"),
                unit=row.get("unit"),
                station_id=station_id,
            )
            measured_at = row.get("measured_at")
            if isinstance(measured_at, datetime) and (latest_measurement_time is None or measured_at > latest_measurement_time):
                latest_measurement_time = measured_at
            variables.append(
                {
                    "code": row.get("variable_code"),
                    "standard_name": variable.standard_name,
                    "display_name": variable.display_name,
                    "category": variable.category,
                    "value": row.get("value"),
                    "unit": variable.unit,
                    "quality": "warning" if variable.warning else "ok",
                    "warning": variable.warning,
                    "measured_at": _iso(measured_at),
                }
            )
        return {
            "station_id": station_id,
            "station_name": station["name"],
            "latest_time": _iso(latest_measurement_time or rows[0].get("snapshot_time")),
            "variables": variables,
            "warnings": self._station_warnings(station_id),
        }

    def get_series(
        self,
        station_id: int,
        variable: str,
        from_date: datetime,
        to_date: datetime,
        resolution: str,
    ) -> dict[str, Any]:
        station = self.get_station(station_id)
        if station is None:
            raise ValueError(f"Estacion {station_id} no existe.")
        definition = self.normalizer.get_definition(variable)
        if definition is None:
            raise ValueError(f"Variable no soportada: {variable}.")
        if resolution not in {"raw", "hourly", "daily"}:
            raise ValueError("resolution debe ser raw, hourly o daily.")
        from_bound, to_bound = _query_bounds(from_date, to_date)

        tag_ids = self._tag_ids_for_standard(station_id, definition.standard_name)
        if not tag_ids:
            return {
                "station_id": station_id,
                "station_name": station["name"],
                "variable": definition.standard_name,
                "unit": definition.default_unit,
                "resolution": resolution,
                "points": [],
            }

        placeholders = ",".join("?" for _ in tag_ids)
        params: list[Any] = [*tag_ids, from_bound, to_bound]
        if resolution == "raw":
            sql = f"""
                SELECT
                    m.TIMEOFMEASUREMENT AS measured_at,
                    m.MEASUREDVALUE AS value
                FROM dbo.measurements m
                WHERE m.TAGID IN ({placeholders})
                  AND m.TIMEOFMEASUREMENT >= ?
                  AND m.TIMEOFMEASUREMENT < ?
                ORDER BY m.TIMEOFMEASUREMENT
            """
        elif resolution == "hourly":
            aggregate = _bucket_aggregate(definition.standard_name)
            sql = f"""
                SELECT
                    DATEADD(HOUR, DATEDIFF(HOUR, 0, m.TIMEOFMEASUREMENT), 0) AS measured_at,
                    {aggregate}(m.MEASUREDVALUE) AS value
                FROM dbo.measurements m
                WHERE m.TAGID IN ({placeholders})
                  AND m.TIMEOFMEASUREMENT >= ?
                  AND m.TIMEOFMEASUREMENT < ?
                GROUP BY DATEADD(HOUR, DATEDIFF(HOUR, 0, m.TIMEOFMEASUREMENT), 0)
                ORDER BY measured_at
            """
        else:
            aggregate = _bucket_aggregate(definition.standard_name)
            sql = f"""
                SELECT
                    CAST(m.TIMEOFMEASUREMENT AS date) AS measured_at,
                    {aggregate}(m.MEASUREDVALUE) AS value
                FROM dbo.measurements m
                WHERE m.TAGID IN ({placeholders})
                  AND m.TIMEOFMEASUREMENT >= ?
                  AND m.TIMEOFMEASUREMENT < ?
                GROUP BY CAST(m.TIMEOFMEASUREMENT AS date)
                ORDER BY measured_at
            """
        rows = self.db.fetch_all(sql, params)
        return {
            "station_id": station_id,
            "station_name": station["name"],
            "variable": definition.standard_name,
            "unit": definition.default_unit,
            "resolution": resolution,
            "points": [{"time": _iso(row["measured_at"]), "value": row["value"]} for row in rows],
        }

    def get_summary(self, station_id: int) -> dict[str, Any]:
        latest = self.get_latest(station_id)
        values = {item["standard_name"]: item for item in latest["variables"]}
        return {
            "station_id": station_id,
            "station_name": latest["station_name"],
            "latest_time": latest["latest_time"],
            "data_status": self.get_station(station_id)["data_status"],  # type: ignore[index]
            "temperature_avg": _value(values, "Temp_AVG"),
            "temperature_min": _value(values, "Temp_Min"),
            "temperature_max": _value(values, "Temp_Max"),
            "humidity_avg": _value(values, "Humedad_AVG"),
            "rainfall": _value(values, "Lluvia"),
            "solar_radiation_avg": _value(values, "RadSol_AVG"),
            "solar_radiation_max": _value(values, "RadSol_Max"),
            "wind_speed_avg": _first_value(values, "VV_Sonic_AVG", "VV_Mec_AVG"),
            "wind_speed_max": _first_value(values, "VV_Sonic_Max", "VV_Mec_Max"),
            "wind_direction_avg": _first_value(values, "DV_Sonic_AVG", "DV_Mec_AVG"),
            "battery_voltage": _value(values, "Bateria"),
            "leaf_humidity_avg": _first_value(values, "Hum_Hoja_AVG", "Hum_Hoja"),
            "nitrogen": _value(values, "N"),
            "phosphorus": _value(values, "P"),
            "potassium": _value(values, "K"),
            "warnings": latest["warnings"],
        }

    def get_summaries(self) -> list[dict[str, Any]]:
        return [self.get_summary(station["station_id"]) for station in self.get_stations()]

    def variable_options(self) -> list[dict[str, str]]:
        return self.normalizer.variable_options()

    def _latest_measurement_time(self, station_id: int) -> datetime | None:
        complete_snapshot = self.db.fetch_one(
            """
            SELECT TOP 1
                m.TIMEOFMEASUREMENT AS latest_time
            FROM dbo.measurements m
            JOIN dbo.tags t ON t.TAGID = m.TAGID
            WHERE t.LOCID = ?
            GROUP BY m.TIMEOFMEASUREMENT
            HAVING COUNT(DISTINCT t.TAGID) = (SELECT COUNT(*) FROM dbo.tags WHERE LOCID = ?)
            ORDER BY m.TIMEOFMEASUREMENT DESC
            """,
            [station_id, station_id],
        )
        if complete_snapshot and complete_snapshot.get("latest_time"):
            return complete_snapshot["latest_time"]

        latest_any = self.db.fetch_one(
            """
            SELECT MAX(m.TIMEOFMEASUREMENT) AS latest_time
            FROM dbo.measurements m
            JOIN dbo.tags t ON t.TAGID = m.TAGID
            WHERE t.LOCID = ?
            """,
            [station_id],
        )
        return latest_any["latest_time"] if latest_any else None

    def resolve_station_id(self, station: str) -> int:
        if station.isdigit():
            return int(station)
        normalized = station.strip().upper()
        for item in self.get_stations():
            if str(item["name"]).strip().upper() == normalized:
                return int(item["station_id"])
        raise ValueError(f"Estacion no soportada: {station}.")

    def _tag_ids_for_standard(self, station_id: int, standard_name: str) -> list[int]:
        sql = """
            SELECT
                t.TAGID AS tag_id,
                t.TAGCODE AS variable_code,
                t.TAGNAME AS variable_name,
                t.PARID AS parameter_id,
                COALESCE(p.UNIT, p.DISPUNIT) AS unit
            FROM dbo.tags t
            LEFT JOIN dbo.params p ON p.PARID = t.PARID
            WHERE t.LOCID = ?
        """
        rows = self.db.fetch_all(sql, [station_id])
        tag_ids: list[int] = []
        for row in rows:
            variable = self.normalizer.normalize(
                code=row.get("variable_code"),
                name=row.get("variable_name"),
                parameter_id=row.get("parameter_id"),
                unit=row.get("unit"),
                station_id=station_id,
            )
            if variable.standard_name == standard_name:
                tag_ids.append(int(row["tag_id"]))
        return tag_ids

    def _station_from_row(self, row: dict[str, Any]) -> dict[str, Any]:
        latest_time = row.get("latest_time")
        return {
            "station_id": int(row["station_id"]),
            "name": str(row["name"]).strip(),
            "code": row.get("code"),
            "device_code": row.get("device_code"),
            "rtu_info": row.get("rtu_info"),
            "latest_time": _iso(latest_time),
            "data_status": _data_status(latest_time),
            "tag_count": int(row.get("tag_count") or 0),
        }

    def _station_warnings(self, station_id: int) -> list[str]:
        if station_id == 101:
            return [
                "HUACA usa sensores con unidades distintas; los nutrientes se muestran solo como referencia y no deben compararse directamente con otras estaciones."
            ]
        return []


def _value(values: dict[str, dict[str, Any]], key: str) -> float | None:
    row = values.get(key)
    if row is None or row.get("value") is None:
        return None
    return float(row["value"])


def _first_value(values: dict[str, dict[str, Any]], *keys: str) -> float | None:
    for key in keys:
        value = _value(values, key)
        if value is not None:
            return value
    return None


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time()).isoformat()
    return str(value)


def _query_bounds(from_date: datetime, to_date: datetime) -> tuple[datetime, datetime]:
    to_bound = to_date
    if to_bound.time() == datetime.min.time():
        to_bound = to_bound + timedelta(days=1)
    if to_bound <= from_date:
        raise ValueError("El parametro to debe ser mayor que from.")
    return from_date, to_bound


def _bucket_aggregate(standard_name: str) -> str:
    if standard_name == "Lluvia":
        return "SUM"
    if standard_name.endswith("_Min"):
        return "MIN"
    if standard_name.endswith("_Max"):
        return "MAX"
    return "AVG"


def _data_status(latest_time: Any) -> str:
    if not isinstance(latest_time, datetime):
        return "offline"
    hours = (datetime.now() - latest_time).total_seconds() / 3600
    if hours <= 2:
        return "online"
    if hours <= 72:
        return "stale"
    return "offline"
