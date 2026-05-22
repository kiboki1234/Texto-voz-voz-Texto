from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class VoiceboxConfig:
    url: str = os.getenv("VOICEBOX_URL", "http://127.0.0.1:17493")
    timeout: int = int(os.getenv("VOICEBOX_TIMEOUT", "120"))
    max_file_size_mb: int = int(os.getenv("VOICEBOX_MAX_FILE_SIZE", "25"))
    poll_interval: float = float(os.getenv("VOICEBOX_POLL_INTERVAL", "1"))


voicebox_config = VoiceboxConfig()
