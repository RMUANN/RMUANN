import argparse
import json
import os
from pathlib import Path
import socket
import signal
import subprocess
import sys
import time

from tools.download_models import ASSETS

ROOT = Path(__file__).resolve().parent
DEFAULTS = dict(host='127.0.0.1', port=8000, device='cuda', model_root='backend', data_dir='data', max_data_bytes=10737418240)


def build_environment(root, config, overrides):
    values = DEFAULTS.copy()
    base = root
    if config is not None:
        config = Path(config).resolve()
        supplied = json.loads(config.read_text(encoding='utf-8'))
        if not isinstance(supplied, dict):
            raise ValueError('Config must be a JSON object')
        unknown = set(supplied) - set(DEFAULTS)
        if unknown:
            raise ValueError(f'Unknown config keys: {sorted(unknown)}')
        values.update(supplied)
        base = config.parent
    values.update({key: value for key, value in overrides.items() if value is not None})
    if type(values['port']) is not int or not 1 <= values['port'] <= 65535:
        raise ValueError('Port must be an integer between 1 and 65535')
    if values['device'] != 'cuda':
        raise ValueError('This release requires device=cuda and an NVIDIA GPU')
    if type(values['max_data_bytes']) is not int or values['max_data_bytes'] <= 0:
        raise ValueError('max_data_bytes must be a positive integer')
    for name in ('host', 'model_root', 'data_dir'):
        if not isinstance(values[name], str) or not values[name].strip():
            raise ValueError(f'{name} must be a non-empty string')
    models = (base / values['model_root']).resolve()
    data = (base / values['data_dir']).resolve()
    env = os.environ.copy()
    env.update(COMOTION_HOST=values['host'], COMOTION_PORT=str(values['port']),
               COMOTION_DEVICE=values['device'], COMOTION_MODEL_ROOT=str(models),
               COMOTION_DB_PATH=str(data / 'comotion.sqlite3'), COMOTION_MEDIA_ROOT=str(data / 'media'),
               COMOTION_SESSION_ROOT=str(data / 'sessions'), COMOTION_WEB_DIR=str(root / 'web'),
               COMOTION_MAX_DATA_BYTES=str(values['max_data_bytes']), PYTHONUNBUFFERED='1')
    return env


def check_assets(model_root):
    missing = [relative for _, relative, _ in ASSETS if not (Path(model_root) / relative).is_file()]
    if missing:
        raise ValueError('Missing model files: ' + ', '.join(missing) + '. Run python tools/download_models.py first.')


def check_port(host, port):
    with socket.socket() as probe:
        probe.bind((host, port))


def check_runtime():
    script = '''
import importlib
for name in ('torch', 'fastapi', 'uvicorn', 'numpy', 'matplotlib', 'sklearn', 'imageio', 'imageio_ffmpeg', 'clip'):
    importlib.import_module(name)
import torch
if not torch.cuda.is_available():
    raise SystemExit('CUDA is unavailable. Install the NVIDIA driver and the CUDA PyTorch build from README.md.')
'''
    result = subprocess.run([sys.executable, '-c', script], capture_output=True, text=True)
    if result.returncode:
        raise ValueError(result.stderr.strip() or 'Runtime check failed')


def stop_children(children):
    for child in children:
        if child.poll() is None:
            if os.name == 'nt':
                subprocess.run(['taskkill', '/PID', str(child.pid), '/T', '/F'],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                try:
                    if os.getpgid(child.pid) == child.pid:
                        os.killpg(child.pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
            if child.poll() is None:
                child.terminate()
    for child in children:
        try:
            child.wait(timeout=8)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait(timeout=5)


def request_shutdown(signum, frame):
    raise KeyboardInterrupt


def main():
    parser = argparse.ArgumentParser(description='Start the CoMotion web interface and GPU worker.')
    parser.add_argument('--config', type=Path)
    parser.add_argument('--host')
    parser.add_argument('--port', type=int)
    parser.add_argument('--model-root')
    parser.add_argument('--data-dir')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    children = []
    try:
        signal.signal(signal.SIGTERM, request_shutdown)
        if hasattr(signal, 'SIGBREAK'):
            signal.signal(signal.SIGBREAK, request_shutdown)
        overrides = {name: getattr(args, name) for name in ('host', 'port', 'model_root', 'data_dir')}
        env = build_environment(ROOT, args.config, overrides)
        check_assets(env['COMOTION_MODEL_ROOT'])
        check_port(env['COMOTION_HOST'], int(env['COMOTION_PORT']))
        check_runtime()
        if args.check:
            print('Configuration, required files, CUDA and imports are available.')
            return 0
        flags = {'creationflags': subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == 'nt' else {'start_new_session': True}
        for module in ('comotion.worker', 'comotion.api'):
            children.append(subprocess.Popen([sys.executable, '-m', module], cwd=ROOT / 'backend', env=env, **flags))
        print(f"CoMotion: http://{env['COMOTION_HOST']}:{env['COMOTION_PORT']}/", flush=True)
        print('Wait for model loading, then click Analyze. Press Ctrl+C to stop.', flush=True)
        while all(child.poll() is None for child in children):
            time.sleep(0.5)
        return next((child.returncode for child in children if child.returncode not in (None, 0)), 1)
    except KeyboardInterrupt:
        return 0
    except (OSError, ValueError, ImportError) as exc:
        print(f'Cannot start CoMotion: {exc}', file=sys.stderr)
        return 1
    finally:
        stop_children(children)


if __name__ == '__main__':
    sys.exit(main())
