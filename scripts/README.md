# Local operations

Use Node 22.22.0 and `corepack pnpm` (packageManager pins 10.34.5). A pre-existing pnpm 9 binary is intentionally rejected by engines; global package managers need not be changed.

```bash
corepack pnpm install --frozen-lockfile
cp .env.example .env
# Generate a local password with openssl rand -hex 24.
# Replace BOTH password placeholders in .env; do not commit .env.
docker compose build
docker compose up -d --wait db
docker compose run --rm migrate
docker compose up -d --wait web worker
docker compose ps
```

Compose web binds 127.0.0.1:3000, configurable with WEB_PORT. The database has no host port. `DATABASE_URL` in .env uses the internal `db` hostname. To use a host-run Next process with a separate local database, supply an appropriate DATABASE_URL explicitly; do not reuse the test DB for development.

`GET /api/health` returns `{ data: { status: "ok" } }` after checking the DB schema, or a safe 503 error envelope. Responses have `Cache-Control: private, no-store` and a server-generated `X-Request-ID`. `X-Claps-Locale: en` selects English error messages, otherwise Korean is used. Full UI locale selection belongs to Phase 2. DB URLs and pool configuration are read at runtime, not during builds.

The worker writes a heartbeat only after a successful DB check, removes it on failure/shutdown, and responds to SIGTERM/SIGINT. `corepack pnpm worker:health` rejects missing or stale heartbeats. No queue work is acquired in Phase 1. web and worker run as uid 1000 and share the uploads-data named volume. The migration service must succeed before either starts. Repeated seed/migration runs preserve records.

Verification:

```bash
corepack pnpm lint
corepack pnpm typecheck       # next typegen, then tsc --noEmit (needed on a fresh checkout)
corepack pnpm build
corepack pnpm test:unit
corepack pnpm test:i18n
corepack pnpm test:db:up
# .env.example contains the local-only test DB connection. Export it, or put it in .env.
TEST_DATABASE_URL=postgresql://claps_test:claps_test_local_only@127.0.0.1:55433/claps_test corepack pnpm test:integration
corepack pnpm exec playwright install chromium
E2E_BASE_URL=http://127.0.0.1:3000 corepack pnpm test:e2e
```

The E2E runner expects the production web container to be running and healthy. Test runners fail on no tests; mandatory suites are not skipped when environment variables are missing. `compose.test.yaml` has a dedicated volume and loopback-only port 55433. Its password is public synthetic test configuration, never an operational secret. Containers may be stopped with `docker compose stop` / `corepack pnpm test:db:stop` while preserving volumes.

The Docker `test` target can run lint, typecheck and unit/i18n tests under Linux when host filesystem access is slow. It does not include browsers. Both package installs use the same frozen lockfile.

Phase 3 exposes authenticated account APIs. Business CRUD still uses browser stores until its owning Phase. External services, actual deployment/TLS and off-host backup/restore are not provided by these local smoke checks.

## 초기 언어 활성화 (Phase 2)

`pnpm test:i18n` → `pnpm db:migrate` → `pnpm db:seed` → `pnpm i18n:activate` 순서입니다. 기존 version=1 비활성 ko/en seed만 활성화하며 활성화 후 version=2가 됩니다. 운영자 수정 version은 보존합니다. 기본 ko가 비활성인 운영 설정에서는 자동으로 덮어쓰지 않고 명령이 실패합니다. 관리자 언어 관리 및 감사는 Phase 6에서 연결합니다. D-10 번역 검수 전에는 공개 배포하지 않습니다.

Docker의 tools 기반 이미지에는 같은 messages 파일과 `scripts/activate-locales.ts`가 포함됩니다. 초기 bootstrap 명령과 일반 seed 재실행을 분리했습니다. 테스트용 fixture 활성화를 운영 배포 검수로 간주하지 않습니다.


## 서버 인증과 개발용 메일 (Phase 3)

`APP_ORIGIN`을 브라우저 origin과 정확히 맞추고 migration/seed/i18n:activate를 먼저 실행합니다. 비밀번호는 8~128자입니다. 이메일을 입력하면 가입 여부에 따라 비밀번호 가입/로그인으로 분기합니다. 가입 후 이메일 확인 전에는 앱에 접근할 수 없습니다.

- `MAIL_ADAPTER=sandbox`, `MAIL_SANDBOX_DIR=/tmp/claps-mail`을 **개발 환경에서만** 명시합니다. 설정이 없으면 실제 메일을 보내는 척하지 않고 가입/발송을 거절합니다.
- 메일은 해당 디렉터리의 0600 JSON에 ko/en 제목·본문·수신자·링크로 저장됩니다. `public`, `.next`, `app` 아래에 두면 거절됩니다. 운영 메일 공급자 구현이 아닙니다. 로컬 파일에서 링크를 열어 확인/복구를 진행하세요. 메일 토큰을 Git·공개 artifact·로그에 복사하지 마세요.
- Docker 기본 `/tmp/claps-mail`은 컨테이너 안에 있습니다. 브라우저 테스트에서는 별도 host 0700 디렉터리를 이 경로에 bind mount하고 `E2E_MAIL_DIR`을 host 경로로 설정합니다. 테스트 종료 후 합성 메일 파일을 제거하세요.
- IP 제한은 명시적 신뢰 프록시 설정 전 공통 unknown bucket입니다. `AUTH_TRUSTED_IP_HEADER`는 프록시가 항상 덮어쓰는 헤더만 지정합니다. 기본값은 임의 X-Forwarded-For를 신뢰하지 않습니다. endpoint별 IP 100회/15분, 이메일 lookup/login 10회·가입/메일 5회/15분, 토큰/비밀번호 변경 10회/15분입니다.
- 운영 TLS에서는 세션/언어 쿠키에 Secure가 적용됩니다. 세션은 HttpOnly/SameSite=Lax, 7일 고정 수명이며 자동 연장은 없습니다. 변경/복구는 모든 기존 세션을 폐기하고 재로그인을 요구합니다.

관리자는 공개 가입으로 생성되지 않습니다. **이메일 확인·프로필 완료된 계정**에만 아래 명시적 명령을 실행합니다. 승격과 정지는 DB 감사 기록을 남기고 기존 세션/복구 토큰을 폐기합니다.

```bash
corepack pnpm account promote admin@example.test
corepack pnpm account suspend member@example.test
# Compose DB 접근이 필요한 경우:
docker compose run --rm migrate pnpm account promote admin@example.test
```

위 주소는 예시이며 실제 관리자 계정을 seed하지 않습니다. 공개 관리자 API는 admin 역할이어도 계속 거절됩니다. 추가 인증 정책과 UI는 운영 공개 전 별도 구현해야 합니다. 소셜은 비활성 상태이며 이메일 일치로 자동 병합하지 않습니다.

인증 API는 `/api/auth/{lookup,sign-up,sign-in,resend-verification,verify-email,forgot-password,reset-password,change-password,sign-out}` POST입니다. `/api/me` GET/PATCH/DELETE, `/api/me/preferences` PATCH를 제공합니다. 모든 변경 요청은 same-origin JSON, strict DTO 검증을 통과해야 합니다. `/api/locale`도 로그인 상태이면 DB 선호를 먼저 저장하고 성공 후 언어 쿠키를 변경합니다.

탈퇴는 즉시 withdrawal_pending 및 세션/토큰 폐기로 처리합니다. 데이터 영구 삭제·파일 정리·백업/감사 익명화는 보존 정책 확정 전 수행하지 않습니다. 업무 데이터 소유권·계정 상태 검증과 후속 정리 계약을 Phase 4~5에 전달합니다.

전체 E2E는 **별도 claps_test DB를 사용하는 web**과 sandbox bind mount가 필요합니다:

```bash
E2E_BASE_URL=http://127.0.0.1:3103 \
E2E_MAIL_DIR=/tmp/claps-phase3-mail \
TEST_DATABASE_URL=postgresql://claps_test:claps_test_local_only@127.0.0.1:55433/claps_test \
corepack pnpm test:e2e
```

테스트 helper는 p3-e2e- 접두사의 합성 계정만 정리합니다. 기존 i18n suite도 서버 인증 fixture로 앱에 접근합니다. 실제 운영 DB나 실제 수신자는 사용하지 않습니다.

## Phase 4 workspace and storage

Apply migrations before starting the new web image: `corepack pnpm db:migrate` adds storage_tickets. Set `UPLOADS_DIR` to a private absolute path on persistent storage (Compose supplies `/app/uploads` to both web and worker). Keep its owner writable by the container node user. Never place it under public or expose it with a static web server.

Cover upload limits are PNG/JPEG/WebP, 10MiB binary request body, 40 million decoded pixels, one frame. Configure any ingress body limit to 10MiB too. Upload tickets expire after 15 minutes and download tickets after 5 minutes. PUT consumes an upload reservation once; attach its successful result with the current project version. A failed/stale attach requires reloading the project and obtaining a fresh ticket. Failed requests never change the current cover.

The `storage_tickets` ledger tracks reserved paths before IO, failed/unclaimed uploads and replaced files. Phase 4 never removes physical files. Phase 5 must handle expired capabilities and cleanup scheduling; permanent deletion still requires an approved retention policy and a fresh reference/lifecycle check. Back up the PostgreSQL and uploads volumes at a consistent point. Do not run volume removal or migrate browser localStorage into an account.

Workspace tests: `corepack pnpm exec vitest run --project integration tests/integration/workspace.test.ts` and `corepack pnpm exec playwright test tests/e2e/workspace.spec.ts`. Use the isolated test DB, E2E_BASE_URL and sandbox E2E_MAIL_DIR. E2E synthetic assets are created only by test helpers with direct access to the isolated claps_test DB; no public asset creation endpoint is exposed.

## Phase 5 jobs and worker

Apply `0003_medical_tenebrous.sql` with `pnpm db:migrate` before deploying web or worker. The worker now recovers expired leases, consumes registered job handlers and performs bounded storage maintenance. The production registry intentionally contains no AI handlers until their owning Phase; never import test helpers there. `docker compose up -d --scale worker=2 worker` can run two consumers; the per-owner concurrency limit is enforced in PostgreSQL across processes.

The process heartbeat checks the migrated jobs schema independently of a long-running handler. SIGTERM/SIGINT stops acquisition, aborts the current handler and settles it safely; a hard kill is recovered after lease expiry. The lease token fences stale completion. A dispatched request with an unknown response remains failed/PROVIDER_UNKNOWN and needs provider/operator review, not blind retry. No exactly-once external billing guarantee is claimed.

The approved development policy lives in `lib/server/jobs/policy.ts`: 2 running, 10 queued, 60 newly created attempts/hour/owner; 5-minute timeout; at most 2 safe retries, with exponential delay starting at 5 seconds. A retry creates a linked new row and counts against admission limits. If admission is full, the failed attempt remains available for later safe retry. Actual provider budgets must be configured/reviewed in Phases 7–10.

Storage maintenance only deletes expired download tokens and marks expired uploads for cleanup. It never deletes physical files, job evidence or audit history. Cleanup reservations include failed/late output files and ZIP references; retain the shared uploads volume and review its size until a retention policy is approved.

Targeted checks: `pnpm exec vitest run --project unit tests/unit/jobs.test.ts`, `pnpm exec vitest run --project integration tests/integration/jobs.test.ts`, and `pnpm exec playwright test tests/e2e/jobs.spec.ts`. Integration launches test-only child workers and sends SIGKILL/SIGTERM using the isolated TEST_DATABASE_URL. The production worker never exposes a test adapter environment switch.

## Phase 6 관리자 개발 실행

migration/seed/locale 활성화 후 검증된 active 계정을 기존 `account` CLI로 명시적으로 관리자 지정하고 다시 로그인한다. `/admin`에서 현재 비밀번호를 재확인하면 해당 세션에 15분 접근을 허용한다. 재확인 시도 제한은 계정당 15분 5회다. 기본 운영 콘텐츠 seed나 관리자 자동 승격은 없다. 운영 공개/MFA·보존 정책은 별도 결정한다.

검증 suite: `tests/integration/admin.test.ts`, `tests/e2e/admin.spec.ts`, `tests/i18n/packs.test.ts`. 격리 `claps_test` DB와 sandbox 메일만 사용한다. 관리자 이미지 업로드도 ingress 최대 10MiB 설정이 필요하다.

## Phase 8 서버·ZIP (공급자 보류)

추가 migration이나 의존성 없이 배포 후 web/worker를 함께 재시작한다. 실제 `export` handler는 운영 registry에 등록되며 shared `UPLOADS_DIR`에서 처리한다. 검증 provider는 등록되지 않아 API가 503을 반환한다. 새 검증 공급자 등록 시 `verificationHandler` 계약과 테스트를 사용하고, fixture를 운영 handler로 등록하지 않는다.

ZIP은 동일 프로젝트 최종본 50개·100MiB(개별 10MiB) 이내의 무압축 ZIP32다. worker당 한 작업으로 처리하며 원본/ZIP buffer 때문에 작업당 약 200MiB 이상 여유 메모리를 권장한다. 다운로드는 24시간 이내, 매 요청 현재 소유권/부모/최종 version 확인, 발급 토큰 5분이다. 기존 취소/worker lease 복구·안전 retry를 재사용한다. 실패/만료 ZIP은 ledger에 남기고 물리 삭제하지 않으므로 uploads 사용량을 관찰한다.

- `TEST_DATABASE_URL=<isolated claps_test URL> corepack pnpm exec vitest run --project integration tests/integration/phase8.test.ts`
- `corepack pnpm exec vitest run --project unit tests/unit/phase8.test.ts`
- `E2E_BASE_URL=<isolated web> E2E_MAIL_DIR=<sandbox path> UPLOADS_DIR=<shared test uploads> TEST_DATABASE_URL=<isolated URL> corepack pnpm exec playwright test tests/e2e/phase8.spec.ts`

E2E는 direct DB synthetic 검증 근거와 실제 ZIP worker를 조합한다. 실공급자 품질 평가가 아니다. worker subprocess를 실행하므로 host의 느린 파일 시스템에서는 시작 지연을 구분하여 점검한다.

## Phase 9 규칙 추천

`0006_fluffy_overlord.sql`을 `pnpm db:migrate`로 적용한 뒤 web/worker를 함께 배포한다. 외부 API 키나 새 서비스는 필요하지 않다. 운영 공개 파트너는 관리자가 기존 `/admin/partners`에서 검수 등록한다. seed는 운영 파트너를 생성하지 않는다.

`matching`은 30초 timeout, 공개 master 최대 200개, 전체 snapshot 64KiB 이내, 결과 최대 20개다. 초과하면 전체 입력을 거절하며 후보를 임의로 잘라 추천하지 않는다. 업로드/과거 job의 파일은 접근과 ledger로 관리하고 물리 삭제하지 않는다.

검증: `pnpm exec vitest run --project unit tests/unit/phase9.test.ts`, 격리 TEST_DATABASE_URL로 `pnpm test:integration`, sandbox web/메일/파일 환경에서 `pnpm exec playwright test tests/e2e/phase9.spec.ts`. E2E helper는 실제 규칙 handler를 실행하고 공급자 mock을 등록하지 않는다. 합성 후보의 결정적 순위 검증은 실제 파트너 사업 품질의 승인과 구분한다.

## Phase 10 독립 모니터링

`0007_last_skreet.sql` 적용 후 web/worker를 갱신한다. 외부 API 키 없이 기록/원본/보관/복구를 사용한다. 실제 탐지는 503이며 provider 미연결 안내를 표시한다. 파일과 과거 실행은 물리 삭제하지 않는다.

검증: `pnpm exec vitest run --project unit tests/unit/phase10.test.ts`, 격리 TEST_DATABASE_URL에서 `pnpm test:integration`, 격리 production web + sandbox 메일에서 `pnpm exec playwright test tests/e2e/phase10.spec.ts`. E2E는 원본 생성·조회·보관·관리자 감사·언어를 검사한다. 검색 handler는 integration에서만 fixture를 명시 주입한다. 이 결과는 실제 검색 품질의 증거가 아니다.

## Phase 11 일관된 오프라인 백업과 빈 환경 복구

Python 3.11+와 Docker Compose를 사용한다. 실행 중인 web/worker/migrate가 있으면 도구가 거절한다. 먼저 ingress를 유지보수 상태로 전환하고 **모든 인스턴스·CLI·외부 DB writer**를 중지한다. 도구는 지정한 Compose 프로젝트만 확인하므로 다른 프로젝트/외부 연결까지 잠그지는 않는다. 정지 뒤 DB dump와 업로드 tar가 끝날 때까지 쓰기를 재개하지 않는다.

```bash
# 운영자가 선택한 프로젝트/환경 파일/신규 백업 디렉터리를 명시한다.
docker compose -p claps --env-file .env stop web worker
python3 scripts/backup-restore.py backup --project claps --env-file .env --directory /secure-backups/claps-YYYYMMDD-HHMM
# 성공한 manifest.json과 두 payload를 함께 별도 저장소로 복제/검증한 뒤 재시작한다.
docker compose -p claps --env-file .env up -d --wait web worker
```

백업 디렉터리는 새로 생성하며 0700, 파일은 0600이다. manifest에 생성 UTC, DB dump/파일 tar SHA-256, 기존 컨테이너의 실제 image ID를 기록한다. secret 값은 넣지 않는다. 로컬 백업은 외부 별도 보관을 대체하지 않는다. 저장소 암호화·접근 통제·복제·보존 주기·RPO/RTO는 운영 환경에 맞게 확정해야 한다. checksum은 우발 손상 검출이며 출처 인증이 아니므로 신뢰한 백업만 사용한다.

복구 환경은 **다른 Compose 프로젝트의 신규 DB와 신규 uploads 볼륨**으로 준비한다. 대상의 web/worker/migrate를 띄우지 않고 DB만 시작한다. 복구 전에 migration/seed를 실행하면 빈 DB 조건에 위배된다. 같은 버전의 worker 도구 이미지를 먼저 build/pull하고, 환경 파일의 DB 주소가 새 프로젝트 내부 db를 가리키는지 확인한다.

```bash
docker compose -p claps-recovery --env-file .env.recovery build worker web migrate
docker compose -p claps-recovery --env-file .env.recovery up -d --wait db
python3 scripts/backup-restore.py restore --project claps-recovery --env-file .env.recovery --directory /secure-backups/claps-YYYYMMDD-HHMM
# DB dump 자체에 migration 이력이 포함된다. 같은 버전의 migration/seed 재실행은 멱등성을 확인한다.
docker compose -p claps-recovery --env-file .env.recovery run --rm migrate
docker compose -p claps-recovery --env-file .env.recovery up -d --wait web worker
```

기존 사용자 테이블/sequence/view가 하나라도 있거나 파일 볼륨이 비어 있지 않으면 덮어쓰지 않는다. checksum·tar 경로/타입을 검사한 뒤 pg_restore를 단일 transaction으로 수행한다. DB 복구 후 파일 복구가 실패하면 writer를 정지한 채 원인을 조사하고 새 빈 대상에서 다시 복구한다. 실패 시 자동 재시작/volume 삭제는 하지 않는다. 복구 후 인증·프로젝트/원본 다운로드 checksum·게시 번역·worker health를 확인한 뒤 ingress를 연다.

이전 이미지 복원은 manifest의 image ID/registry digest를 이용해 **web과 worker를 함께** override한다. DB migration을 강제로 역적용하지 않는다. 먼저 새 스키마와 이전 이미지의 호환성, 이전 이미지에 없는 파일 언어팩의 fallback, 게시 번역/원본 보존을 격리 환경에서 검증한다. 호환성이 없으면 같은 시점의 DB+파일 백업을 별도 빈 환경에 복원한다.

제3 언어 확장 시험은 `node scripts/phase11-locale.mjs`로 테스트용 `messages/en-GB`를 생성한 뒤 web/tools 이미지를 빌드한다. 이 팩은 영어를 복사한 시험 자료이며 공개 번역이 아니다. 새 격리 DB에 migration/seed/i18n:activate를 실행한 web에서 `tests/e2e/phase11.spec.ts`를 실행한다. 테스트는 관리자 API로 등록/게시/활성화/비활성화를 검증하며 기본적으로 DB fixture를 정리한다. `PHASE11_KEEP_RECOVERY_FIXTURE=1`은 복구 실험용 합성 데이터를 남기고 `/tmp/claps-p11-{state,fixture}.json`을 생성하므로 격리 환경에서만 사용한다. 검증 후 생성 파일팩과 합성 세션 파일을 제거하고 공개 배포에는 기본 ko/en 이미지를 사용한다.

로컬 준비 상태 부하 측정: `python3 scripts/health-load.py --origin http://127.0.0.1:3000`. 5개 동시 연결로 `/api/health` 100회를 검사하고 지연/처리량을 출력한다. DB readiness 부하만 측정하며 생성/검색 공급자 처리량이나 운영 SLA를 대신하지 않는다. 운영 합격 기준은 별도 합의가 필요하다.

Docker test target은 ZIP 독립 reader 검증을 위해 Python3를 포함한다. web/worker에는 추가하지 않는다. 전체 E2E에서 실제 worker를 띄웠다면 `E2E_EXTERNAL_WORKER=1`로 ZIP/매칭 helper와 작업 획득이 경쟁하지 않게 한다.

합성 복구 fixture를 남긴 경우 `CHECK_ORIGIN=http://127.0.0.1:3192 node scripts/phase11-recovery-check.mjs`로 복구한 세션/선호·파트너 게시 번역·원본 바이트·SSR 언어를 비교한다. 기본 예상 SSR 언어는 en-GB이며 en-GB 파일팩 없는 이전 이미지에서는 `EXPECT_LOCALE=en EXPECT_CONTENT_NAME="P11 original"`을 지정한다. 파일팩이 없는 en-GB는 선택 불가하므로 DB 콘텐츠도 원문으로 fallback하고, 게시 번역 행 자체의 보존은 DB checksum으로 별도 확인한다. 두 환경의 앱 origin은 각 web 포트에 맞춰 설정한다. DB에 저장된 en-GB 선호/번역은 이전 파일팩으로 돌아가도 삭제하지 않는다.

### 전체 E2E의 Phase 11 시험 팩 준비

`test:e2e`에는 필수 제3locale 검사가 포함되므로 기본 ko/en 운영 이미지에 바로 실행하면 해당 검사가 실패한다. **격리 테스트 이미지를 빌드하기 전에** 다음과 같이 준비한다. 시험 종료 후 생성한 en-GB 디렉터리를 제거하고 운영용 이미지는 다시 빌드한다. 기존 en-GB 디렉터리가 있으면 생성기는 덮어쓰지 않고 실패한다.

```bash
node scripts/phase11-locale.mjs
docker build --target web -t claps-phase11-web .
docker build --target worker -t claps-phase11-worker .
docker build --target migrate -t claps-phase11-migrate .
# 검증 snapshot의 Compose와 environment.example은 격리 시험 전용이다.
# 새로운 project 이름/DB host port/web port를 선택하고 sandbox 디렉터리를 uid1000에 준비한다.
# migrate → seed → i18n:activate → web/worker health 후 전체 E2E 실행.
```

정확한 실행 구성과 결과는 `md/evidence/phase11/compose.yaml`, `environment.example`, `md/phase11-test-checklist.md`에 있다. 이전 이미지 복구 시험은 해당 이미지 ID가 로컬 또는 신뢰한 registry에 보존되어 있어야 재현할 수 있다.

## 가상 샘플 체험·검수 (2026-09-25)

이번 검수용 로컬 체험 서버는 `http://127.0.0.1:3193`, Compose 프로젝트는 `claps-content`다. 접속 계정의 이메일·비밀번호는 Git에서 제외한 `.env.seed.local`의 `DEMO_EMAIL`, `DEMO_PASSWORD`에 있다. `.env.seed.local`은 Linux 홈의 비공개 파일을 가리키며 대상 파일 권한은 0600이다. `scripts/demo-preview-bootstrap.mjs`는 이 로컬 전용 환경 파일을 읽고 정상 가입→sandbox 이메일 확인→프로필 설정을 거친다. 기존 계정이면 로그인만 확인하며 비밀번호를 덮어쓰지 않는다.

```bash
# 로컬 체험 환경에서만 사용. 비밀 값 자체를 로그에 출력하지 않는다.
set -a
. ./.env.seed.local
set +a
docker compose -p claps-content --env-file .env.seed.local -f /tmp/claps-content-compose.yaml \
  run --rm --no-deps -e DEMO_EMAIL -e DEMO_PASSWORD worker pnpm db:seed:demo
corepack pnpm test:demo
```

시드는 worker의 공용 uploads 볼륨으로 실행한다. migrate에는 업로드 볼륨이 없으므로 파일 시드를 실행하지 않는다. 호스트 CLI 사용 시에도 DATABASE_URL과 UPLOADS_DIR를 동일한 로컬 체험 DB/파일 저장소에 맞춘다.

`test:demo`는 별도 `playwright.demo.config.ts`로 실행하며 기본 `test:e2e`와 분리돼 있다. 프로젝트/세션/원본/한·영 추천/모바일/미인증 접근을 확인하고 프로젝트 커버와 실제 규칙 추천 결과를 남긴다. AI 결과를 생성하지 않는다. 복구 비교용 `/tmp/claps-content-{state,fixture}.json`은 0600이며, `CHECK_ORIGIN=http://127.0.0.1:3194 node scripts/demo-recovery-check.mjs`로 격리 복구본을 확인한 뒤 제거한다. 테스트 trace에는 세션 정보가 포함될 수 있으므로 공개 보고서에 복사하지 않는다.

임시 Compose 사본과 포트는 로컬 검수용이며 운영 배포 설정이 아니다. 결과와 범위는 [콘텐츠·시드 결과](../md/content-seed-result.md)에 기록한다.
