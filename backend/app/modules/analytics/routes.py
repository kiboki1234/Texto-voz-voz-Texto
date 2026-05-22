from __future__ import annotations

from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, Request

from app.modules.alerts.rules import classify_nutrient, dew_point_magnus, eto_hargreaves, frost_classification, spray_window


router = APIRouter(tags=["analytics"])


def _repository(request: Request):
    return request.app.state.repository


@router.get("/analytics/npk")
def npk(station_id: int, request: Request) -> dict:
    summary = _repository(request).get_summary(station_id)
    warning = None
    if station_id == 101:
        warning = "HUACA usa sensores de suelo con unidades distintas; los nutrientes se muestran solo como referencia."
    return {
        "station_id": station_id,
        "station_name": summary["station_name"],
        "warning": warning,
        "nutrients": {
            "N": classify_nutrient("N", summary.get("nitrogen")),
            "P": classify_nutrient("P", summary.get("phosphorus")),
            "K": classify_nutrient("K", summary.get("potassium")),
        },
    }


@router.get("/analytics/spray-window")
def spray(station_id: int, request: Request) -> dict:
    summary = _repository(request).get_summary(station_id)
    return {"station_id": station_id, "station_name": summary["station_name"], **spray_window(summary)}


@router.get("/analytics/frost")
def frost(
    station_id: int,
    request: Request,
    from_date: datetime = Query(..., alias="from"),
    to_date: datetime = Query(..., alias="to"),
) -> dict:
    repo = _repository(request)
    temp_min = repo.get_series(station_id, "Temp_Min", from_date, to_date, "daily")["points"]
    temp_avg = repo.get_series(station_id, "Temp_AVG", from_date, to_date, "daily")["points"]
    humidity = repo.get_series(station_id, "Humedad_AVG", from_date, to_date, "daily")["points"]
    temp_avg_by_time = {point["time"][:10]: point["value"] for point in temp_avg}
    humidity_by_time = {point["time"][:10]: point["value"] for point in humidity}
    events = []
    for point in temp_min:
        day = point["time"][:10]
        t_avg = temp_avg_by_time.get(day)
        h = humidity_by_time.get(day)
        classification = frost_classification(point["value"], h)
        dew_point = dew_point_magnus(t_avg, h) if t_avg is not None and h is not None else None
        events.append({"date": day, "temp_min": point["value"], "temp_avg": t_avg, "humidity_avg": h, "dew_point": dew_point, **classification})
    return {
        "station_id": station_id,
        "method": "Riesgo con Temp_Min diaria y Humedad_AVG diaria. Punto de rocio estimado con Temp_AVG diaria y Humedad_AVG diaria (Magnus).",
        "events": events,
    }


@router.get("/analytics/eto")
def eto(
    station_id: int,
    request: Request,
    from_date: datetime = Query(..., alias="from"),
    to_date: datetime = Query(..., alias="to"),
) -> dict:
    repo = _repository(request)
    temp_avg = repo.get_series(station_id, "Temp_AVG", from_date, to_date, "daily")["points"]
    temp_min = repo.get_series(station_id, "Temp_Min", from_date, to_date, "daily")["points"]
    temp_max = repo.get_series(station_id, "Temp_Max", from_date, to_date, "daily")["points"]
    rainfall = repo.get_series(station_id, "Lluvia", from_date, to_date, "daily")["points"]
    by_day = _merge_points({"temp_avg": temp_avg, "temp_min": temp_min, "temp_max": temp_max, "rainfall": rainfall})
    points = []
    for day, values in sorted(by_day.items()):
        eto_value = eto_hargreaves(values.get("temp_min"), values.get("temp_max"), values.get("temp_avg"))
        rainfall_value = values.get("rainfall")
        water_balance = round(rainfall_value - eto_value, 2) if rainfall_value is not None and eto_value is not None else None
        deficit = round(max(0.0, eto_value - rainfall_value), 2) if rainfall_value is not None and eto_value is not None else None
        points.append({"date": day, "eto": eto_value, "rainfall": rainfall_value, "water_balance": water_balance, "deficit": deficit})
    return {
        "station_id": station_id,
        "method": "Hargreaves-Samani simplificado, Ra fija=15 por falta de latitud/altitud confirmada.",
        "points": points,
    }


@router.get("/analytics/ombrothermal")
def ombrothermal(
    station_id: int,
    request: Request,
    year: int | None = None,
    from_date: datetime | None = Query(None, alias="from"),
    to_date: datetime | None = Query(None, alias="to"),
) -> dict:
    repo = _repository(request)
    if from_date is None and to_date is None:
        selected_year = year or datetime.now().year
        from_date = datetime(selected_year, 1, 1)
        to_date = datetime(selected_year, 12, 31)
    elif from_date is None or to_date is None:
        raise HTTPException(status_code=400, detail="from y to deben enviarse juntos.")

    temp = repo.get_series(station_id, "Temp_AVG", from_date, to_date, "daily")["points"]
    rain = repo.get_series(station_id, "Lluvia", from_date, to_date, "daily")["points"]
    buckets: dict[str, dict[str, list[float]]] = defaultdict(lambda: {"temp": [], "rain": []})
    for point in temp:
        buckets[point["time"][:7]]["temp"].append(float(point["value"]))
    for point in rain:
        buckets[point["time"][:7]]["rain"].append(float(point["value"]))
    months = []
    for month in _month_range(from_date, to_date):
        values = buckets[month]
        t = round(sum(values["temp"]) / len(values["temp"]), 2) if values["temp"] else None
        p = round(sum(values["rain"]), 2) if values["rain"] else None
        p_scaled = round(p / 2, 2) if p is not None else None
        dry = p <= 2 * t if t is not None and p is not None else None
        months.append(
            {
                "month": month,
                "temperature_avg": t,
                "precipitation": p,
                "precipitation_scaled": p_scaled,
                "dry": dry,
                "temperature_days": len(values["temp"]),
                "rain_days": len(values["rain"]),
                "data_status": "ok" if values["temp"] and values["rain"] else "missing",
            }
        )
    response_year = from_date.year if from_date.year == to_date.year else None
    return {
        "station_id": station_id,
        "year": response_year,
        "from": from_date.date().isoformat(),
        "to": to_date.date().isoformat(),
        "months": months,
        "rule": "Periodo seco si P <= 2T. Para visualizacion Gaussen se compara T contra P/2 en una misma escala.",
    }


@router.get("/analytics/wind-rose")
def wind_rose(
    station_id: int,
    request: Request,
    from_date: datetime = Query(..., alias="from"),
    to_date: datetime = Query(..., alias="to"),
) -> dict:
    repo = _repository(request)
    speed = repo.get_series(station_id, "VV_Sonic_AVG", from_date, to_date, "raw")["points"]
    direction = repo.get_series(station_id, "DV_Sonic_AVG", from_date, to_date, "raw")["points"]
    source = "sonic"
    if not speed or not direction:
        speed = repo.get_series(station_id, "VV_Mec_AVG", from_date, to_date, "raw")["points"]
        direction = repo.get_series(station_id, "DV_Mec_AVG", from_date, to_date, "raw")["points"]
        source = "mechanical"
    direction_by_time = {point["time"]: point["value"] for point in direction}
    sectors = {name: {"count": 0, "speed_sum": 0.0} for name in ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]}
    total_samples = 0
    for point in speed:
        angle = direction_by_time.get(point["time"])
        if angle is None or point["value"] is None:
            continue
        total_samples += 1
        sector = _sector(float(angle))
        sectors[sector]["count"] += 1
        sectors[sector]["speed_sum"] += float(point["value"])
    result = [
        {
            "sector": sector,
            "count": data["count"],
            "avg_speed": round(data["speed_sum"] / data["count"], 2) if data["count"] else 0,
        }
        for sector, data in sectors.items()
    ]
    return {
        "station_id": station_id,
        "source": source,
        "total_samples": total_samples,
        "method": "Sectorizacion por muestra cruda de direccion; velocidad media calculada dentro de cada sector. No se promedia direccion linealmente.",
        "sectors": result,
    }


def _merge_points(series: dict[str, list[dict]]) -> dict[str, dict[str, float]]:
    merged: dict[str, dict[str, float]] = defaultdict(dict)
    for key, points in series.items():
        for point in points:
            merged[point["time"][:10]][key] = point["value"]
    return merged


def _sector(angle: float) -> str:
    sectors = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    return sectors[int(((angle % 360) + 22.5) // 45) % 8]


def _month_range(from_date: datetime, to_date: datetime) -> list[str]:
    current = datetime(from_date.year, from_date.month, 1)
    end = datetime(to_date.year, to_date.month, 1)
    months = []
    while current <= end:
        months.append(current.strftime("%Y-%m"))
        if current.month == 12:
            current = datetime(current.year + 1, 1, 1)
        else:
            current = datetime(current.year, current.month + 1, 1)
    return months
