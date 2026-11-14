from pathlib import Path
from typing import Dict, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, conint, validator

from .config import Settings
from .engine import MotionEngine, RealT2MEngine
from .storage import Store
from .worker import JobWorker


class SessionCreateRequest(BaseModel):
    prompt: str = Field(..., min_length=1)

    @validator("prompt")
    def prompt_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("prompt must not be blank")
        return stripped


class GenerationCreateRequest(BaseModel):
    action_counts: Dict[str, conint(ge=0, le=5)]

    @validator("action_counts")
    def action_counts_must_not_be_empty(cls, value):
        if not value:
            raise ValueError("action_counts must not be empty")
        return value


def create_app(
    settings: Optional[Settings] = None,
    engine: Optional[MotionEngine] = None,
    start_worker: bool = False,
) -> FastAPI:
    settings = settings or Settings.from_env()
    settings.ensure_directories()
    store = Store(settings)
    app = FastAPI(title="CoMotion API")
    app.state.settings = settings
    app.state.store = store
    app.state.engine = engine or RealT2MEngine(model_root=settings.model_root, device=settings.device)

    app.mount("/media", StaticFiles(directory=str(settings.media_root)), name="media")

    def client_ip(request: Request) -> str:
        cloudflare_ip = request.headers.get("cf-connecting-ip", "")
        if cloudflare_ip:
            return cloudflare_ip.strip()[:100]
        if request.client:
            return request.client.host
        return "unknown"

    def enforce_queue_capacity() -> None:
        if store.queued_or_running_count() >= settings.max_queue_size:
            raise HTTPException(status_code=429, detail="queue is full, please retry later")

    def enforce_data_capacity() -> None:
        if settings.max_data_bytes <= 0:
            return
        used_bytes = _persistent_data_bytes(settings)
        if used_bytes >= settings.max_data_bytes:
            raise HTTPException(
                status_code=507,
                detail=(
                    f"persistent data limit reached "
                    f"({used_bytes} >= {settings.max_data_bytes} bytes); please retry after maintenance"
                ),
            )

    def enforce_ip_rate_limit(ip: str) -> None:
        if store.recent_ip_count(ip) >= settings.ip_rate_limit:
            raise HTTPException(status_code=429, detail="too many jobs from this IP, please retry later")

    @app.get("/healthz")
    def healthz():
        return {"ok": True}

    @app.get("/readyz")
    def readyz():
        worker = store.get_ready_worker()
        if not worker:
            return JSONResponse(status_code=503, content={"ready": False})
        return {"ready": True, "worker_id": worker["worker_id"]}

    @app.post("/api/sessions", status_code=202)
    def create_session(req: SessionCreateRequest, request: Request):
        prompt = req.prompt.strip()
        if len(prompt) > settings.max_prompt_chars:
            raise HTTPException(status_code=422, detail=f"prompt must be <= {settings.max_prompt_chars} characters")
        ip = client_ip(request)
        enforce_data_capacity()
        enforce_queue_capacity()
        enforce_ip_rate_limit(ip)
        return store.create_session_with_job(prompt, ip)

    @app.get("/api/sessions/{session_id}")
    def get_session(session_id: str):
        session = store.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="session not found")
        return {
            "session_id": session["session_id"],
            "prompt": session["prompt"],
            "status": session["status"],
            "actions": session["actions"],
        }

    @app.post("/api/sessions/{session_id}/generations", status_code=202)
    def create_generation(session_id: str, req: GenerationCreateRequest, request: Request):
        session = store.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="session not found")
        if session["status"] != "ready" or not session["actions"]:
            raise HTTPException(status_code=409, detail="session initialization is not complete")
        allowed = {item["name"] for item in session["actions"]}
        for name in req.action_counts:
            if name not in allowed:
                raise HTTPException(status_code=400, detail=f"action '{name}' is not available for this session")
        if store.recent_session_count(session_id) >= settings.session_rate_limit:
            raise HTTPException(status_code=429, detail="too many jobs for this session, please retry later")
        ip = client_ip(request)
        enforce_data_capacity()
        enforce_queue_capacity()
        enforce_ip_rate_limit(ip)
        job_id = store.create_generation_job(session_id, dict(req.action_counts), ip)
        return {"session_id": session_id, "job_id": job_id}

    @app.get("/api/jobs/{job_id}")
    def get_job(job_id: str):
        job = store.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="job not found")
        body = {
            "job_id": job["job_id"],
            "session_id": job["session_id"],
            "kind": job["kind"],
            "status": job["status"],
        }
        if job["actions"]:
            body["actions"] = job["actions"]
        if job["mp4_path"]:
            body["mp4_url"] = _media_url(settings, Path(job["mp4_path"]))
        if job["npy_path"]:
            body["npy_url"] = _media_url(settings, Path(job["npy_path"]))
        if job["error"]:
            body["error"] = job["error"]
        queue_position = store.queue_position(job_id)
        if queue_position is not None:
            body["queue_position"] = queue_position
        return body

    if start_worker:
        worker = JobWorker(settings=settings, engine=app.state.engine)

        @app.on_event("startup")
        def _start_worker():
            import threading

            thread = threading.Thread(target=worker.run_forever, daemon=True)
            thread.start()

    if settings.web_dir.exists():
        app.mount("/", StaticFiles(directory=str(settings.web_dir), html=True), name="web")

    return app


def _media_url(settings: Settings, path: Path) -> str:
    media_root = settings.media_root.resolve()
    resolved = path.resolve()
    rel = resolved.relative_to(media_root)
    return "/media/" + "/".join(rel.parts)


def _persistent_data_bytes(settings: Settings) -> int:
    total = 0
    seen = set()
    for path in (settings.db_path, settings.media_root, settings.session_root):
        try:
            resolved = path.resolve()
        except OSError:
            resolved = path.absolute()
        key = str(resolved).lower()
        if key in seen:
            continue
        seen.add(key)
        total += _path_size(resolved)
    return total


def _path_size(path: Path) -> int:
    if not path.exists():
        return 0
    if path.is_file():
        return path.stat().st_size
    total = 0
    for child in path.rglob("*"):
        if child.is_file():
            total += child.stat().st_size
    return total

