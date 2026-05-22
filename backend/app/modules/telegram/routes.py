from __future__ import annotations

from fastapi import APIRouter, Query, Request

from app.core.config import settings
from app.modules.alerts.rules import AlertEngine
from app.modules.telegram.service import TelegramNotifier, format_gad_alert_message


router = APIRouter(tags=["telegram"])


def _repository(request: Request):
    return request.app.state.repository


@router.get("/telegram/status")
def telegram_status() -> dict:
    notifier = TelegramNotifier(settings)
    return {
        "configured": notifier.is_configured,
        "chat_configured": notifier.has_default_chat,
        "notifications_enabled": settings.telegram_notifications_enabled,
        "interval_seconds": settings.telegram_alert_interval_seconds,
        "bot_name": "AgroNoticIAs",
    }


@router.get("/telegram/updates")
def telegram_updates() -> dict:
    notifier = TelegramNotifier(settings)
    return {"chats": notifier.get_updates()}


@router.post("/telegram/notify-current")
def notify_current_alerts(request: Request, chat_id: str | None = Query(None)) -> dict:
    repo = _repository(request)
    engine = AlertEngine()
    alerts = []
    for summary in repo.get_summaries():
        alerts.extend(alert.as_dict() for alert in engine.evaluate(summary))
    message = format_gad_alert_message(alerts)
    notifier = TelegramNotifier(settings)
    payload = notifier.send_message(message, chat_id=chat_id)
    result = payload.get("result", {})
    return {
        "sent": True,
        "chat_id": str(result.get("chat", {}).get("id", chat_id or "")),
        "message_id": result.get("message_id"),
        "alerts_sent": len(alerts),
    }
