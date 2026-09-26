# Phase 1 테스트 체크리스트

## 1. 환경과 결과

- 실행일: 2026-09-23, Asia/Seoul. Linux/WSL /mnt/f/claps-product, Node 22.22.0, pnpm 10.34.5, PostgreSQL 17.11, Docker 29.3.0, Compose 5.1.0.
- 시스템 PATH의 pnpm은 9.2.0이므로 아래 pnpm 명령은 corepack pnpm으로 실행했다. 전역 설치는 바꾸지 않았다.
- 최종 자동 기능 검사: 7 files / 28 tests / 28 passed / 0 failed / 0 skipped. 단위 15, PostgreSQL 통합 10, i18n 1, Chromium E2E 2.
- Docker 운영 smoke는 별도 4 checks / 4 PASS다. 설정 실패 2사례·서버 경계·secret 검사 등은 수동/스크립트 검증으로 구분하며 자동 test 수에 합산하지 않는다.
- lint는 0 errors / 20 warnings다. 기존 hydration 18건과 unused-disable 2건이며 신규 기반 코드 오류는 없다.

## 2. 격리와 선행 조건

compose.test.yaml은 claps_test DB와 별도 test-db-data 볼륨을 사용한다. 이번에는 기본 claps-tests/55433에서 최초 실행 후, transaction fixture 수정 검증을 위해 새 claps-phase1-tests/55434 project·볼륨을 추가 생성했다. 개발/운영 DB와 같은 DB명 또는 claps_test 규칙에 맞지 않는 URL을 실행기가 거절한다. 최종 테스트 DB는 users=0, enabled locales=0이며 업무 fixture를 rollback했다.

Docker smoke는 claps-phase1 project와 이번 실행에서 생성한 db-data/uploads-data에 한정했다. 임시 env 파일에 합성 DB 비밀번호를 생성하고 파일 권한 0600으로 보관했다. secret 값·연결 문자열 원문은 보고서에 싣지 않았다. 최초 실패 때 이번 실행에서 만든 기본 테스트 볼륨에 남은 합성 fixture는 그 볼륨의 생성 이력을 확인한 뒤 정리했다. 기존 사용자/운영 볼륨은 건드리지 않았다.

## 3. 필수 검증

| ID | 필수 | 분류·대상 | 명령/절차 | 기대 결과 | 실제 결과 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| P1-T01 | 필수 | 정적·build·환경·서버 경계 | pnpm lint; pnpm typecheck; pnpm exec tsc --noEmit; pnpm build; 환경/클라이언트 import 실패 검사 | 정상 build, 안전한 설정 실패, secret 미노출 | 0 lint errors/20 warnings, typecheck/build 성공, 잘못된 환경 exit 1, server-only build 차단, secret 0건 | PASS |
| P1-T02 | 필수 | DB·schema·seed | pnpm db:migrate; pnpm db:seed 2회; pnpm test:integration; pnpm db:generate | 14테이블·FK·유일성·멱등 seed·기존 값 보존 | 10 tests PASS, migration 1개 유지, locale 2개, 기존 설정/게시본/권한 보존, schema drift 없음 | PASS |
| P1-T03 | 필수 | 계약·오류·JSONB·i18n | pnpm test:unit; pnpm test:i18n | 400/422/500·마스킹·request ID·64 KiB·ko/en 정합 | 단위 15 + i18n 1 PASS; auth core schema 대조 포함 | PASS |
| P1-T04 | 필수 | Docker·브라우저·재시작·장애 | compose build/up/migrate/restart; pnpm test:e2e; DB 중단/복구 | healthy web/worker, 데이터 유지, 실제 test suite 존재 | 운영 smoke 4/4, Chromium 2/2, 모든 실행기 실제 테스트·skip 0 | PASS |

## 4. 명령과 정량 결과

| 실행 명령/절차 | 종료 코드 | 실제 결과 |
| --- | --- | --- |
| npm exec --yes --package=pnpm@10.34.5 -- pnpm install --frozen-lockfile | 0 | 기존 고정 dependency 설치 및 Next 로컬 문서 확보 |
| 고정 pnpm install, 이후 Docker pnpm install --frozen-lockfile | 0 | Phase 0 버전 설치·lockfile 재현·native esbuild 스크립트 실행 |
| corepack pnpm db:generate | 0 | 14 tables, 0000_foundation.sql 생성; 최종 재실행 변경 없음 |
| corepack pnpm lint / Docker test target pnpm lint | 0 | 0 errors / 20 warnings |
| corepack pnpm typecheck / Docker test target pnpm typecheck | 0 | next typegen와 tsc 성공 |
| corepack pnpm exec tsc --noEmit | 0 | 생성된 Next route type 포함 최종 직접 검사 |
| corepack pnpm build / Docker builder pnpm build | 0 | production build, API health 동적 route·standalone 출력 |
| corepack pnpm test:unit | 0 | 4 files / 15 passed / 0 failed / 0 skipped |
| TEST_DATABASE_URL 설정 후 corepack pnpm test:integration | 0 | 1 file / 10 passed / 0 failed / 0 skipped; 별도 빈 PostgreSQL에서 실행 |
| corepack pnpm test:i18n | 0 | 1 file / 1 passed / 0 failed / 0 skipped |
| corepack pnpm exec playwright install chromium | 0 | Playwright 1.63.0 Chromium 설치 |
| E2E_BASE_URL 설정 후 corepack pnpm test:e2e | 0 | 1 file / 2 passed / 0 failed / 0 skipped |
| docker compose build | 0 | web/migrate/worker 모두 빌드; 최종 코드 재빌드 포함 |
| docker compose up -d --wait db; run --rm migrate; up -d --wait web worker | 0 | schema/seed 성공 후 web/worker healthy |
| Docker 재시작·DB 장애·복구 스크립트 | 0 | 4 checks PASS, 데이터·파일·migration journal 유지 |
| worker 누락/잘못된 DATABASE_URL 시작 | 1, 기대값 | 두 사례 모두 안전한 필드명만 출력, 합성 secret 미반영 |
| 폐기용 test 컨테이너에서 Client Component → DB import 후 pnpm build | 1, 기대값 | server-only 컴파일 오류 확인; 저장소에 probe 파일 없음 |
| 이미지 환경·로그·정적 번들 secret 검사 | 0 | 3개 runtime 이미지 환경, Compose 로그, 브라우저 파일 37개에서 secret 0건 |
| git diff --check | 0 | 공백 오류 없음 |

호스트 파일시스템 검사 지연을 줄이기 위해 Docker test target도 사용했다. 테스트 컨테이너는 uid 1000이며 Next 서버 경계 음성 검증용 폐기 컨테이너만 임시 probe 생성 권한을 사용했다. 빌드 시 DB 비밀번호를 전달하지 않았다.

고정 기반 이미지:

- node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94
- postgres:17.11-bookworm@sha256:639ab7ceb90e13123085b741fb31ef493fba25463002f6da665352e7b534b652

## 5. Docker 운영 smoke 절차

| Check | 실제 절차 | 관찰 결과 |
| --- | --- | --- |
| 1 | 빈 Compose DB migrate/seed, 테이블·언어·사용자 수 확인, web/worker/migrate id -u, worker가 합성 파일 작성 후 web에서 읽기 | 14 tables, locales=2/enabled=0, users=0, uid=1000, 공유 파일 내용 동일 |
| 2 | db/web/worker restart 후 health 대기, locale·migration journal·공유 파일 재조회 | health 200, locale 2개·migration 1개·파일 내용 유지 |
| 3 | db stop 후 GET /api/health 및 worker-health.mjs 반복 | API 503/SERVICE_UNAVAILABLE, SQL/연결 문자열 없음, worker health 비정상 |
| 4 | db start 후 API/worker 정상 대기, migrate/seed 재실행, 합성 파일 삭제 | API 200·worker health 정상, migration 1개·locale 2개 유지 |

worker health PASS는 작업 소비·공급자 성공을 의미하지 않는다. 외부 API·메일·과금·운영 배포 호출은 수행하지 않았다.

## 6. 최초 실패·수정·재검증

| 최초 결과 | 원인 | 수정·재검증 |
| --- | --- | --- |
| 전역 pnpm 명령 exit 1 | 기존 pnpm 9.2.0과 프로젝트 10.34.5 불일치 | corepack pnpm 10.34.5로 성공; 전역 변경 없음 |
| 초기 tsc exit 2 | LayoutProps 생성 전 실행, Pool/PoolClient seed 인자 차이, Next ProcessEnv의 NODE_ENV 필수 선언 | typegen 선행, NodePgDatabase 타입·환경 입력 Record 타입으로 수정; 최종 tsc/build PASS |
| 초기 lint exit 2 | 검사 진행 중 vitest.config.ts를 mts로 rename해 파일 열기 실패 | 파일 구성 고정 후 재실행 |
| baseline lint exit 1 | 기존 hydration 18 errors, scroll index immutability 1 error, unused-disable 2 warnings | 기존 13개 hydration 파일만 warn 명시; scroll index 순수 계산 수정. 최종 0 errors/20 warnings |
| 첫 DB integration 7 PASS / 3 FAIL | 수동 BEGIN에 Drizzle transaction을 중첩해 seed 검사 시 합성 fixture commit | seed 검사를 Drizzle 소유 transaction/nested savepoint로 변경; 새 DB에서 10 PASS. 최종 users=0 확인 |
| Vite 설정 경고 | ts 확장자 config에서 ESM을 CJS로 로딩 | vitest.config.mts로 변경; 새 실행에서 해당 경고 없음 |

이전 실패를 최종 test 수에 합산하거나 감추지 않았다. 최종 28개 자동 테스트는 모두 실행됐고 skip은 0이다.

## 7. 적용하지 않는 범주

| 범주 | 상태 | 사유·후속 Phase |
| --- | --- | --- |
| 실제 인증/권한/CSRF·메일·관리자 | NOT_APPLICABLE | schema/공통 기반만 제공, Phase 3 이후 |
| 업무 CRUD·작업 소비·공급자 품질/성능/timeout | NOT_APPLICABLE | Phase 4~10; heartbeat는 처리 완료 증거가 아님 |
| 전체 UI 번역·접근성·반응형 회귀 | NOT_APPLICABLE | 전체 UI 연동은 Phase 2·11; 이번에는 기존 로그인 smoke와 최소 scroll 계산 보정만 포함 |
| 운영 백업/복구·TLS·실배포 | NOT_APPLICABLE | D-04 미확정. 로컬 볼륨 재시작만 검사, Phase 11 |

## 8. 문서·완료 게이트

문서 검사 3/3 PASS: 로컬 링크 129개·HTML 링크 3개 정상, MD/HTML 본문 동일, HTML 구조·반응형·인쇄 CSS 및 완료 수치 정합성 확인. 진행 규칙 원문 SHA-256도 Phase 0 기록과 동일하다. 최종 판정은 [결과 MD](phase1-result.md) 및 [결과 HTML](phase1-result.html)에 기록한다. lint 경고 20건은 공개된 기존 UI 이월 항목이며 Phase 1 기반 기능 또는 Phase 2 착수 차단은 아니다.


## 9. 종료 상태와 도구 관찰

최종 web/worker healthy 및 E2E 재검증 후 이번 검증용 컨테이너를 중지했다. worker는 SIGTERM 후 exit 0, heartbeat 파일 제거를 확인했다. 최종 검증 DB/파일 볼륨은 보존했으며 실제 운영 배포는 하지 않았다.

설치 로그에 peer 충돌이나 무시된 필수 native build 오류는 없었다. 기존 ESLint 9.39.5 지원 종료 및 Drizzle Kit 하위 @esbuild-kit/core-utils·esm-loader deprecation 경고는 있었다. 이번에는 Phase 0 고정 버전과 기존 lint major를 유지했으며, 도구 업데이트 시 별도 호환 검증이 필요하다. 현재 lint/typecheck/build/실행 테스트 통과와 장기 지원 상태를 구분한다.
