from __future__ import annotations

import base64
import logging
from typing import Any

from servicios_voces.client import VoiceboxClient
from servicios_voces.exceptions import VoiceboxHTTPError
from servicios_voces.schemas import (
    HealthResponse,
    Profile,
    STTResponse,
    TTSRequest,
    TTSResponse,
)

logger = logging.getLogger("voicebox.service")

ENGLISH_FALLBACK_PROFILE = "Default"
SPANISH_PROFILE_NAME = "Español"


class VoiceboxService:
    def __init__(self, client: VoiceboxClient | None = None) -> None:
        self.client = client or VoiceboxClient()

    def synthesize(self, request: TTSRequest) -> TTSResponse:
        logger.info(
            "TTS request: text_len=%d, profile=%s, lang=%s",
            len(request.text),
            request.profile_id,
            request.language,
        )

        resolved_profile = self._resolve_profile(request.profile_id, request.language)

        payload: dict[str, Any] = {
            "profile_id": resolved_profile,
            "text": request.text,
            "language": request.language,
        }

        gen: dict[str, Any] = self.client.generate(payload).json()
        completed = self.client.wait_generation(gen["id"])
        audio_resp = self.client.get_audio(gen["id"])
        wav_bytes = audio_resp.content

        return TTSResponse(
            audio_data=base64.b64encode(wav_bytes).decode("ascii"),
            format="wav",
            duration=completed.get("duration"),
        )

    def _resolve_profile(self, profile_id: str, language: str) -> str:
        if profile_id != "default":
            return profile_id

        if language == "es":
            es_profile = self._find_profile_by_name(SPANISH_PROFILE_NAME)
            if es_profile:
                return es_profile.id

        en_profile = self._find_profile_by_name(ENGLISH_FALLBACK_PROFILE)
        if en_profile:
            return en_profile.id

        all_profiles = self.list_profiles()
        if all_profiles:
            return all_profiles[0].id

        raise VoiceboxHTTPError(404, "No voice profiles available")

    def _find_profile_by_name(self, name: str) -> Profile | None:
        for p in self.list_profiles():
            if p.name == name:
                return p
        return None

    def transcribe(
        self,
        filename: str,
        content: bytes,
        content_type: str,
        language: str | None = None,
    ) -> STTResponse:
        logger.info(
            "STT request: file=%s, size=%d, mime=%s",
            filename,
            len(content),
            content_type,
        )
        files: dict[str, tuple[str, bytes, str]] = {
            "file": (filename, content, content_type),
        }
        form: dict[str, str] = {}
        if language:
            form["language"] = language
        response = self.client.transcribe(files, data=form or None)
        data: dict[str, Any] = response.json()
        return STTResponse(
            text=data["text"],
            confidence=None,
            language=language,
        )

    def list_profiles(self) -> list[Profile]:
        response = self.client.profiles()
        data: list[dict[str, Any]] = response.json()
        return [
            Profile(
                id=p["id"],
                name=p["name"],
                language=p.get("language", "en"),
                description=p.get("description"),
            )
            for p in data
        ]

    def check_health(self) -> HealthResponse:
        response = self.client.health()
        data: dict[str, Any] = response.json()
        return HealthResponse(
            status=data.get("status", "unknown"),
            version=None,
        )

    def close(self) -> None:
        self.client.close()
