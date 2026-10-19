set -eu
cd /home/arcreation/deployments/claps
umask 077
mkdir -p backup/evidence-baseline
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At' > backup/evidence-baseline/existing-users.digest <<'SQL'
SELECT md5(row(u.id,u.email,u.app_role,u.status,a.password)::text) FROM users u LEFT JOIN auth_accounts a ON a.user_id=u.id ORDER BY u.id;
SQL
docker compose stop web worker
python3 releases/20261020-i18n/backup-restore.py backup --project claps-prod --env-file .env --compose-file compose.yaml --directory backup/pre-evidence-v1-20261020 </dev/null
docker compose up -d --no-deps --wait web worker
cat backup/pre-evidence-v1-20261020/manifest.json
