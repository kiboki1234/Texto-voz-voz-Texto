from __future__ import annotations

import logging
import time
from typing import Any

import httpx

from servicios_voces.config import voicebox_config
from servicios_voces.exceptions import (
    VoiceboxConnectionError,
    VoiceboxHTTPError,
    VoiceboxTimeoutError,
)

logger = logging.getLogger("voicebox.client")


class VoiceboxClient:
    def __init__(self) -> None:
        self.config = voicebox_config
        self._client = httpx.Client(
            base_url=self.config.url,
            timeout=httpx.Timeout(self.config.timeout, connect=10.0),
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
        )

    def _request(
        self,
        method: str,
        path: str,
        **kwargs: Any,
    ) -> httpx.Response:
        logger.info("Voicebox %s %s", method, path)
        try:
            response = self._client.request(method, path, **kwargs)
        except httpx.ConnectError as exc:
            logger.error("Voicebox connection failed: %s", exc)
            raise VoiceboxConnectionError(
                f"Cannot connect to Voicebox at {self.config.url}"
            ) from exc
        except httpx.TimeoutException as exc:
            logger.error("Voicebox request timed out: %s", exc)
            raise VoiceboxTimeoutError(
                f"Voicebox request timed out after {self.config.timeout}s"
            ) from exc
        except httpx.HTTPError as exc:
            logger.error("Voicebox HTTP error: %s", exc)
            raise VoiceboxHTTPError(0, str(exc)) from exc

        if response.is_error:
            body = response.text[:500]
            logger.warning(
                "Voicebox returned %s: %s",
                response.status_code,
                body,
            )
            raise VoiceboxHTTPError(response.status_code, body)

        logger.info("Voicebox %s %s -> %s", method, path, response.status_code)
        return response

    def generate(self, payload: dict[str, Any]) -> httpx.Response:
        return self._request("POST", "/generate", json=payload)

    def get_generation(self, generation_id: str) -> httpx.Response:
        return self._request("GET", f"/history/{generation_id}")

    def get_audio(self, generation_id: str) -> httpx.Response:
        return self._request("GET", f"/audio/{generation_id}")

    def wait_generation(self, generation_id: str) -> dict[str, Any]:
        deadline = time.monotonic() + self.config.timeout
        while time.monotonic() < deadline:
            data: dict[str, Any] = self.get_generation(generation_id).json()
            status = data.get("status") or "completed"
            if status == "completed":
                return data
            if status == "failed":
                detail = data.get("error") or "Voice generation failed"
                raise VoiceboxHTTPError(500, detail)
            time.sleep(self.config.poll_interval)
        raise VoiceboxTimeoutError(
            f"Voice generation {generation_id} did not complete within {self.config.timeout}s"
        )

    def transcribe(
        self,
        files: dict[str, tuple[str, bytes, str]],
        data: dict[str, str] | None = None,
    ) -> httpx.Response:
        return self._request("POST", "/transcribe", files=files, data=data or {})

    def profiles(self) -> httpx.Response:
        return self._request("GET", "/profiles")

    def health(self) -> httpx.Response:
        return self._request("GET", "/health")

    def close(self) -> None:
        self._client.close()
