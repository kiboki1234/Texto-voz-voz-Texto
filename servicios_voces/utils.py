from __future__ import annotations

from servicios_voces.exceptions import VoiceboxValidationError

SUPPORTED_AUDIO_MIMES: dict[str, str] = {
    "wav": "audio/wav",
    "wave": "audio/wav",
    "mp3": "audio/mpeg",
    "m4a": "audio/mp4",
}

SUPPORTED_EXTENSIONS: frozenset[str] = frozenset({"wav", "mp3", "m4a", "wave"})


def validate_audio_mime(content_type: str | None) -> str:
    if content_type is None:
        raise VoiceboxValidationError("Audio file has no content type")

    normalized = content_type.lower().strip()
    valid_mimes = set(SUPPORTED_AUDIO_MIMES.values())

    if normalized not in valid_mimes:
        raise VoiceboxValidationError(
            f"Unsupported audio format: {content_type}. "
            f"Supported: {', '.join(sorted(valid_mimes))}"
        )
    return normalized


def validate_file_size(file_size: int, max_size_mb: int) -> None:
    max_bytes = max_size_mb * 1024 * 1024
    if file_size > max_bytes:
        raise VoiceboxValidationError(
            f"File size ({file_size / 1024 / 1024:.1f} MB) exceeds "
            f"maximum allowed ({max_size_mb} MB)"
        )


def guess_mime_from_extension(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return SUPPORTED_AUDIO_MIMES.get(ext, "application/octet-stream")
