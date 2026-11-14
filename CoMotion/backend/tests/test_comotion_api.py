import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

from fastapi.testclient import TestClient

from comotion.app import create_app
from comotion.config import Settings
from comotion.engine import EngineInitResult, EngineResult
from comotion.worker import JobWorker


class FakeEngine:
    def __init__(self, fail_generation=False):
        self.fail_generation = fail_generation

    def ready(self):
        return True

    def initialize(self, prompt, session_dir, job_dir):
        session_dir.mkdir(parents=True, exist_ok=True)
        job_dir.mkdir(parents=True, exist_ok=True)
        base_path = session_dir / "base_tokens.pkl"
        text_path = session_dir / "text_feature.pkl"
        base_path.write_bytes(b"base")
        text_path.write_bytes(b"text")
        (job_dir / "result.mp4").write_bytes(b"mp4")
        (job_dir / "result.npy").write_bytes(b"npy")
        return EngineInitResult(
            actions=[
                {"name": "walk", "score": 0.95},
                {"name": "turn left", "score": 0.8},
                {"name": "jump", "score": 0.7},
                {"name": "sit", "score": 0.6},
                {"name": "wave", "score": 0.5},
                {"name": "dance", "score": 0.4},
            ],
            base_tokens_path=base_path,
            text_feature_path=text_path,
            mp4_path=job_dir / "result.mp4",
            npy_path=job_dir / "result.npy",
        )

    def generate(self, session, action_counts, job_dir):
        if self.fail_generation:
            raise RuntimeError("boom")
        job_dir.mkdir(parents=True, exist_ok=True)
        (job_dir / "result.mp4").write_bytes(str(action_counts).encode("utf-8"))
        (job_dir / "result.npy").write_bytes(b"npy")
        return EngineResult(mp4_path=job_dir / "result.mp4", npy_path=job_dir / "result.npy")


def make_client(tmp_path, engine=None, **overrides):
    values = {
        "db_path": tmp_path / "comotion.sqlite3",
        "media_root": tmp_path / "media",
        "session_root": tmp_path / "sessions",
        "max_queue_size": 20,
        "ip_rate_limit": 100,
        "session_rate_limit": 100,
    }
    values.update(overrides)
    settings = Settings(**values)
    app = create_app(settings=settings, engine=engine or FakeEngine(), start_worker=False)
    return TestClient(app), settings


def run_one(settings, engine):
    worker = JobWorker(settings=settings, engine=engine)
    assert worker.process_once() is True


class ComotionApiTests(unittest.TestCase):
    def test_session_init_is_queued_then_persists_actions_and_media_urls(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            client, settings = make_client(tmp_path)

            response = client.post("/api/sessions", json={"prompt": "a person walks and jumps"})

            self.assertEqual(response.status_code, 202)
            created = response.json()
            self.assertEqual(set(created), {"session_id", "job_id"})

            queued = client.get(f"/api/jobs/{created['job_id']}").json()
            self.assertEqual(queued["status"], "queued")
            self.assertEqual(queued["queue_position"], 1)

            run_one(settings, FakeEngine())
            done = client.get(f"/api/jobs/{created['job_id']}").json()
            self.assertEqual(done["status"], "succeeded")
            self.assertEqual(
                [item["name"] for item in done["actions"]],
                ["walk", "turn left", "jump", "sit", "wave", "dance"],
            )
            self.assertTrue(done["mp4_url"].startswith("/media/jobs/"))
            self.assertTrue(Path(settings.media_root, "jobs", created["job_id"], "result.mp4").exists())


    def test_generation_rejects_unknown_action_and_out_of_range_count(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            client, settings = make_client(tmp_path)
            created = client.post("/api/sessions", json={"prompt": "walk"}).json()
            run_one(settings, FakeEngine())

            unknown = client.post(
                f"/api/sessions/{created['session_id']}/generations",
                json={"action_counts": {"fly": 2}},
            )
            too_large = client.post(
                f"/api/sessions/{created['session_id']}/generations",
                json={"action_counts": {"walk": 6}},
            )

            self.assertEqual(unknown.status_code, 400)
            self.assertIn("not available", unknown.json()["detail"])
            self.assertEqual(too_large.status_code, 422)


    def test_generation_job_uses_persisted_session_after_app_restart(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            engine = FakeEngine()
            client, settings = make_client(tmp_path, engine=engine)
            created = client.post("/api/sessions", json={"prompt": "walk"}).json()
            run_one(settings, engine)

            restarted_client, restarted_settings = make_client(tmp_path, engine=engine)
            generation = restarted_client.post(
                f"/api/sessions/{created['session_id']}/generations",
                json={"action_counts": {"walk": 3, "jump": 1}},
            )

            self.assertEqual(generation.status_code, 202)
            run_one(restarted_settings, engine)
            done = restarted_client.get(f"/api/jobs/{generation.json()['job_id']}").json()
            self.assertEqual(done["status"], "succeeded")
            self.assertEqual(done["mp4_url"], f"/media/jobs/{generation.json()['job_id']}/result.mp4")


    def test_worker_records_failed_jobs_without_success_urls(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            engine = FakeEngine(fail_generation=True)
            client, settings = make_client(tmp_path, engine=engine)
            created = client.post("/api/sessions", json={"prompt": "walk"}).json()
            run_one(settings, FakeEngine())

            generation = client.post(
                f"/api/sessions/{created['session_id']}/generations",
                json={"action_counts": {"walk": 1}},
            ).json()
            run_one(settings, engine)

            failed = client.get(f"/api/jobs/{generation['job_id']}").json()
            self.assertEqual(failed["status"], "failed")
            self.assertEqual(failed["error"], "boom")
            self.assertIsNone(failed.get("mp4_url"))


    def test_readyz_reports_not_ready_when_engine_is_unavailable(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            client, _settings = make_client(tmp_path)

            self.assertTrue(client.get("/healthz").json()["ok"])
            response = client.get("/readyz")
            self.assertEqual(response.status_code, 503)
            self.assertFalse(response.json()["ready"])

    def test_readyz_uses_worker_heartbeat_instead_of_api_engine_state(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            client, settings = make_client(tmp_path)
            settings_store = client.app.state.store

            settings_store.set_worker_status("worker-test", True, None)

            response = client.get("/readyz")
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["ready"])
            self.assertEqual(response.json()["worker_id"], "worker-test")

    def test_stale_access_code_environment_does_not_block_public_submissions(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            with patch.dict(
                "os.environ",
                {
                    "COMOTION_DB_PATH": str(tmp_path / "comotion.sqlite3"),
                    "COMOTION_MEDIA_ROOT": str(tmp_path / "media"),
                    "COMOTION_SESSION_ROOT": str(tmp_path / "sessions"),
                    "COMOTION_ACCESS_CODE": "obsolete-secret",
                },
            ):
                settings = Settings.from_env()
            client = TestClient(create_app(settings=settings, engine=FakeEngine()))

            created = client.post("/api/sessions", json={"prompt": "walk"})
            self.assertEqual(created.status_code, 202)
            run_one(settings, FakeEngine())
            generation = client.post(
                f"/api/sessions/{created.json()['session_id']}/generations",
                json={"action_counts": {"walk": 1}},
            )
            self.assertEqual(generation.status_code, 202)

    def test_client_ip_ignores_untrusted_x_forwarded_for_header(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            client, _settings = make_client(tmp_path, ip_rate_limit=1)

            first = client.post("/api/sessions", json={"prompt": "walk"}, headers={"X-Forwarded-For": "1.2.3.4"})
            second = client.post("/api/sessions", json={"prompt": "run"}, headers={"X-Forwarded-For": "5.6.7.8"})

            self.assertEqual(first.status_code, 202)
            self.assertEqual(second.status_code, 429)

    def test_session_submission_is_rejected_when_data_limit_is_reached(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            media_root = tmp_path / "media"
            media_root.mkdir()
            (media_root / "existing.bin").write_bytes(b"x" * 12)
            client, _settings = make_client(tmp_path, media_root=media_root, max_data_bytes=10)

            response = client.post("/api/sessions", json={"prompt": "walk"})

            self.assertEqual(response.status_code, 507)
            self.assertIn("persistent data limit", response.json()["detail"])

    def test_generation_submission_is_rejected_when_data_limit_is_reached(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            client, settings = make_client(tmp_path)
            created = client.post("/api/sessions", json={"prompt": "walk"}).json()
            run_one(settings, FakeEngine())
            (Path(settings.media_root) / "existing.bin").write_bytes(b"x" * 12)
            limited_client, _limited_settings = make_client(
                tmp_path,
                media_root=settings.media_root,
                session_root=settings.session_root,
                max_data_bytes=10,
            )

            response = limited_client.post(
                f"/api/sessions/{created['session_id']}/generations",
                json={"action_counts": {"walk": 1}},
            )

            self.assertEqual(response.status_code, 507)
            self.assertIn("persistent data limit", response.json()["detail"])

    def test_session_submission_continues_when_data_limit_has_capacity(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            media_root = tmp_path / "media"
            media_root.mkdir()
            (media_root / "existing.bin").write_bytes(b"x" * 12)
            client, _settings = make_client(tmp_path, media_root=media_root, max_data_bytes=1_000_000_000)

            response = client.post("/api/sessions", json={"prompt": "walk"})

            self.assertEqual(response.status_code, 202)
            self.assertEqual(set(response.json()), {"session_id", "job_id"})


if __name__ == "__main__":
    unittest.main()

