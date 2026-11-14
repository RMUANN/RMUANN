import json
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

from .config import Settings


def now_ts() -> float:
    return time.time()


class Store:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.settings.ensure_directories()
        self._init_schema()

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(str(self.settings.db_path), timeout=30, isolation_level=None)
        try:
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA foreign_keys=ON")
            with conn:
                yield conn
        finally:
            conn.close()

    def _init_schema(self) -> None:
        with self.connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    prompt TEXT NOT NULL,
                    status TEXT NOT NULL,
                    actions_json TEXT,
                    base_tokens_path TEXT,
                    text_feature_path TEXT,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                );
                CREATE TABLE IF NOT EXISTS jobs (
                    job_id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    status TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    actions_json TEXT,
                    mp4_path TEXT,
                    npy_path TEXT,
                    error TEXT,
                    client_ip TEXT,
                    claimed_by TEXT,
                    claimed_at REAL,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL,
                    FOREIGN KEY(session_id) REFERENCES sessions(session_id)
                );
                CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at);
                CREATE INDEX IF NOT EXISTS idx_jobs_session_created ON jobs(session_id, created_at);
                CREATE INDEX IF NOT EXISTS idx_jobs_ip_created ON jobs(client_ip, created_at);
                CREATE TABLE IF NOT EXISTS worker_status (
                    worker_id TEXT PRIMARY KEY,
                    ready INTEGER NOT NULL,
                    error TEXT,
                    updated_at REAL NOT NULL
                );
                """
            )

    def create_session_with_job(self, prompt: str, client_ip: str) -> Dict[str, str]:
        session_id = str(uuid.uuid4())
        job_id = str(uuid.uuid4())
        ts = now_ts()
        with self.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute(
                "INSERT INTO sessions(session_id,prompt,status,created_at,updated_at) VALUES(?,?,?,?,?)",
                (session_id, prompt, "initializing", ts, ts),
            )
            conn.execute(
                """
                INSERT INTO jobs(job_id,session_id,kind,status,payload_json,client_ip,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?,?)
                """,
                (job_id, session_id, "init", "queued", json.dumps({"prompt": prompt}), client_ip, ts, ts),
            )
            conn.commit()
        return {"session_id": session_id, "job_id": job_id}

    def create_generation_job(self, session_id: str, action_counts: Dict[str, int], client_ip: str) -> str:
        job_id = str(uuid.uuid4())
        ts = now_ts()
        with self.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute(
                """
                INSERT INTO jobs(job_id,session_id,kind,status,payload_json,client_ip,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?,?)
                """,
                (
                    job_id,
                    session_id,
                    "generation",
                    "queued",
                    json.dumps({"action_counts": action_counts}, ensure_ascii=False),
                    client_ip,
                    ts,
                    ts,
                ),
            )
            conn.commit()
        return job_id

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM sessions WHERE session_id=?", (session_id,)).fetchone()
        return self._row_to_session(row) if row else None

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM jobs WHERE job_id=?", (job_id,)).fetchone()
        return self._row_to_job(row) if row else None

    def queue_position(self, job_id: str) -> Optional[int]:
        job = self.get_job(job_id)
        if not job or job["status"] != "queued":
            return None
        with self.connect() as conn:
            value = conn.execute(
                "SELECT COUNT(*) FROM jobs WHERE status='queued' AND created_at <= ?",
                (job["created_at"],),
            ).fetchone()[0]
        return int(value)

    def queued_or_running_count(self) -> int:
        with self.connect() as conn:
            value = conn.execute("SELECT COUNT(*) FROM jobs WHERE status IN ('queued','running')").fetchone()[0]
        return int(value)

    def recent_ip_count(self, client_ip: str) -> int:
        since = now_ts() - self.settings.rate_window_seconds
        with self.connect() as conn:
            value = conn.execute(
                "SELECT COUNT(*) FROM jobs WHERE client_ip=? AND created_at>=?",
                (client_ip, since),
            ).fetchone()[0]
        return int(value)

    def recent_session_count(self, session_id: str) -> int:
        since = now_ts() - self.settings.rate_window_seconds
        with self.connect() as conn:
            value = conn.execute(
                "SELECT COUNT(*) FROM jobs WHERE session_id=? AND created_at>=?",
                (session_id, since),
            ).fetchone()[0]
        return int(value)

    def recover_running_jobs(self) -> int:
        ts = now_ts()
        with self.connect() as conn:
            cur = conn.execute(
                """
                UPDATE jobs
                SET status='queued', claimed_by=NULL, claimed_at=NULL, updated_at=?
                WHERE status='running'
                """,
                (ts,),
            )
            return int(cur.rowcount)

    def set_worker_status(self, worker_id: str, ready: bool, error: Optional[str]) -> None:
        ts = now_ts()
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO worker_status(worker_id,ready,error,updated_at)
                VALUES(?,?,?,?)
                ON CONFLICT(worker_id) DO UPDATE SET
                    ready=excluded.ready,
                    error=excluded.error,
                    updated_at=excluded.updated_at
                """,
                (worker_id, 1 if ready else 0, error, ts),
            )

    def get_ready_worker(self) -> Optional[Dict[str, Any]]:
        since = now_ts() - self.settings.worker_ready_ttl_seconds
        with self.connect() as conn:
            row = conn.execute(
                """
                SELECT * FROM worker_status
                WHERE ready=1 AND updated_at>=?
                ORDER BY updated_at DESC
                LIMIT 1
                """,
                (since,),
            ).fetchone()
        return dict(row) if row else None

    def claim_next_job(self, worker_id: str) -> Optional[Dict[str, Any]]:
        ts = now_ts()
        with self.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            row = conn.execute(
                "SELECT * FROM jobs WHERE status='queued' ORDER BY created_at LIMIT 1"
            ).fetchone()
            if row is None:
                conn.commit()
                return None
            conn.execute(
                """
                UPDATE jobs
                SET status='running', claimed_by=?, claimed_at=?, updated_at=?
                WHERE job_id=? AND status='queued'
                """,
                (worker_id, ts, ts, row["job_id"]),
            )
            conn.commit()
        return self.get_job(row["job_id"])

    def complete_init_job(
        self,
        job_id: str,
        actions: List[Dict[str, float]],
        base_tokens_path: Path,
        text_feature_path: Path,
        mp4_path: Path,
        npy_path: Path,
    ) -> None:
        job = self.get_job(job_id)
        if not job:
            raise RuntimeError("job not found")
        ts = now_ts()
        actions_json = json.dumps(actions, ensure_ascii=False)
        with self.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute(
                """
                UPDATE sessions
                SET status='ready', actions_json=?, base_tokens_path=?, text_feature_path=?, updated_at=?
                WHERE session_id=?
                """,
                (actions_json, str(base_tokens_path), str(text_feature_path), ts, job["session_id"]),
            )
            conn.execute(
                """
                UPDATE jobs
                SET status='succeeded', actions_json=?, mp4_path=?, npy_path=?, error=NULL, updated_at=?
                WHERE job_id=?
                """,
                (actions_json, str(mp4_path), str(npy_path), ts, job_id),
            )
            conn.commit()

    def complete_generation_job(self, job_id: str, mp4_path: Path, npy_path: Path) -> None:
        ts = now_ts()
        with self.connect() as conn:
            conn.execute(
                """
                UPDATE jobs
                SET status='succeeded', mp4_path=?, npy_path=?, error=NULL, updated_at=?
                WHERE job_id=?
                """,
                (str(mp4_path), str(npy_path), ts, job_id),
            )

    def fail_job(self, job_id: str, error: str) -> None:
        ts = now_ts()
        job = self.get_job(job_id)
        with self.connect() as conn:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute(
                """
                UPDATE jobs
                SET status='failed', error=?, mp4_path=NULL, npy_path=NULL, updated_at=?
                WHERE job_id=?
                """,
                (error, ts, job_id),
            )
            if job and job["kind"] == "init":
                conn.execute(
                    "UPDATE sessions SET status='failed', updated_at=? WHERE session_id=?",
                    (ts, job["session_id"]),
                )
            conn.commit()

    @staticmethod
    def _row_to_job(row: sqlite3.Row) -> Dict[str, Any]:
        item = dict(row)
        item["payload"] = json.loads(item.pop("payload_json"))
        actions_json = item.pop("actions_json")
        item["actions"] = json.loads(actions_json) if actions_json else None
        return item

    @staticmethod
    def _row_to_session(row: sqlite3.Row) -> Dict[str, Any]:
        item = dict(row)
        actions_json = item.pop("actions_json")
        item["actions"] = json.loads(actions_json) if actions_json else None
        return item

