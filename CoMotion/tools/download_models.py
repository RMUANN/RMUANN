import argparse
import hashlib
import re
from pathlib import Path
import tempfile
import urllib.request
import urllib.parse
import uuid

ROOT = Path(__file__).resolve().parents[1]
REVISION = 'e311a992ac49d0123aafc019b24150ed763b83a0'
BASE_URL = f'https://huggingface.co/vumichien/T2M-GPT/resolve/{REVISION}'
ASSETS = [
    ('VQVAE/net_last.pth', 'pretrained/VQVAE/net_last.pth', '656c69d6741377e476d77cc213a9570578fab1b064b3c77ec3f4df15a1bad62a'),
    ('VQTransformer_corruption05/net_best_fid.pth', 'pretrained/VQTransformer_corruption05/net_best_fid.pth', '297716615cedec3bbbcd7697938fdcede99b1ca72fdf689d415d1e77af4cf9b7'),
    ('meta/mean.npy', 'checkpoints/t2m/VQVAEV3_CB1024_CMT_H1024_NRES3/meta/mean.npy', '0bdb5ba69a3a9e34d71990db15bc535ebc024c8d95ddb5574196f96058faa7d3'),
    ('meta/std.npy', 'checkpoints/t2m/VQVAEV3_CB1024_CMT_H1024_NRES3/meta/std.npy', '6a5f7d60301c9465972fc225f8ad0ee8f957e7720431189123eb6d15873a9557'),
]


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def download_file(url, target, expected_sha256):
    target = Path(target)
    if target.exists():
        if sha256(target) != expected_sha256:
            raise ValueError(f'SHA256 mismatch in existing file: {target}. Move it aside before retrying.')
        print(f'Found {target.name}')
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=target.parent, prefix=target.name + '.', suffix='.part', delete=False) as output:
            temporary = Path(output.name)
            expected_size = None
            for attempt in range(128):
                offset = output.tell()
                parsed = urllib.parse.urlsplit(url)
                request_url = url
                headers = {'User-Agent': 'CoMotion', 'Cache-Control': 'no-cache'}
                if parsed.scheme in ('http', 'https'):
                    query = urllib.parse.parse_qsl(parsed.query)
                    query.append(('comotion_download', uuid.uuid4().hex))
                    request_url = urllib.parse.urlunsplit(parsed._replace(query=urllib.parse.urlencode(query)))
                    headers['Range'] = f'bytes={offset}-{offset + 33554431}'
                if offset:
                    print(f'Resuming {target.name} at {offset} bytes', flush=True)
                request = urllib.request.Request(request_url, headers=headers)
                with urllib.request.urlopen(request, timeout=60) as response:
                    if getattr(response, 'status', None) == 206:
                        match = re.fullmatch(r'bytes (\d+)-(\d+)/(\d+)', response.headers.get('Content-Range', ''))
                        if not match or int(match[1]) != offset or (expected_size is not None and int(match[3]) != expected_size):
                            raise ValueError('Invalid download Content-Range')
                        expected_size = int(match[3])
                    elif offset:
                        raise ValueError('Server did not honor the download resume range')
                    elif response.headers.get('Content-Length'):
                        expected_size = int(response.headers['Content-Length'])
                    while True:
                        try:
                            chunk = response.read(65536)
                        except (TimeoutError, ConnectionError):
                            if expected_size is None:
                                raise
                            break
                        if not chunk:
                            break
                        output.write(chunk)
                if expected_size is None or output.tell() == expected_size:
                    break
                if output.tell() <= offset or output.tell() > expected_size:
                    raise ValueError('Download ended at an invalid byte offset')
            else:
                raise ValueError('Download interrupted too many times; retry when the connection is stable')
        if sha256(temporary) != expected_sha256:
            raise ValueError(f'SHA256 mismatch for {target.name}')
        if target.exists():
            raise FileExistsError(f'Destination appeared during download: {target}')
        temporary.rename(target)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def main():
    parser = argparse.ArgumentParser(description='Download the pretrained motion models and normalization statistics.')
    parser.add_argument('--model-root', type=Path, default=ROOT / 'backend')
    parser.add_argument('--statistics-only', action='store_true')
    args = parser.parse_args()
    for remote, local, checksum in ASSETS:
        if args.statistics_only and not remote.startswith('meta/'):
            continue
        print(f'Downloading {remote}', flush=True)
        download_file(f'{BASE_URL}/{remote}?download=true', args.model_root / local, checksum)
    print('Model resources verified.')


if __name__ == '__main__':
    main()
