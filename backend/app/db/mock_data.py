from __future__ import annotations

from datetime import datetime, timedelta
from math import sin
from typing import Any


BASE_TIME = datetime(2026, 5, 19, 12, 0, 0)

STATIONS: list[dict[str, Any]] = [
    {
        "station_id": 101,
        "name": "HUACA",
        "code": "125720354",
        "device_code": "125720354",
        "rtu_info": "YDOC RTU V5.0B5",
        "latest_time": BASE_TIME.isoformat(),
        "data_status": "stale",
        "tag_count": 27,
    },
    {
        "station_id": 102,
        "name": "CAYAMBE",
        "code": "125720355",
        "device_code": "125720355",
        "rtu_info": "YDOC RTU V5.0B5",
        "latest_time": BASE_TIME.isoformat(),
        "data_status": "stale",
        "tag_count": 29,
    },
    {
        "station_id": 103,
        "name": "CONCEPCION",
        "code": "125720356",
        "device_code": "125720356",
        "rtu_info": "YDOC RTU V5.0B5",
        "latest_time": BASE_TIME.isoformat(),
        "data_status": "stale",
        "tag_count": 29,
    },
    {
        "station_id": 104,
        "name": "MIRA",
        "code": "125720357",
        "device_code": "125720357",
        "rtu_info": "YDOC RTU V5.0B5",
        "latest_time": BASE_TIME.isoformat(),
        "data_status": "stale",
        "tag_count": 29,
    },
    {
        "station_id": 105,
        "name": "TULCAN",
        "code": "125720358",
        "device_code": "125720358",
        "rtu_info": "YDOC RTU V5.0B5",
        "latest_time": BASE_TIME.isoformat(),
        "data_status": "stale",
        "tag_count": 29,
    },
    {
        "station_id": 106,
        "name": "CUBA",
        "code": "125720359",
        "device_code": "125720359",
        "rtu_info": "YDOC RTU V5.0B5",
        "latest_time": BASE_TIME.isoformat(),
        "data_status": "stale",
        "tag_count": 29,
    },
]

VARIABLES: dict[str, tuple[str, str, str, str]] = {
    "Temp_AVG": ("AVGTA", "Temperatura promedio", "temperature", "C"),
    "Temp_Min": ("MINTA", "Temperatura minima", "temperature", "C"),
    "Temp_Max": ("MAXTA", "Temperatura maxima", "temperature", "C"),
    "Humedad_AVG": ("AVGRH", "Humedad relativa promedio", "humidity", "%"),
    "Humedad_Min": ("MINRH", "Humedad relativa minima", "humidity", "%"),
    "Humedad_Max": ("MAXRH", "Humedad relativa maxima", "humidity", "%"),
    "Lluvia": ("PR", "Precipitacion", "rainfall", "mm"),
    "RadSol_AVG": ("AVGSR", "Radiacion solar promedio", "solar_radiation", "W/m2"),
    "VV_Sonic_AVG": ("AVGWSS", "Velocidad viento sonico promedio", "wind_speed", "m/s"),
    "DV_Sonic_AVG": ("AVGWDS", "Direccion viento sonico promedio", "wind_direction", "deg"),
    "Bateria": ("DC", "Bateria", "battery", "V"),
    "Hum_Hoja_AVG": ("AVGHH", "Humedad de hoja promedio", "leaf_humidity", "%"),
    "N": ("N", "Nitrogeno", "soil_nutrients", "mg/Kg"),
    "P": ("P", "Fosforo", "soil_nutrients", "mg/Kg"),
    "K": ("K", "Potasio", "soil_nutrients", "mg/Kg"),
}


def station_name(station_id: int) -> str:
    return next((station["name"] for station in STATIONS if station["station_id"] == station_id), "DESCONOCIDA")


def latest_values(station_id: int) -> list[dict[str, Any]]:
    offset = (station_id - 100) * 0.7
    values = {
        "Temp_AVG": 14.8 + offset,
        "Temp_Min": 5.6 + offset / 2,
        "Temp_Max": 22.2 + offset,
        "Humedad_AVG": 76.0 - offset,
        "Humedad_Min": 51.0 - offset,
        "Humedad_Max": 93.0 - offset,
        "Lluvia": 0.0 if station_id not in {104, 106} else 2.4,
        "RadSol_AVG": 420.0 + offset * 18,
        "VV_Sonic_AVG": 2.2 + (station_id % 3) * 0.8,
        "DV_Sonic_AVG": 45.0 + (station_id % 6) * 42,
        "Bateria": 3.95 - (0.08 if station_id == 105 else 0.0),
        "Hum_Hoja_AVG": 61.0 + (station_id % 4) * 8,
        "N": 18.0 + station_id % 5,
        "P": 14.0 + station_id % 7,
        "K": 95.0 + (station_id % 6) * 18,
    }
    if station_id == 101:
        values["Hum_Hoja_AVG"] = 66.0
    result = []
    for standard_name, value in values.items():
        code, display_name, category, unit = VARIABLES[standard_name]
        result.append(
            {
                "code": code,
                "standard_name": standard_name,
                "display_name": display_name,
                "category": category,
                "value": round(value, 2),
                "unit": unit,
                "quality": "warning" if station_id == 101 and standard_name in {"N", "P", "K"} else "ok",
                "measured_at": BASE_TIME.isoformat(),
            }
        )
    return result


def series(station_id: int, variable: str, resolution: str) -> list[dict[str, Any]]:
    points: list[dict[str, Any]] = []
    steps = 19 if resolution == "daily" else 120
    delta = timedelta(days=1) if resolution == "daily" else timedelta(hours=1)
    start = datetime(2026, 5, 1, 0, 0, 0)
    base = latest_value(station_id, variable)
    for index in range(steps):
        time = start + index * delta
        wave = sin(index / 3.0) * 2.5
        if variable == "Lluvia":
            value = max(0.0, 1.2 + sin(index / 2.0) * 1.8) if index % 5 == 0 else 0.0
        elif variable.startswith("Humedad") or variable.startswith("Hum_Hoja"):
            value = max(35.0, min(100.0, base + wave * 4))
        elif variable.startswith("DV_"):
            value = (base + index * 17) % 360
        else:
            value = base + wave
        points.append({"time": time.isoformat(), "value": round(value, 2)})
    return points


def latest_value(station_id: int, variable: str) -> float:
    for row in latest_values(station_id):
        if row["standard_name"] == variable:
            return float(row["value"])
    return 0.0
