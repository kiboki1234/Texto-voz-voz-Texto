from __future__ import annotations

from pydantic import BaseModel, Field


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    profile_id: str = "default"
    language: str = Field("es", min_length=2, max_length=5)


class TTSResponse(BaseModel):
    audio_data: str
    format: str = "wav"
    duration: float | None = None


class STTResponse(BaseModel):
    text: str
    confidence: float | None = None
    language: str | None = None


class Profile(BaseModel):
    id: str
    name: str
    language: str
    description: str | None = None


class HealthResponse(BaseModel):
    status: str
    version: str | None = None


class ErrorResponse(BaseModel):
    detail: str
    error_code: str | None = None
