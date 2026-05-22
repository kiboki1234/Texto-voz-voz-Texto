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


@router.get("/variables")
def variables(request: Request) -> list[dict]:
    return _repository(request).variable_options()
