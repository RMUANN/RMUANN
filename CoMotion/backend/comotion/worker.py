import time
from pathlib import Path
from typing import Optional

from .config import Settings
from .engine import MotionEngine, RealT2MEngine, SessionArtifacts
from .storage import Store


class JobWorker:
    def __init__(self, settings: Settings, engine: Optional[MotionEngine] = None):
        self.settings = settings
        self.store = Store(settings)
        self.engine = engine or RealT2MEngine(model_root=settings.model_root, device=settings.device)

    def process_once(self) -> bool:
        job = self.store.claim_next_job(self.settings.worker_id)
        if job is None:
            return False
        job_id = job["job_id"]
        try:
            session = self.store.get_session(job["session_id"])
            if session is None:
                raise RuntimeError("session not found")
            session_dir = self._session_dir(job["session_id"])
            job_dir = self._job_dir(job_id)
            if job["kind"] == "init":
                result = self.engine.initialize(session["prompt"], session_dir, job_dir)
                self.store.complete_init_job(
                    job_id,
                    result.actions,
                    result.base_tokens_path,
                    result.text_feature_path,
                    result.mp4_path,
                    result.npy_path,
                )
            elif job["kind"] == "generation":
                if not session["actions"]:
                    raise RuntimeError("session is not ready")
                artifacts = SessionArtifacts(
                    session_id=session["session_id"],
                    prompt=session["prompt"],
                    actions=session["actions"],
                    base_tokens_path=Path(session["base_tokens_path"]),
                    text_feature_path=Path(session["text_feature_path"]),
                )
                result = self.engine.generate(artifacts, job["payload"]["action_counts"], job_dir)
                self.store.complete_generation_job(job_id, result.mp4_path, result.npy_path)
            else:
                raise RuntimeError(f"unknown job kind: {job['kind']}")
            return True
        except Exception as exc:
            self.store.fail_job(job_id, str(exc))
            return True

    def run_forever(self) -> None:
        try:
            self.engine.warmup()
            self.store.set_worker_status(self.settings.worker_id, True, None)
        except Exception as exc:
            self.store.set_worker_status(self.settings.worker_id, False, str(exc))
        self.store.recover_running_jobs()
        while True:
            did_work = self.process_once()
            if self.engine.ready():
                self.store.set_worker_status(self.settings.worker_id, True, None)
            if not did_work:
                time.sleep(self.settings.worker_poll_seconds)

    def _job_dir(self, job_id: str) -> Path:
        return self.settings.media_root / "jobs" / job_id

    def _session_dir(self, session_id: str) -> Path:
        return self.settings.session_root / session_id


def main() -> None:
    settings = Settings.from_env()
    JobWorker(settings=settings).run_forever()


if __name__ == "__main__":
    main()

