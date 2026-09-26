#!/usr/bin/env python3
"""Offline Compose backup / empty-target restore. Python stdlib + Docker only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time


def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['backup', 'restore'])
    parser.add_argument('--project', required=True)
    parser.add_argument('--env-file', required=True)
    parser.add_argument('--compose-file', default='compose.yaml')
    parser.add_argument('--directory', required=True)
    args = parser.parse_args()
    os.umask(0o077)
    base = ['docker', 'compose', '-p', args.project, '--env-file', args.env_file, '-f', args.compose_file]
    def compose(*cmd, **kwargs):
        return run(base + list(cmd), **kwargs)
    def sql(query):
        return compose('exec', '-T', 'db', 'sh', '-c', 'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "$1"', 'sh', query, capture_output=True, text=True).stdout.strip()
    # Fail closed; never stop or overwrite another project's runtime implicitly.
    active = compose('ps', '--status', 'running', '--services', capture_output=True, text=True).stdout.split()
    if 'web' in active or 'worker' in active or 'migrate' in active:
        raise RuntimeError('Stop web, worker and migration writers before this operation')
    if 'db' not in active:
        raise RuntimeError('Start the target database first')
    directory = Path(args.directory).resolve()
    started = time.monotonic()
    if args.action == 'backup':
        directory.mkdir(mode=0o700, parents=True, exist_ok=False)
        with (directory / 'database.dump').open('xb') as output:
            compose('exec', '-T', 'db', 'sh', '-c', 'exec pg_dump -Fc --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"', stdout=output)
        with (directory / 'uploads.tar').open('xb') as output:
            compose('run', '--rm', '--no-deps', '-T', '--entrypoint', 'tar', 'worker', '-C', '/app/uploads', '-cf', '-', '.', stdout=output)
        images = {}
        for service in ['web', 'worker', 'db']:
            ids = compose('ps', '-a', '-q', service, capture_output=True, text=True).stdout.split()
            images[service] = [run(['docker', 'inspect', '--format', '{{.Image}}', cid], capture_output=True, text=True).stdout.strip() for cid in ids]
        manifest = {'format': 1, 'project': args.project, 'createdAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'images': images, 'sha256': {name: digest(directory / name) for name in ['database.dump', 'uploads.tar']}}
        (directory / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    else:
        manifest = json.loads((directory / 'manifest.json').read_text())
        if manifest.get('format') != 1:
            raise RuntimeError('Unsupported backup format')
        for name in ['database.dump', 'uploads.tar']:
            if digest(directory / name) != manifest['sha256'][name]:
                raise RuntimeError('Backup checksum mismatch')
        # Includes drizzle migration schema; even a migrated empty app is not an empty target.
        if sql("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r','p','S','v','m','f')") != '0':
            raise RuntimeError('Restore requires an empty database; existing data is never replaced')
        compose('run', '--rm', '--no-deps', '-T', '--entrypoint', 'sh', 'worker', '-c', 'test -z "$(find /app/uploads -mindepth 1 -print -quit)"')
        # Validate our archive before extraction; backups may contain sensitive files.
        import tarfile
        with tarfile.open(directory / 'uploads.tar') as archive:
            for member in archive:
                p = Path(member.name)
                if p.is_absolute() or '..' in p.parts or not (member.isfile() or member.isdir()):
                    raise RuntimeError('Unsafe backup archive member')
        with (directory / 'database.dump').open('rb') as source:
            compose('exec', '-T', 'db', 'sh', '-c', 'exec pg_restore --exit-on-error --single-transaction --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"', stdin=source)
        with (directory / 'uploads.tar').open('rb') as source:
            compose('run', '--rm', '--no-deps', '-T', '--entrypoint', 'tar', 'worker', '-C', '/app/uploads', '--no-same-owner', '-xf', '-', stdin=source)
    print(json.dumps({'action': args.action, 'seconds': round(time.monotonic() - started, 3), 'status': 'ok'}))
    # Deliberately keep writers stopped for operator verification/recovery on failure.


if __name__ == '__main__':
    main()
