from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from typing import Any


@dataclass(frozen=True)
class Alert:
    id: str
    station_id: int
    station_name: str
    severity: str
    category: str
    title: str
    message: str
    value: float | None = None
    unit: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return self.__dict__.copy()


def vapor_pressure_hpa(temperature_c: float) -> float:
    exponent = (7.5 * temperature_c) / (237.3 + temperature_c)
    return 6.11 * (10**exponent)


def estimated_relative_humidity_from_temperatures(temp_min: float | None, temp_avg: float | None) -> float | None:
    if temp_min is None or temp_avg is None:
        return None
    actual_vapor_pressure = vapor_pressure_hpa(temp_min)
    saturation_vapor_pressure = vapor_pressure_hpa(temp_avg)
    if saturation_vapor_pressure == 0:
        return 0.0
    estimated_humidity = (actual_vapor_pressure / saturation_vapor_pressure) * 100
    return round(min(100.0, max(0.0, estimated_humidity)), 2)


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return min(maximum, max(minimum, value))


def frost_probability_percent(temp_min: float | None, estimated_humidity: float | None) -> float | None:
    if temp_min is None or estimated_humidity is None:
        return None
    temperature_factor = _clamp((2.0 - temp_min) / 2.0)
    humidity_factor = _clamp(estimated_humidity / 70.0)
    probability = temperature_factor * (0.70 + 0.30 * humidity_factor) * 100.0
    return round(_clamp(probability, 0.0, 100.0), 2)


def frost_classification(temp_min: float | None, temp_avg: float | None) -> dict[str, Any]:
    if temp_min is None:
        return {
            "risk": "unknown",
            "type": None,
            "message": "Sin temperatura minima.",
            "estimated_humidity": None,
            "frost_probability": None,
            "temperature_factor": None,
            "humidity_factor": None,
            "actual_vapor_pressure": None,
            "saturation_vapor_pressure": None,
        }

    actual_vapor_pressure = round(vapor_pressure_hpa(temp_min), 3)
    saturation_vapor_pressure = round(vapor_pressure_hpa(temp_avg), 3) if temp_avg is not None else None
    estimated_humidity = estimated_relative_humidity_from_temperatures(temp_min, temp_avg)
    frost_probability = frost_probability_percent(temp_min, estimated_humidity)
    temperature_factor = round(_clamp((2.0 - temp_min) / 2.0), 3)
    humidity_factor = round(_clamp((estimated_humidity or 0.0) / 70.0), 3) if estimated_humidity is not None else None
    base = {
        "estimated_humidity": estimated_humidity,
        "frost_probability": frost_probability,
        "temperature_factor": temperature_factor,
        "humidity_factor": humidity_factor,
        "actual_vapor_pressure": actual_vapor_pressure,
        "saturation_vapor_pressure": saturation_vapor_pressure,
    }

    if estimated_humidity is None:
        return {
            "risk": "unknown",
            "type": None,
            "message": "No se pudo estimar probabilidad de helada por falta de Temp_AVG.",
            **base,
        }

    if temp_min <= 0:
        frost_type = "blanca" if estimated_humidity >= 70 else "negra"
        label = "Blanca" if frost_type == "blanca" else "Negra"
        return {
            "risk": "critical",
            "type": frost_type,
            "message": f"Probabilidad alta de Helada {label} ({frost_probability:.1f}%; HR estimada: {estimated_humidity:.1f}%).",
            **base,
        }

    if frost_probability >= 50:
        return {
            "risk": "watch",
            "type": None,
            "message": f"Probabilidad moderada de helada ({frost_probability:.1f}%). Temperatura minima cercana a 0 C.",
            **base,
        }

    return {
        "risk": "normal",
        "type": None,
        "message": f"Probabilidad baja de helada ({frost_probability:.1f}%).",
        **base,
    }


def classify_nutrient(kind: str, value: float | None) -> dict[str, Any]:
    if value is None:
        return {"status": "unknown", "label": "Sin dato", "value": None}
    limits = {
        "N": (20.0, 40.0),
        "P": (10.0, 30.0),
        "K": (80.0, 200.0),
    }
    low, high = limits[kind]
    if value < low:
        status = "deficient"
        label = "Deficiente"
    elif value > high:
        status = "excess"
        label = "Exceso"
    else:
        status = "optimal"
        label = "Optimo"
    return {"status": status, "label": label, "value": value}


def spray_window(summary: dict[str, Any]) -> dict[str, Any]:
    reasons: list[str] = []
    wind = summary.get("wind_speed_avg")
    rain = summary.get("rainfall")
    temp = summary.get("temperature_avg")
    leaf = summary.get("leaf_humidity_avg")

    if wind is None:
        reasons.append("No hay dato de viento.")
    elif wind >= 3:
        reasons.append(f"Viento alto ({wind:.1f} m/s).")
    if rain is None:
        reasons.append("No hay dato de lluvia.")
    elif rain != 0:
        reasons.append(f"Lluvia registrada ({rain:.1f} mm).")
    if temp is None:
        reasons.append("No hay dato de temperatura.")
    elif temp < 10 or temp > 28:
        reasons.append(f"Temperatura fuera de rango ({temp:.1f} C).")
    if leaf is None:
        reasons.append("No hay dato de humedad de hoja.")
    elif leaf >= 70:
        reasons.append(f"Humedad de hoja alta ({leaf:.1f}%).")

    return {
        "is_suitable": len(reasons) == 0,
        "decision": "apta" if len(reasons) == 0 else "no_apta",
        "message": "Ventana apta para fumigacion." if len(reasons) == 0 else "No se recomienda fumigar ahora.",
        "reasons": reasons,
        "rules": {
            "wind_speed_lt_ms": 3,
            "rain_equals_mm": 0,
            "temperature_range_c": [10, 28],
            "leaf_humidity_lt_percent": 70,
        },
    }


def eto_hargreaves(temp_min: float | None, temp_max: float | None, temp_avg: float | None, ra: float = 15.0) -> float | None:
    if temp_min is None or temp_max is None or temp_avg is None:
        return None
    delta = max(0.0, temp_max - temp_min)
    return round(0.0023 * (temp_avg + 17.8) * sqrt(delta) * ra, 2)


def battery_threshold(voltage: float) -> float:
    return 11.5 if voltage > 6 else 3.7


class AlertEngine:
    def evaluate(self, summary: dict[str, Any]) -> list[Alert]:
        station_id = int(summary["station_id"])
        station_name = str(summary["station_name"])
        alerts: list[Alert] = []

        frost = frost_classification(summary.get("temperature_min"), summary.get("temperature_avg"))
        if frost["risk"] in {"watch", "critical"}:
            alerts.append(
                Alert(
                    id=f"{station_id}-frost",
                    station_id=station_id,
                    station_name=station_name,
                    severity="critical" if frost["risk"] == "critical" else "warning",
                    category="frost",
                    title="Riesgo de helada",
                    message=frost["message"],
                    value=summary.get("temperature_min"),
                    unit="C",
                )
            )

        wind = summary.get("wind_speed_max") or summary.get("wind_speed_avg")
        if wind is not None and wind > 15:
            alerts.append(Alert(f"{station_id}-wind", station_id, station_name, "warning", "wind", "Viento fuerte", f"Velocidad maxima de viento {wind:.1f} m/s.", wind, "m/s"))

        rain = summary.get("rainfall")
        if rain is not None and rain > 20:
            alerts.append(Alert(f"{station_id}-rain", station_id, station_name, "warning", "rain", "Lluvia intensa", f"Precipitacion acumulada {rain:.1f} mm.", rain, "mm"))

        battery = summary.get("battery_voltage")
        if battery is not None and battery < battery_threshold(float(battery)):
            threshold = battery_threshold(float(battery))
            alerts.append(Alert(f"{station_id}-battery", station_id, station_name, "critical", "battery", "Bateria critica", f"Bateria en {battery:.2f} V; umbral aplicado {threshold:.1f} V.", battery, "V"))

        leaf = summary.get("leaf_humidity_avg")
        if leaf is not None and leaf >= 85:
            alerts.append(Alert(f"{station_id}-leaf", station_id, station_name, "warning", "leaf_humidity", "Riesgo de hongos", f"Humedad de hoja {leaf:.1f}%.", leaf, "%"))

        temp_avg = summary.get("temperature_avg")
        if leaf is not None and temp_avg is not None and leaf > 90 and 15 <= temp_avg <= 25:
            alerts.append(Alert(f"{station_id}-mildew", station_id, station_name, "warning", "leaf_humidity", "Riesgo de mildiu", f"Humedad de hoja {leaf:.1f}% con temperatura {temp_avg:.1f} C.", leaf, "%"))

        solar = summary.get("solar_radiation_max")
        if solar is not None and solar > 1000:
            alerts.append(Alert(f"{station_id}-solar", station_id, station_name, "warning", "solar_radiation", "Radiacion extrema", f"Radiacion maxima {solar:.1f} W/m2.", solar, "W/m2"))

        spray = spray_window(summary)
        if not spray["is_suitable"]:
            alerts.append(Alert(f"{station_id}-spray", station_id, station_name, "info", "spray", "No fumigar", "; ".join(spray["reasons"])))

        for kind, field in {"N": "nitrogen", "P": "phosphorus", "K": "potassium"}.items():
            nutrient = classify_nutrient(kind, summary.get(field))
            if nutrient["status"] == "deficient":
                unit = "sin unidad" if station_id == 101 else "mg/Kg"
                suffix = " En HUACA este dato es referencial por diferencia de unidades." if station_id == 101 else ""
                alerts.append(Alert(f"{station_id}-npk-{kind}", station_id, station_name, "warning", "npk", f"{kind} deficiente", f"{kind} por debajo del rango recomendado.{suffix}", summary.get(field), unit))

        return alerts
