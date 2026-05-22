from __future__ import annotations

import logging
from functools import wraps

from fastapi import APIRouter, File, Request, UploadFile

from servicios_voces.exceptions import (
    VoiceboxConnectionError,
    VoiceboxHTTPError,
    VoiceboxTimeoutError,
    VoiceboxValidationError,
)
from servicios_voces.schemas import (
    ErrorResponse,
    HealthResponse,
    Profile,
    STTResponse,
    TTSRequest,
    TTSResponse,
)
from servicios_voces.service import VoiceboxService
from servicios_voces.utils import validate_audio_mime, validate_file_size

logger = logging.getLogger("voicebox.routes")
router = APIRouter(tags=["audio"])


def _service(request: Request) -> VoiceboxService:
    return request.app.state.voicebox_service


def _translate_errors(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except VoiceboxHTTPError as exc:
            if 400 <= exc.status_code < 500:
                raise ValueError(str(exc)) from exc
            raise RuntimeError(str(exc)) from exc
        except (VoiceboxConnectionError, VoiceboxTimeoutError) as exc:
            raise RuntimeError(str(exc)) from exc
        except VoiceboxValidationError as exc:
            raise ValueError(str(exc)) from exc

    return wrapper


@router.get(
    "/audio/health",
    response_model=HealthResponse,
    summary="Voicebox health check",
)
def audio_health(request: Request) -> HealthResponse:
    return _service(request).check_health()


@router.get(
    "/audio/profiles",
    response_model=list[Profile],
    summary="List available voice profiles",
)
def audio_profiles(request: Request) -> list[Profile]:
    return _service(request).list_profiles()


@router.post(
    "/audio/tts",
    response_model=TTSResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        503: {"model": ErrorResponse, "description": "Voicebox unavailable"},
    },
    summary="Convert text to speech",
)
@_translate_errors
def text_to_speech(payload: TTSRequest, request: Request) -> TTSResponse:
    return _service(request).synthesize(payload)


@router.post(
    "/audio/stt",
    response_model=STTResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid audio file"},
        503: {"model": ErrorResponse, "description": "Voicebox unavailable"},
    },
    summary="Convert speech to text",
)
@_translate_errors
async def speech_to_text(
    request: Request,
    audio: UploadFile = File(...),
) -> STTResponse:
    content_type = audio.content_type or "audio/wav"
    validate_audio_mime(content_type)
    content = await audio.read()
    validate_file_size(len(content), _service(request).client.config.max_file_size_mb)
    return _service(request).transcribe(
        filename=audio.filename or "recording.wav",
        content=content,
        content_type=content_type,
    )
