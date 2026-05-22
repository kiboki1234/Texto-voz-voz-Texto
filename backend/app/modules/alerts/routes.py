from fastapi import APIRouter, Request

from app.modules.alerts.rules import AlertEngine


router = APIRouter(tags=["alerts"])


def _repository(request: Request):
    return request.app.state.repository


@router.get("/alerts/current")
def current_alerts(request: Request) -> dict:
    engine = AlertEngine()
    alerts = []
    for summary in _repository(request).get_summaries():
        alerts.extend(alert.as_dict() for alert in engine.evaluate(summary))
    return {"alerts": alerts}


@router.get("/alertas")
def alertas(request: Request) -> dict:
    return current_alerts(request)


@router.get("/stations/{station_id}/alerts")
def station_alerts(station_id: int, request: Request) -> dict:
    summary = _repository(request).get_summary(station_id)
    engine = AlertEngine()
    return {"station_id": station_id, "alerts": [alert.as_dict() for alert in engine.evaluate(summary)]}
