from __future__ import annotations

import json
from datetime import datetime
from typing import Any
from urllib import parse, request
from urllib.error import HTTPError, URLError

from app.core.config import Settings


class TelegramNotifier:
    def __init__(self, settings: Settings) -> None:
        self.token = settings.telegram_bot_token
        self.default_chat_id = settings.telegram_chat_id

    @property
    def is_configured(self) -> bool:
        return bool(self.token)

    @property
    def has_default_chat(self) -> bool:
        return bool(self.default_chat_id)

    def get_updates(self) -> list[dict[str, Any]]:
        payload = self._request("getUpdates")
        updates = payload.get("result", [])
        chats: dict[str, dict[str, Any]] = {}
        for update in updates:
            message = update.get("message") or update.get("channel_post") or {}
            chat = message.get("chat")
            if not chat:
                continue
            chat_id = str(chat.get("id"))
            chats[chat_id] = {
                "chat_id": chat_id,
                "type": chat.get("type"),
                "title": chat.get("title") or chat.get("username") or chat.get("first_name"),
                "last_text": message.get("text"),
                "date": message.get("date"),
            }
        return list(chats.values())

    def send_message(self, text: str, chat_id: str | None = None) -> dict[str, Any]:
        target_chat_id = chat_id or self.default_chat_id
        if not target_chat_id:
            raise RuntimeError("TELEGRAM_CHAT_ID no configurado.")
        return self._request(
            "sendMessage",
            {
                "chat_id": target_chat_id,
                "text": text[:4096],
                "parse_mode": "HTML",
                "disable_web_page_preview": "true",
            },
        )

    def _request(self, method: str, data: dict[str, str] | None = None) -> dict[str, Any]:
        if not self.token:
            raise RuntimeError("TELEGRAM_BOT_TOKEN no configurado.")
        url = f"https://api.telegram.org/bot{self.token}/{method}"
        encoded_data = parse.urlencode(data or {}).encode("utf-8") if data is not None else None
        req = request.Request(url, data=encoded_data, method="POST" if data is not None else "GET")
        try:
            with request.urlopen(req, timeout=12) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Telegram respondio HTTP {exc.code}: {detail}") from exc
        except URLError as exc:
            raise RuntimeError(f"No se pudo conectar con Telegram: {exc.reason}") from exc
        if not payload.get("ok"):
            raise RuntimeError(f"Telegram rechazo la solicitud: {payload}")
        return payload


def format_gad_alert_message(alerts: list[dict[str, Any]]) -> str:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    if not alerts:
        return (
            "<b>AgroMetrIA - Informe comunitario</b>\n"
            f"{timestamp}\n\n"
            "Buenas noticias: la red no registra alertas activas en este momento.\n"
            "Mantener el monitoreo de las estaciones."
        )

    ordered = sorted(alerts, key=lambda item: _severity_rank(str(item.get("severity"))), reverse=True)
    stations = sorted({_html(str(item.get("station_name", "Estacion"))) for item in ordered})
    spray_alerts = [item for item in ordered if item.get("category") == "spray"]
    nutrient_alerts = [item for item in ordered if item.get("category") == "npk"]
    weather_alerts = [item for item in ordered if item.get("category") not in {"spray", "npk"}]

    lines = [
        "<b>AgroMetrIA - Informe para la comunidad</b>",
        timestamp,
        "",
        f"Hay {len(ordered)} aviso(s) activos en {len(stations)} zona(s): {', '.join(stations)}.",
        "",
    ]

    if weather_alerts:
        lines.append("<b>Atención climática</b>")
        for alert in weather_alerts[:5]:
            lines.append(_community_alert_line(alert))
        lines.append("")

    if spray_alerts:
        spray_stations = sorted({_html(str(item.get("station_name", "Estacion"))) for item in spray_alerts})
        lines.append("<b>Fumigación</b>")
        lines.append(f"No se recomienda fumigar por ahora en: {', '.join(spray_stations)}.")
        reasons = _spray_reasons(spray_alerts)
        if reasons:
            lines.append(f"Motivos principales: {', '.join(reasons)}.")
        lines.append("Esperar mejores condiciones de viento, lluvia y humedad de hoja.")
        lines.append("")

    if nutrient_alerts:
        lines.append("<b>Suelo</b>")
        grouped = _group_nutrient_alerts(nutrient_alerts)
        for nutrient, stations_for_nutrient in grouped.items():
            lines.append(f"{nutrient} bajo en: {', '.join(stations_for_nutrient)}.")
        if any(str(item.get("station_name", "")).strip().upper() == "HUACA" for item in nutrient_alerts):
            lines.append("Nota: en HUACA los datos de nutrientes son referenciales porque esa estación usa unidades distintas.")
        lines.append("")

    if len(ordered) > 12:
        lines.append(f"Revisar el dashboard GAD para ver el detalle completo de {len(ordered)} avisos.")
    else:
        lines.append("Revisar el dashboard GAD para seguimiento por estación.")
    return "\n".join(lines).strip()


def alert_fingerprint(alerts: list[dict[str, Any]]) -> str:
    keys = [
        (
            item.get("id"),
            item.get("severity"),
            item.get("station_id"),
            item.get("title"),
            round(float(item["value"]), 2) if item.get("value") is not None else None,
        )
        for item in alerts
    ]
    return json.dumps(sorted(keys), sort_keys=True)


def _severity_rank(severity: str) -> int:
    return {"info": 1, "warning": 2, "critical": 3}.get(severity, 0)


def _community_alert_line(alert: dict[str, Any]) -> str:
    station = _html(str(alert.get("station_name", "Estacion")))
    category = str(alert.get("category", ""))
    value = alert.get("value")
    unit = str(alert.get("unit") or "")
    value_text = f" ({float(value):.1f} {unit})" if value is not None and unit else ""
    if category == "solar_radiation":
        return f"{station}: radiación solar muy alta{value_text}. Evitar exposición prolongada y proteger cultivos sensibles."
    if category == "rain":
        return f"{station}: lluvia intensa{value_text}. Revisar drenajes y caminos."
    if category == "wind":
        return f"{station}: viento fuerte{value_text}. Evitar fumigación y asegurar estructuras livianas."
    if category == "battery":
        return f"{station}: batería de estación baja{value_text}. Programar mantenimiento."
    if category in {"leaf_humidity", "frost"}:
        return f"{station}: {_html(str(alert.get('message', 'Condición climática requiere vigilancia.')))}"
    return f"{station}: {_html(str(alert.get('title', 'Aviso')))}. {_html(str(alert.get('message', '')))}"


def _spray_reasons(alerts: list[dict[str, Any]]) -> list[str]:
    found: list[str] = []
    text = " ".join(str(item.get("message", "")).lower() for item in alerts)
    if "lluvia" in text:
        found.append("lluvia reciente")
    if "viento" in text:
        found.append("viento alto")
    if "humedad de hoja" in text:
        found.append("hojas muy húmedas")
    if "temperatura" in text:
        found.append("temperatura fuera de rango")
    return found


def _group_nutrient_alerts(alerts: list[dict[str, Any]]) -> dict[str, list[str]]:
    labels = {"N": "Nitrógeno", "P": "Fósforo", "K": "Potasio"}
    grouped: dict[str, set[str]] = {}
    for alert in alerts:
        title = str(alert.get("title", ""))
        key = title.split(" ", 1)[0].strip().upper()
        nutrient = labels.get(key, "Nutriente")
        grouped.setdefault(nutrient, set()).add(_html(str(alert.get("station_name", "Estacion"))))
    return {nutrient: sorted(stations) for nutrient, stations in grouped.items()}


def _html(value: str) -> str:
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
