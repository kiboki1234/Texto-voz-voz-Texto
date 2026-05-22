from __future__ import annotations


class VoiceboxError(Exception):
    """Base exception for Voicebox integration."""


class VoiceboxConnectionError(VoiceboxError):
    """Failed to connect to Voicebox service."""


class VoiceboxTimeoutError(VoiceboxError):
    """Request to Voicebox timed out."""


class VoiceboxHTTPError(VoiceboxError):
    """Voicebox returned an HTTP error."""

    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"Voicebox HTTP {status_code}: {detail}")


class VoiceboxValidationError(VoiceboxError):
    """Request validation failed."""
