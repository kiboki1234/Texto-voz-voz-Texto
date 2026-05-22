from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Query, Request

from app.modules.alerts.rules import AlertEngine


router = APIRouter(tags=["stations"])


def _repository(request: Request):
    return request.app.state.repository


@router.get("/stations")
def stations(request: Request) -> list[dict]:
    return _repository(request).get_stations()


@router.get("/stations/{station_id}/latest")
def latest(station_id: int, request: Request) -> dict:
    return _repository(request).get_latest(station_id)


@router.get("/stations/{station_id}/summary")
def summary(station_id: int, request: Request) -> dict:
    result = _repository(request).get_summary(station_id)
    result["alerts"] = [alert.as_dict() for alert in AlertEngine().evaluate(result)]
    return result


@router.get("/stations/{station_id}/series")
def series(
    station_id: int,
    request: Request,
    variable: str = Query(...),
    from_date: datetime = Query(..., alias="from"),
    to_date: datetime = Query(..., alias="to"),
    resolution: str = Query("raw"),
) -> dict:
    return _repository(request).get_series(station_id, variable, from_date, to_date, resolution)


@router.get("/estado-actual")
def estado_actual(request: Request) -> dict:
    rows = []
    repo = _repository(request)
    for station in repo.get_stations():
        latest_payload = repo.get_latest(station["station_id"])
        for variable in latest_payload["variables"]:
            rows.append(
                {
                    "station_id": latest_payload["station_id"],
                    "estacion": latest_payload["station_name"],
                    "variable": variable["standard_name"],
                    "tag_code": variable["code"],
                    "valor": variable["value"],
                    "unidad": variable["unit"],
                    "timestamp": variable.get("measured_at") or latest_payload.get("latest_time"),
                    "calidad": variable["quality"],
                }
            )
    return {"rows": rows}


@router.get("/serie/{station}/{variable}")
def serie_compat(
    station: str,
    variable: str,
    request: Request,
    from_date: datetime = Query(..., alias="from"),
    to_date: datetime = Query(..., alias="to"),
    resolution: str = Query("raw"),
) -> dict:
    station_id = _repository(request).resolve_station_id(station)
    return _repository(request).get_series(station_id, variable, from_date, to_date, resolution)


@router.get("/variables")
def variables(request: Request) -> list[dict]:
    return _repository(request).variable_options()
