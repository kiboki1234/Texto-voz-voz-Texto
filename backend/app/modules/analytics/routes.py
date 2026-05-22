from __future__ import annotations

from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Query, Request

from app.modules.alerts.rules import classify_nutrient, dew_point_magnus, eto_hargreaves, frost_classification, spray_window


router = APIRouter(tags=["analytics"])


def _repository(request: Request):
    return request.app.state.repository


@router.get("/analytics/npk")
def npk(station_id: int, request: Request) -> dict:
    summary = _repository(request).get_summary(station_id)
    warning = None
    if station_id == 101:
        warning = "HUACA reporta N/P/K con unidad no confiable (PARID=1); usar como referencia."
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
    humidity = repo.get_series(station_id, "Humedad_AVG", from_date, to_date, "daily")["points"]
    humidity_by_time = {point["time"][:10]: point["value"] for point in humidity}
    events = []
    for point in temp_min:
        day = point["time"][:10]
        h = humidity_by_time.get(day)
        classification = frost_classification(point["value"], h)
        dew_point = dew_point_magnus(point["value"], h) if h is not None else None
        events.append({"date": day, "temp_min": point["value"], "humidity_avg": h, "dew_point": dew_point, **classification})
    return {"station_id": station_id, "events": events}


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
        points.append({"date": day, "eto": eto_value, "rainfall": values.get("rainfall")})
    return {
        "station_id": station_id,
        "method": "Hargreaves-Samani simplificado, Ra fija=15 por falta de latitud/altitud confirmada.",
        "points": points,
    }


@router.get("/analytics/ombrothermal")
def ombrothermal(station_id: int, year: int, request: Request) -> dict:
    repo = _repository(request)
    from_date = datetime(year, 1, 1)
    to_date = datetime(year, 12, 31, 23, 59, 59)
    temp = repo.get_series(station_id, "Temp_AVG", from_date, to_date, "daily")["points"]
    rain = repo.get_series(station_id, "Lluvia", from_date, to_date, "daily")["points"]
    buckets: dict[str, dict[str, list[float]]] = defaultdict(lambda: {"temp": [], "rain": []})
    for point in temp:
        buckets[point["time"][:7]]["temp"].append(float(point["value"]))
    for point in rain:
        buckets[point["time"][:7]]["rain"].append(float(point["value"]))
    months = []
    for month, values in sorted(buckets.items()):
        t = round(sum(values["temp"]) / len(values["temp"]), 2) if values["temp"] else None
        p = round(sum(values["rain"]), 2) if values["rain"] else 0
        months.append({"month": month, "temperature_avg": t, "precipitation": p, "dry": bool(t is not None and p <= 2 * t)})
    return {"station_id": station_id, "year": year, "months": months, "rule": "Periodo seco si P <= 2T."}


@router.get("/analytics/wind-rose")
def wind_rose(
    station_id: int,
    request: Request,
    from_date: datetime = Query(..., alias="from"),
    to_date: datetime = Query(..., alias="to"),
) -> dict:
    repo = _repository(request)
    speed = repo.get_series(station_id, "VV_Sonic_AVG", from_date, to_date, "hourly")["points"]
    direction = repo.get_series(station_id, "DV_Sonic_AVG", from_date, to_date, "hourly")["points"]
    direction_by_time = {point["time"]: point["value"] for point in direction}
    sectors = {name: {"count": 0, "speed_sum": 0.0} for name in ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]}
    for point in speed:
        angle = direction_by_time.get(point["time"])
        if angle is None:
            continue
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
    return {"station_id": station_id, "sectors": result}


def _merge_points(series: dict[str, list[dict]]) -> dict[str, dict[str, float]]:
    merged: dict[str, dict[str, float]] = defaultdict(dict)
    for key, points in series.items():
        for point in points:
            merged[point["time"][:10]][key] = point["value"]
    return merged


def _sector(angle: float) -> str:
    sectors = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    return sectors[int(((angle % 360) + 22.5) // 45) % 8]
