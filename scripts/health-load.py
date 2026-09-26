#!/usr/bin/env python3
"""Small local readiness load probe; measurements are not an approved capacity SLA."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import math
import time
from urllib.parse import urlparse
from urllib.request import urlopen

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--origin', default='http://127.0.0.1:3000')
args = parser.parse_args()
parsed = urlparse(args.origin)
if parsed.scheme != 'http' or parsed.hostname not in ('127.0.0.1', 'localhost') or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ('', '/'):
    parser.error('Only a local HTTP origin is allowed')

def probe(_):
    start = time.monotonic()
    with urlopen(args.origin.rstrip('/') + '/api/health', timeout=10) as response:
        if response.status != 200 or json.load(response) != {'data': {'status': 'ok'}}:
            raise RuntimeError('Readiness failed')
    return (time.monotonic() - start) * 1000

started = time.monotonic()
with ThreadPoolExecutor(max_workers=5) as executor:
    elapsed = sorted(executor.map(probe, range(100)))
seconds = time.monotonic() - started
print(json.dumps({'requests': 100, 'concurrency': 5, 'errors': 0, 'seconds': round(seconds, 3), 'requestsPerSecond': round(100 / seconds, 2), 'p50Ms': round(elapsed[math.ceil(.5 * len(elapsed))-1], 2), 'p95Ms': round(elapsed[math.ceil(.95 * len(elapsed))-1], 2), 'maxMs': round(max(elapsed), 2)}))
