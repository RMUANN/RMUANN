import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
import threading
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parents[1]


class DownloadTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location('download', ROOT / 'tools' / 'download_models.py')
        cls.download = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.download)

    def test_download_checks_hash_and_places_file(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'source'
            source.write_bytes(b'model-fixture')
            target = Path(directory) / 'nested' / 'model'
            self.download.download_file(source.as_uri(), target, hashlib.sha256(b'model-fixture').hexdigest())
            self.assertEqual(target.read_bytes(), b'model-fixture')

    def test_wrong_hash_does_not_publish_partial_file(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'source'
            source.write_bytes(b'bad')
            target = Path(directory) / 'model'
            with self.assertRaisesRegex(ValueError, 'SHA256'):
                self.download.download_file(source.as_uri(), target, '0' * 64)
            self.assertFalse(target.exists())
            self.assertEqual(sorted(p.name for p in Path(directory).iterdir()), ['source'])

    def test_existing_good_file_needs_no_network(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'model'
            target.write_bytes(b'good')
            self.download.download_file('https://invalid.invalid/model', target, hashlib.sha256(b'good').hexdigest())
            self.assertEqual(target.read_bytes(), b'good')

    def test_existing_bad_file_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'model'
            target.write_bytes(b'original')
            with self.assertRaisesRegex(ValueError, 'existing'):
                self.download.download_file('https://invalid.invalid/model', target, '0' * 64)
            self.assertEqual(target.read_bytes(), b'original')

    def test_download_bypasses_cached_partial_response(self):
        body = b'complete-model'

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                fresh = bool(parse_qs(urlparse(self.path).query).get('comotion_download'))
                result = body if fresh else body[:3]
                self.send_response(200 if fresh else 206)
                self.send_header('Content-Length', str(len(result)))
                self.end_headers()
                self.wfile.write(result)

            def log_message(self, *args):
                pass

        with HTTPServer(('127.0.0.1', 0), Handler) as server:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                with tempfile.TemporaryDirectory() as directory:
                    target = Path(directory) / 'model'
                    self.download.download_file(f'http://127.0.0.1:{server.server_port}/model?download=true', target, hashlib.sha256(body).hexdigest())
                    self.assertEqual(target.read_bytes(), body)
            finally:
                server.shutdown()
                thread.join()

    def test_interrupted_body_resumes_at_verified_range_offset(self):
        body = b'complete-model-data'
        ranges = []

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                header = self.headers.get('Range')
                ranges.append(header)
                start = int(header.split('=')[1].split('-')[0]) if header else 0
                result = body[start:] if start else body[:5]
                self.send_response(206 if header else 200)
                self.send_header('Content-Length', str(len(body) - start))
                if header:
                    self.send_header('Content-Range', f'bytes {start}-{len(body)-1}/{len(body)}')
                self.end_headers()
                self.wfile.write(result)
                self.close_connection = True

            def log_message(self, *args):
                pass

        with HTTPServer(('127.0.0.1', 0), Handler) as server:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                with tempfile.TemporaryDirectory() as directory:
                    target = Path(directory) / 'model'
                    self.download.download_file(f'http://127.0.0.1:{server.server_port}/model', target, hashlib.sha256(body).hexdigest())
                    self.assertEqual(target.read_bytes(), body)
                    self.assertEqual(ranges, ['bytes=0-33554431', 'bytes=5-33554436'])
            finally:
                server.shutdown()
                thread.join()


if __name__ == '__main__':
    unittest.main()
