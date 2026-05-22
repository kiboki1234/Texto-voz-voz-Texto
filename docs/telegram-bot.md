# Bot Telegram AgroNoticIAs

El backend puede enviar alertas institucionales al grupo del GAD mediante el bot de Telegram.

## Variables

Configurar en `backend/.env`:

```text
TELEGRAM_BOT_TOKEN=token-del-bot
TELEGRAM_CHAT_ID=id-del-grupo
TELEGRAM_NOTIFICATIONS_ENABLED=true
TELEGRAM_ALERT_INTERVAL_SECONDS=900
```

No guardar el token en Git.

## Obtener el chat_id del grupo

1. Agregar `@agronotocias_bot` al grupo del GAD.
2. Enviar un mensaje o comando dentro del grupo, por ejemplo `/start`.
3. Consultar:

```text
GET /api/telegram/updates
```

4. Copiar el `chat_id` del grupo en `TELEGRAM_CHAT_ID`.

## Enviar prueba manual

```text
POST /api/telegram/notify-current
```

Este endpoint envía al grupo el resumen actual de alertas calculadas desde SQL Server.

## Envío automático

Si `TELEGRAM_NOTIFICATIONS_ENABLED=true`, el backend revisa las alertas cada `TELEGRAM_ALERT_INTERVAL_SECONDS`.
Solo envía un nuevo mensaje cuando cambia el conjunto de alertas para evitar spam.

## Limitación de Telegram

Un bot no puede enviar mensajes privados a todos los integrantes del grupo si ellos no iniciaron conversación con el bot.
La forma correcta para el GAD es enviar el mensaje al chat del grupo, visible para todos sus integrantes.
