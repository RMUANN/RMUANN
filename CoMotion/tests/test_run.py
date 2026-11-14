import importlib.util
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import unittest
import ctypes
import time

ROOT = Path(__file__).resolve().parents[1]


class LauncherTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location('launcher', ROOT / 'run.py')
        cls.launcher = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.launcher)

    def test_config_paths_are_relative_to_config_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'config.json'
            path.write_text(json.dumps({'model_root': 'models', 'data_dir': 'results', 'port': 8123}))
            env = self.launcher.build_environment(ROOT, path, {})
            self.assertEqual(env['COMOTION_MODEL_ROOT'], str(Path(directory) / 'models'))
            self.assertEqual(env['COMOTION_DB_PATH'], str(Path(directory) / 'results' / 'comotion.sqlite3'))
            self.assertEqual(env['COMOTION_PORT'], '8123')
            self.assertEqual(env['COMOTION_WEB_DIR'], str(ROOT / 'web'))

    def test_unknown_config_key_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'config.json'
            path.write_text('{"prot": 8123}')
            with self.assertRaisesRegex(ValueError, 'prot'):
                self.launcher.build_environment(ROOT, path, {})

    def test_invalid_host_and_path_types_report_config_error(self):
        for name, value in [('host', None), ('host', ''), ('model_root', 12), ('data_dir', []), ('data_dir', '')]:
            with self.subTest(name=name, value=value):
                with tempfile.TemporaryDirectory() as directory:
                    path = Path(directory) / 'config.json'
                    path.write_text(json.dumps({name: value}))
                    with self.assertRaisesRegex(ValueError, name):
                        self.launcher.build_environment(ROOT, path, {})

    def test_native_runtime_imports_are_isolated_from_launcher(self):
        with tempfile.TemporaryDirectory() as directory:
            for module in ('fastapi', 'uvicorn', 'numpy', 'matplotlib', 'sklearn', 'imageio', 'imageio_ffmpeg', 'clip'):
                (Path(directory) / (module + '.py')).write_text('')
            (Path(directory) / 'torch.py').write_text('class cuda:\n    @staticmethod\n    def is_available(): return True\n')
            env = dict(os.environ, PYTHONPATH=directory)
            script = "import sys,run; run.check_runtime(); print('torch' in sys.modules)"
            result = subprocess.run([sys.executable, '-c', script], cwd=ROOT, env=env, capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout.strip(), 'False')

    def test_cli_overrides_config_without_changing_parent_environment(self):
        old = dict(os.environ)
        env = self.launcher.build_environment(ROOT, None, {'port': 8234})
        self.assertEqual(env['COMOTION_PORT'], '8234')
        self.assertEqual(dict(os.environ), old)

    def test_missing_models_fail_before_service_start(self):
        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run([sys.executable, str(ROOT / 'run.py'), '--model-root', directory, '--check'], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('download_models.py', result.stderr)

    def test_occupied_port_is_rejected_without_stopping_its_owner(self):
        with socket.socket() as listener:
            listener.bind(('127.0.0.1', 0))
            listener.listen()
            with self.assertRaises(OSError):
                self.launcher.check_port('127.0.0.1', listener.getsockname()[1])
            self.assertGreater(listener.fileno(), -1)

    def test_shutdown_only_stops_owned_children(self):
        owned = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(30)'])
        unrelated = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(30)'])
        try:
            self.launcher.stop_children([owned])
            self.assertIsNotNone(owned.poll())
            self.assertIsNone(unrelated.poll())
        finally:
            unrelated.terminate()
            unrelated.wait(timeout=5)

    def test_parent_termination_runs_child_cleanup(self):
        script = '''
import os, signal, sys, threading
from unittest.mock import patch
import run
class Child:
    def poll(self): return None
    def terminate(self): print('owned child stopped', flush=True)
    def wait(self, timeout=None): return 0
sys.argv = ['run.py']
with patch.object(run, 'check_assets'), patch.object(run, 'check_runtime'), patch.object(run, 'check_port'), patch.object(run.subprocess, 'Popen', side_effect=lambda *a, **k: Child()), patch.object(run, 'stop_children', side_effect=lambda children: [c.terminate() for c in children]):
    threading.Timer(0.2, lambda: os.kill(os.getpid(), signal.SIGTERM) if os.name != 'nt' else signal.raise_signal(signal.SIGTERM)).start()
    sys.exit(run.main())
'''
        result = subprocess.run([sys.executable, '-u', '-c', script], cwd=ROOT, capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.count('owned child stopped'), 2)

    @unittest.skipUnless(os.name == 'nt', 'Windows process tree cleanup')
    def test_shutdown_stops_owned_descendant(self):
        kernel = ctypes.windll.kernel32
        kernel.OpenProcess.restype = ctypes.c_void_p
        kernel.WaitForSingleObject.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
        kernel.CloseHandle.argtypes = [ctypes.c_void_p]
        with tempfile.TemporaryDirectory() as directory:
            marker = Path(directory) / 'child.pid'
            script = 'import subprocess,sys,time,pathlib; p=subprocess.Popen([sys.executable,"-c","import time; time.sleep(30)"]); pathlib.Path(sys.argv[1]).write_text(str(p.pid)); time.sleep(30)'
            owned = subprocess.Popen([sys.executable, '-c', script, str(marker)])
            handle = None
            try:
                deadline = time.monotonic() + 10
                while not marker.exists() and time.monotonic() < deadline:
                    time.sleep(0.05)
                self.assertTrue(marker.exists())
                pid = int(marker.read_text())
                handle = kernel.OpenProcess(0x100000, False, pid)
                self.assertTrue(handle)
                self.assertEqual(kernel.WaitForSingleObject(handle, 0), 258)
                self.launcher.stop_children([owned])
                self.assertEqual(kernel.WaitForSingleObject(handle, 2000), 0, 'Owned descendant survived launcher cleanup')
            finally:
                if handle:
                    if kernel.WaitForSingleObject(handle, 0) == 258:
                        os.kill(pid, 15)
                    kernel.CloseHandle(handle)
                if owned.poll() is None:
                    owned.terminate()
                owned.wait(timeout=5)


if __name__ == '__main__':
    unittest.main()
