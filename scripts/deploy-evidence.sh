#!/usr/bin/env bash
set -euo pipefail
cd /home/arcreation/deployments/claps
release="$PWD/releases/20261020-evidence-v1"
test -f backup/pre-evidence-v1-20261020/manifest.json
docker load -i "$release/images.tar"
mkdir -p "$release/source"
tar -xzf "$release/source.tar.gz" -C "$release/source"
test -f "$release/previous-compose.yaml" || cp compose.yaml "$release/previous-compose.yaml"
cp "$release/source/deploy/remote/compose.evidence.yaml" compose.yaml
docker compose stop worker
trap 'docker compose up -d --no-deps --wait web worker' EXIT
docker compose up -d --no-deps --wait web
docker compose run --rm --no-deps -T --name claps-evidence-seed -v "$release/seed-evidence.ts:/app/scripts/seed-evidence.ts:ro" -e EVIDENCE_TARGET_CONFIRM=https://claps.arcreation.work worker node --conditions=react-server --import tsx scripts/seed-evidence.ts
docker compose up -d --no-deps --wait worker
docker compose ps
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At' > "$release/existing-admin-after.digest" <<'SQL'
SELECT md5(row(u.id,u.email,u.app_role,u.status,a.password)::text) FROM users u LEFT JOIN auth_accounts a ON a.user_id=u.id WHERE u.email='admin@claps.arcreation.work' ORDER BY u.id;
SQL
cmp backup/evidence-baseline/existing-users.digest "$release/existing-admin-after.digest"
echo 'Existing administrator credentials, role and status preserved.'
