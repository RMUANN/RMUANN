import os
from dataclasses import dataclass
from pathlib import Path


def _path_env(name: str, default: Path) -> Path:
    value = os.getenv(name)
    return Path(value).expanduser() if value else default


def _int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return int(value)


def _float_env(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return float(value)


@dataclass(frozen=True)
class Settings:
    db_path: Path = Path("data/comotion.sqlite3")
    media_root: Path = Path("data/media")
    session_root: Path = Path("data/sessions")
    model_root: Path = Path(".")
    web_dir: Path = Path("../web")
    host: str = "127.0.0.1"
    port: int = 8000
    device: str = "auto"
    worker_poll_seconds: float = 1.0
    worker_id: str = "worker-1"
    max_prompt_chars: int = 300
    max_queue_size: int = 24
    max_data_bytes: int = 0
    ip_rate_limit: int = 20
    session_rate_limit: int = 12
    rate_window_seconds: int = 3600
    worker_ready_ttl_seconds: int = 30

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            db_path=_path_env("COMOTION_DB_PATH", cls.db_path),
            media_root=_path_env("COMOTION_MEDIA_ROOT", cls.media_root),
            session_root=_path_env("COMOTION_SESSION_ROOT", cls.session_root),
            model_root=_path_env("COMOTION_MODEL_ROOT", cls.model_root),
            web_dir=_path_env("COMOTION_WEB_DIR", cls.web_dir),
            host=os.getenv("COMOTION_HOST", cls.host),
            port=_int_env("COMOTION_PORT", cls.port),
            device=os.getenv("COMOTION_DEVICE", cls.device),
            worker_poll_seconds=_float_env("COMOTION_WORKER_POLL_SECONDS", cls.worker_poll_seconds),
            worker_id=os.getenv("COMOTION_WORKER_ID", cls.worker_id),
            max_prompt_chars=_int_env("COMOTION_MAX_PROMPT_CHARS", cls.max_prompt_chars),
            max_queue_size=_int_env("COMOTION_MAX_QUEUE_SIZE", cls.max_queue_size),
            max_data_bytes=_int_env("COMOTION_MAX_DATA_BYTES", cls.max_data_bytes),
            ip_rate_limit=_int_env("COMOTION_IP_RATE_LIMIT", cls.ip_rate_limit),
            session_rate_limit=_int_env("COMOTION_SESSION_RATE_LIMIT", cls.session_rate_limit),
            rate_window_seconds=_int_env("COMOTION_RATE_WINDOW_SECONDS", cls.rate_window_seconds),
            worker_ready_ttl_seconds=_int_env("COMOTION_WORKER_READY_TTL_SECONDS", cls.worker_ready_ttl_seconds),
        )

    def ensure_directories(self) -> None:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.media_root.mkdir(parents=True, exist_ok=True)
        (self.media_root / "jobs").mkdir(parents=True, exist_ok=True)
        self.session_root.mkdir(parents=True, exist_ok=True)

