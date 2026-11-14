import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi.testclient import TestClient

from comotion.app import create_app
from comotion.config import Settings
from comotion.engine import EngineInitResult, EngineResult
from comotion.worker import JobWorker


class EchoEngine:
    def ready(self):
        return True

    def warmup(self):
        return None

    def initialize(self, prompt, session_dir, job_dir):
        session_dir.mkdir(parents=True, exist_ok=True)
        job_dir.mkdir(parents=True, exist_ok=True)
        base_path = session_dir / "base_tokens.txt"
        feature_path = session_dir / "text_feature.txt"
        base_path.write_text(prompt, encoding="utf-8")
        feature_path.write_text(prompt, encoding="utf-8")
        mp4_path = job_dir / "result.mp4"
        npy_path = job_dir / "result.npy"
        mp4_path.write_text(prompt, encoding="utf-8")
        npy_path.write_bytes(b"npy")
        return EngineInitResult(
            actions=[{"name": "walk", "score": 0.9}],
            base_tokens_path=base_path,
            text_feature_path=feature_path,
            mp4_path=mp4_path,
            npy_path=npy_path,
        )

    def generate(self, session, action_counts, job_dir):
        job_dir.mkdir(parents=True, exist_ok=True)
        mp4_path = job_dir / "result.mp4"
        npy_path = job_dir / "result.npy"
        prompt = session.base_tokens_path.read_text(encoding="utf-8")
        mp4_path.write_text("{}:{}".format(prompt, action_counts["walk"]), encoding="utf-8")
        npy_path.write_bytes(b"npy")
        return EngineResult(mp4_path=mp4_path, npy_path=npy_path)


class ConcurrencyTests(unittest.TestCase):
    def test_twenty_sessions_queue_and_keep_results_isolated(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            settings = Settings(
                db_path=root / "jobs.sqlite3",
                media_root=root / "media",
                session_root=root / "sessions",
                web_dir=root / "no-web",
                max_queue_size=24,
                ip_rate_limit=30,
            )
            engine = EchoEngine()
            client = TestClient(create_app(settings=settings, engine=engine))

            def submit(index):
                prompt = "person {} walks".format(index)
                response = client.post("/api/sessions", json={"prompt": prompt})
                return prompt, response

            with ThreadPoolExecutor(max_workers=10) as pool:
                submitted = list(pool.map(submit, range(20)))

            self.assertTrue(all(response.status_code == 202 for _, response in submitted))
            session_ids = [response.json()["session_id"] for _, response in submitted]
            job_ids = [response.json()["job_id"] for _, response in submitted]
            self.assertEqual(len(set(session_ids)), 20)
            self.assertEqual(len(set(job_ids)), 20)

            worker = JobWorker(settings=settings, engine=engine)
            for _ in range(20):
                self.assertTrue(worker.process_once())
            self.assertFalse(worker.process_once())

            for prompt, response in submitted:
                job_id = response.json()["job_id"]
                job = client.get("/api/jobs/{}".format(job_id)).json()
                self.assertEqual(job["status"], "succeeded")
                self.assertEqual((root / "media" / "jobs" / job_id / "result.mp4").read_text(), prompt)

            first_session = session_ids[0]
            last_session = session_ids[-1]
            first_job = client.post(
                "/api/sessions/{}/generations".format(first_session),
                json={"action_counts": {"walk": 1}},
            ).json()["job_id"]
            last_job = client.post(
                "/api/sessions/{}/generations".format(last_session),
                json={"action_counts": {"walk": 5}},
            ).json()["job_id"]
            self.assertTrue(worker.process_once())
            self.assertTrue(worker.process_once())
            self.assertEqual(
                (root / "media" / "jobs" / first_job / "result.mp4").read_text(),
                "{}:1".format(submitted[0][0]),
            )
            self.assertEqual(
                (root / "media" / "jobs" / last_job / "result.mp4").read_text(),
                "{}:5".format(submitted[-1][0]),
            )


if __name__ == "__main__":
    unittest.main()
