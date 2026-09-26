# Database foundation

`schema.ts` is the Drizzle source of truth. Generate changes with `corepack pnpm db:generate` and commit the SQL plus `migrations/meta/` snapshots together. Apply migrations only through `corepack pnpm db:migrate`; web and worker never run migrations themselves. The runner uses a dedicated PostgreSQL advisory lock to serialize concurrent migration processes.

The initial migration contains fourteen application tables. It creates tables first and adds foreign keys afterwards, including the projects ↔ brand_guides cycle. IDs are application-generated opaque text; timestamps use timestamptz. Foreign keys use NO ACTION, with no automatic cascading deletion. The `authSchema` export maps Better Auth's four core models to users and the three auth tables. Core fields are compared against installed Better Auth 1.7.5 in a unit test. Authentication routes, lifecycle hooks and policy remain Phase 3 work.

`corepack pnpm db:seed` only inserts absent ko/en locale rows. Both start disabled; en falls back to ko. It does not change existing names, enabled flags, revisions, users, roles or published content. Phase 2 must verify file packs before enabling languages. Synthetic development data is confined to tests, never included in the operational seed.

JSONB columns enforce an object with numeric schemaVersion=1 and a 64 KiB metadata limit. Before service writes, use `parseMetadata` with the strict schemas in `lib/contracts/metadata.ts`; SQL envelope checks do not replace field validation. The current job output schemas are bounded references, not raw provider payloads. Provider-specific fields/limits and business rules must be reviewed in the owning Phase before those APIs are exposed. Authorization, JSON reference ownership, full locale fallback cycle checks and state transitions require service transactions and are not implied by the initial schema.

Tests require an explicit TEST_DATABASE_URL naming a separate claps_test database. They migrate the real PostgreSQL instance and roll back synthetic data. Never point tests at a development or production database. For local isolated PostgreSQL:

```bash
corepack pnpm test:db:up
TEST_DATABASE_URL=postgresql://claps_test:claps_test_local_only@127.0.0.1:55433/claps_test corepack pnpm test:integration
corepack pnpm test:db:stop
```

Do not delete data volumes to recover a real environment. Stop web/worker and prefer a reviewed forward migration plus a compatible image. Production backup/restore policy is D-04 / Phase 11 work.

## Phase 4 additions

Migration 0002 adds storage_tickets, bringing application tables to 16 (14 foundation + auth_rate_limits + storage_tickets). This ledger records temporary upload/download capabilities, expiry, claim state and cleanup reservations. Capability IDs are token digests. Reservation metadata has server-generated planned storage keys; ready uploads contain validated fileSchema metadata. Connected files remain in the owning projects/assets JSONB columns. No permanent files catalog or cascade deletion was added.

Workspace service writes retain strict metadata parsing, ownership and optimistic version checks under the authenticated account transaction. The operational seed remains locale-only. Synthetic asset/job/file fixture creation is restricted to isolated tests. Never delete old jobs or files merely because a queue capability has expired.

Phase 5 adds `0003_medical_tenebrous.sql`: jobs lease fencing/heartbeat/deadline, provider dispatch boundary, cost state and a unique retry child, plus the storage_tickets job target. Apply this additive migration before starting new web/worker code. Job terminal attempts and references are retained; no queue age-based deletion or physical-file deletion is enabled. Failed/unknown provider jobs must not be reset to queued.

Phase 6: `0004`는 세션 추가 인증 만료 및 번역 게시 revision/version을 추가하고 기존 게시본을 backfill한다. `0005`는 storage_tickets의 partner 이미지 target을 허용한다. 16개 테이블을 유지한다. 기존 이미지로 되돌릴 때도 신규 컬럼·감사·파일 이력을 보존하고 파괴적 down migration을 실행하지 않는다.

## 가상 샘플 시드 (2026-09-25)

일반 `db:seed`는 계속 locale만 생성한다. 별도 `db:seed:demo`는 이름이 `claps_demo` 또는 `claps_test[_suffix]`인 DB에서만 동작하며, `DEMO_EMAIL`·`DEMO_PASSWORD`로 기존 활성 계정에 로그인한다. 사용자 생성·관리자 권한 부여는 하지 않는다.

전역 가상 파트너 6개와 ko/en 게시 소개 12개, 계정별 프로젝트 3개·세션 3개·모니터링 원본 2개·초기 추천 기준을 추가한다. 실제 업체/연락처/AI 결과는 포함하지 않는다. 안정된 ID와 advisory lock으로 재실행·동시 실행 중복을 막고, 기존 편집·보관·게시·선호를 보존한다. 기본 seed와 데모 seed는 서로 독립적이다.

**파일도 생성하므로 web과 같은 UPLOADS_DIR/볼륨을 사용해야 한다.** 기존 Compose에서는 업로드 볼륨이 없는 migrate 대신 **worker** 서비스로 실행한다. CLI는 환경 변수를 읽으며 비밀번호를 인수로 받지 않는다. 로컬 실행 예시는 [scripts/README.md](../scripts/README.md)의 샘플 체험 절을 참고한다.
