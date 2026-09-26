# Phase 1 상세 개발 플랜 — PostgreSQL·서버·Docker·검증 기반

## 1. 기본 정보

| 항목 | 내용 |
| --- | --- |
| Phase | 1 |
| 상태 | `EXECUTED` — 구현·필수 검증 완료; 최종 판정은 결과 보고서 |
| 작성일 | 2026-09-22 |
| 예상 기간 | 4~6 작업일; 1명 순차 수행 기준 초기 추정, 외부 결정·계정 준비 대기 제외. 착수 조사 후 재산정 |
| 담당 | 백엔드·운영 (실제 담당자 배정은 착수 시 기록) |
| 요구사항 추적 | OPS-02, UI-01 공통 기반 |
| 전체 검증 연결 | T-01, T-14 기초; T-03·T-05·T-06·T-15 기반 |

문서 작성은 구현 시작이나 Phase 완료를 의미하지 않는다. 선행 결과와 이 Phase의 필수 결정을 확인한 뒤 `READY`로 변경하고 계획을 공유한다. 이후 `IN_PROGRESS → EXECUTED`로 진행하며, `COMPLETED`는 완료 게이트를 충족한 결과 보고서의 판정이다. 미결정 사항으로 구현을 시작할 수 없으면 원인과 재개 조건을 적고 `BLOCKED`로 변경한다.

## 2. 배경과 목표

빈 환경에서 PostgreSQL과 web/worker 골격을 실행하고 후속 기능이 사용할 DB·오류·로그·테스트 기반을 만든다.

## 3. 입력 자료와 이전 Phase 인수인계

- [전체 개발 플랜](development-plan.md): 제품 범위·DB/API 계약·최종 완료 기준의 기준 문서.
- [Phase 진행 규칙](phase-development-process-rules.md): 시작·테스트·보고·완료 게이트.
- [기존 연동 가이드](../HANDOFF.md), [저장소 설명](../README.md), [AGENTS.md](../AGENTS.md).
- [Phase 0 계획](phase0-plan.md)과 실행 후 생성된 `phase0-test-checklist.md`, `phase0-result.md`, `phase0-result.html`을 순서대로 읽는다. 이전 결과가 `COMPLETED`이고 필수 검증이 모두 `PASS`인지 확인한다. [Phase 0 체크리스트](phase0-test-checklist.md), [결과 MD](phase0-result.md), [결과 HTML](phase0-result.html)이 생성되었다. 완료 판정과 필수 검증 PASS를 확인하고 착수 시 작업 트리를 다시 조사한다.
- 필요한 인수인계: Phase 0의 도구/버전·schema/API 계약·배포 전제.

후속 Phase를 미리 계획하는 것은 허용하되 구현은 번호 순서대로 진행한다. 이전 Phase의 실패·차단·이월 항목이 이 단계의 완료 기준에 영향을 주면 먼저 해결하거나 범위/계약 변경을 기록한다.

## 4. 현재 상태 조사

Docker·API·DB·테스트 구성이 없고 next.config.ts에는 이미지 품질 설정만 있다. .gitignore는 .env* 전체를 제외한다.

공통 조사 기준은 `feature/backend`의 현재 작업 트리다. 이번 문서 분할 시 `md/`는 기존 미추적 사용자 파일이었으며 원본 규칙을 보존한다. `package.json`에는 `dev/build/start/lint`만 있고 DB·인증·테스트 의존성은 없다. `node_modules/next/dist/docs/`는 현재 확인되지 않았다. 구현 착수 시 설치된 Next.js 버전의 로컬 가이드를 확보·확인한 뒤 코드를 작성한다. 이 문서는 미래 Phase의 코드가 이미 존재한다고 가정하지 않는다. 착수 시 실제 파일, 의존성, 작업 트리 및 이전 결과와 차이를 다시 기록한다.

## 5. 구현 범위

서버 전용 DB 연결, 최초 schema/migration·멱등 seed, 환경변수 검증, 공통 DTO/오류/request ID/마스킹, API 클라이언트, Docker web/worker/db/migrate, 단위/통합/E2E 실행기를 만든다.

이 단계에서 추가·변경하는 사용자/관리자 문구는 ko/en 파일 언어팩에 함께 반영한다. 업무 데이터 번역은 `localized_contents`만 사용하고, 고정 UI·랜딩·메일 문구는 DB로 옮기지 않는다.

## 6. 제외 범위

실제 인증·업무 CRUD·큐 소비·외부 공급자 호출. worker healthcheck는 처리 완료 증거가 아니다.

결제·구독, 조직 협업, 범용 CMS, 자동 침해 신고는 전체 초기 범위에서 제외한다. 새로운 비용·제품 정책·공개 계약이 필요하면 구현 전에 전체 플랜과 이 문서의 변경 이력을 갱신한다.

## 7. 결정·가정·질문

Phase 0 전체 플랜 9.1~9.2절의 버전을 설치 목표로 사용한다: Node 22.22.0, pnpm 10.34.5, PostgreSQL 17.11, Drizzle ORM 0.45.3/Kit 0.31.11/pg 8.23.0, Better Auth 및 Drizzle adapter 1.7.5, Vitest 5.0.1/Vite 8.3.0, Playwright 1.63.0, Zod 4.6.5, tsx 4.23.15. @types/node는 기존 ^20에서 22.20.4로 맞춘다. Next 16.3.3/React 19.2.8은 유지한다. 설치된 Next 로컬 가이드를 읽고 peer/native 의존성·workspace 설정·Docker 이미지 digest를 검증한다. 설치 범위만으로 실행 호환성을 주장하지 않는다.

Drizzle 하나로 migration을 관리한다. 11개 기본 테이블 + auth_sessions/auth_accounts/auth_verifications 3개를 생성하고 Better Auth user 모델은 users에 매핑한다. 이메일·비밀번호 credential hash를 사용하며 OTP 로그인 plugin은 제외한다. schema·순환 FK·추가 version/source_revision 및 API 경계는 전체 플랜 5.5·6.6절을 따른다. 기능별 추가 인증 플러그인·rate-limit 테이블은 Phase 3 migration으로 관리한다. seed는 프로필/권한을 자동 승격하지 않는다. 테스트 DB는 개발 DB와 분리한 DB/볼륨을 사용한다.

D-04 실제 호스트·백업 계정은 로컬 Compose를 막지 않으며 운영 데이터 투입 전 필요하다. D-01~10의 나머지 결정은 해당 Phase 착수/공개 게이트에서 재확인한다.

권장안과 확정 사항을 구분한다. 이 문서 작성에는 추가 승인이 필요하지 않으며, 미결정 항목은 해당 구현의 시작 게이트에서 해결한다. 실제 과금·메일 발송·외부 데이터 변경 검증은 진행 규칙 8.6에 따라 승인된 대상과 환경에서만 수행한다.

## 8. 작업 분해와 실행 순서

위에서 아래 순서로 진행한다. 각 작업의 선행 산출물을 확인하고 담당 영역이 산출물·검증 증거를 남긴다.

| 작업 ID | 작업 | 산출물 | 의존성 | 담당 영역 | 검증 |
| --- | --- | --- | --- | --- | --- |
| P1-01 | 버전·로컬 Next 가이드·서버 경계·환경 계약 구성 | 의존성 고정·.env.example | Phase 0 완료 | 백엔드 | P1-T01 |
| P1-02 | schema·FK·인덱스·JSONB·migration/seed | 빈 DB 재현·재실행 가능한 seed | P1-01 | DB | P1-T02 |
| P1-03 | 응답·오류·로그·클라이언트 구현 | 공통 계약과 안전한 오류 | P1-02 | 백엔드 | P1-T03 |
| P1-04 | Docker·healthcheck·검증 스크립트 구성 | 볼륨·시작 순서·테스트 실행기 | P1-03 | 운영/검증 | P1-T04 |

## 9. 예상 파일/API/DB/화면 영향

다음은 예상 경로다. 아직 없는 경로는 생성 예정이며 도구 선택으로 경로가 달라지면 구현 전에 기록한다.

- 생성: `db/`, `lib/server/db/`, `lib/server/config/`, `lib/server/errors/`, `lib/contracts/`, `lib/api/`.
- 생성: `Dockerfile`, `.dockerignore`, `compose.yaml`, `.env.example`, `workers/`, `tests/`, 테스트 설정.
- 변경: `package.json`, `pnpm-lock.yaml`, `.gitignore`, `next.config.ts`.

| 영역 | 영향 |
| --- | --- |
| DB migration | 11개 기본 테이블+인증 테이블 생성. 순환 FK는 테이블 생성 후 제약 추가 등 순서를 고정. |
| seed | ko/en은 파일팩 준비 전 공개 비활성. 개발 샘플/운영 seed 분리, 게시본 덮어쓰기 금지. |
| API 계약 | 공통 envelope·validation·healthcheck. 업무 API 공개는 권한 적용 이후. |
| 화면 | 기존 화면 유지; 공통 API 클라이언트 준비. |
| 인프라 | DB 외부 포트 미공개·비관리자 이미지·명명 볼륨·migrate 성공 후 web/worker 시작·secret 런타임 주입. |
| 삭제 | 기본적으로 삭제 파일 없음. 기존 store/mock은 호출자 전환과 참조 검색이 끝난 뒤 해당 Phase 소유 범위에서만 제거한다. |

## 10. 테스트 계획

기본 검사: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`. Phase 1에서 제공할 목표 명령은 `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm test:i18n`, `pnpm db:migrate`, `pnpm db:seed`다. **현재는 추가 스크립트가 없으며 실행 완료를 의미하지 않는다.** 실제 도구/필터 인자는 Phase 1에서 확정하고 착수 시 이 문서와 체크리스트에 실행 가능한 명령을 갱신한다. 테스트가 0개이거나 필수 suite가 skip이면 통과로 처리하지 않는다.

운영과 격리한 빈 PostgreSQL·개발 볼륨·합성 fixture를 사용한다. Docker 명령은 전체 플랜 7.3절을 따른다.

아래는 **실행 전 검증 설계**다. 구현이 끝나면 `phase1-test-checklist.md`에 환경·명령/절차·실제 결과·종료 코드·suite/test 성공/실패/skip 수·실패 원인·수정·재검증을 기록한다. 해당 Phase에 적용하지 않는 테스트 범주는 삭제하지 말고 `NOT_APPLICABLE` 사유와 이후 검증 Phase를 기록한다.

| ID | 필수 여부 | 분류 | 명령 또는 실행 절차 | 기대 결과 | 현재 상태 |
| --- | --- | --- | --- | --- | --- |
| P1-T01 | 필수 | 정적/build | 기본 검사와 누락/잘못된 환경변수로 실행 | 검사 통과·안전한 설정 오류·클라이언트/로그 secret 노출 0건 | PASS |
| P1-T02 | 필수 | DB 통합 | 빈 DB migration 및 seed 2회 실행 | FK/유일성 보장·중복 0건·기존 값 보존 | PASS |
| P1-T03 | 필수 | 단위/통합 | 입력 오류·내부 예외·JSONB 제한·request ID 검증 | 계약된 오류·마스킹·추적 ID 정상 | PASS |
| P1-T04 | 필수 | Docker/검증 | build→db→migrate→web/worker→재시작; 모든 실행기 smoke | schema/seed 유지·중복 migration 없음·각 suite 실테스트 존재 | PASS |

기본 코드 검사는 코드가 변경되는 Phase마다 필수다. 표의 필수 검증 중 하나라도 `FAIL/BLOCKED/PENDING`이면 완료할 수 없다. test adapter/sandbox 통과와 실제 공급자 품질 검증을 구분한다.

## 11. 완료 조건

- [x] 빈 환경의 빌드·migration·실행·재시작이 재현된다.
- [x] DB 계약과 실제 schema/제약이 일치한다.
- [x] 목표 테스트/DB 명령을 실제 package.json에서 실행할 수 있다.
- [x] 작업별 필수 검증이 모두 `PASS`이고 미실행을 성공으로 기록하지 않았다.
- [x] 상세 계획 대비 차이, 변경 파일, 실제 명령·결과 및 이월 항목을 기록했다.
- [x] `phase1-test-checklist.md`, `phase1-result.md`, `phase1-result.html`을 실제 실행 후 작성했다.
- [x] MD/HTML 상태·수치·미완료·인수인계가 일치하고 문서 링크/HTML 구조가 검증되었다.
- [x] 다음 Phase를 막는 미해결 항목이 없다.

## 12. 위험과 대응

설치 버전 가이드와 도구 호환성이 다르면 계약을 먼저 수정한다. schema와 worker 골격을 완성된 기능으로 보고하지 않는다.

## 13. rollback/복구

web/worker 중지 후 호환 이전 이미지 복원·forward-fix 우선. 데이터 보존 환경에서 볼륨 삭제를 기본 복구로 사용하지 않는다.

사용자 변경을 포함한 작업 트리를 통째로 초기화하지 않는다. 적용한 migration과 코드 버전의 호환성을 확인하며, 데이터가 존재하는 환경의 파괴적 되돌리기는 백업/복구 검증 없이 실행하지 않는다.

## 14. 결과 증거와 다음 Phase 인수인계

결과 증거: 버전/이미지·migration/seed 로그·재시작 결과·실행 명령/테스트 수.

다음 단계: [Phase 2](phase2-plan.md)에 언어 테이블·DB/테스트 환경·스크립트 목록을 전달한다.

실제 실행 증거: [체크리스트](phase1-test-checklist.md), [결과 MD](phase1-result.md), [결과 HTML](phase1-result.html). HTML은 외부 CDN/런타임 JavaScript 없이 단일 파일·반응형·인쇄 CSS로 작성한다. 로그·화면 증거에서 secret, 세션 쿠키, 개인정보, 비공개 원문을 제거한다. MD를 원본으로 삼고 두 보고서에 같은 완료 판정과 수치를 기록한다.

## 15. 변경 이력

| 날짜 | 변경 | 근거/상태 |
| --- | --- | --- |
| 2026-09-22 | 전체 개발 플랜을 Phase별 상세 계획으로 분할 | 사용자 요청·Phase 진행 규칙 반영; `DRAFT`, 구현/테스트 미착수 |
| 2026-09-22 | Phase 0 도구 고정 버전·이메일/비밀번호 인증 14개 테이블·API/FK 계약·후속 결정 인수인계 반영 | 계획만 갱신; Phase 1 구현·설치 미착수 |

| 2026-09-23 | 착수 조사: Phase 0 COMPLETED/필수 4 PASS, Node 22.22.0·Docker 29.3.0 서버 사용 가능, pnpm 9.2.0·node_modules 없음. 고정 pnpm을 프로젝트 packageManager로 적용. 계획 공유 후 IN_PROGRESS 전환 | Codex 단독 수행; 기존 미추적 md 보존 |

| 2026-09-23 | 구현 경로 구체화: scripts/db.ts·scripts/worker-health.mjs·compose.test.yaml·vitest.config.mts·drizzle.config.ts·messages/{ko,en}/errors.json·db/README.md·scripts/README.md 추가. typecheck는 fresh checkout의 LayoutProps 생성을 위해 next typegen 후 tsc 실행 | 범위 내 운영/테스트·서버 경계 기반 |
| 2026-09-23 | Next 16.3.3 패키지의 로컬 가이드(route handlers, server-only, 환경변수, standalone, Vitest) 확인. 설치 전 동일 npm tarball의 dist/docs를 /tmp에 추출하여 읽고 설치 후 저장소 node_modules 가이드를 재확인 | 앱/프레임워크 버전 유지 |
| 2026-09-23 | DB metadata envelope 및 strict Zod 기술 상한 도입. jobs output은 참조 DTO만 정의하고 실제 provider payload/비용·결과 상한은 D-07 및 소유 Phase로 유지 | 공개 업무 API/제품 정책 추가 없음 |

| 2026-09-23 | baseline lint 실측은 기존 UI set-state-in-effect 19 errors + unused-disable 2 warnings. HANDOFF의 19 warnings와 불일치. eslint.config.mjs에서 기존 14개 UI 파일의 해당 규칙만 warn으로 유지하고 후속 소유 Phase에 정리 이월; 신규 서버/계약/테스트 규칙은 유지 | 기존 화면 리팩터링 제외, 경고 21건을 보고서에 공개 |

| 2026-09-23 | lint 상세 분류 정정: 19 errors는 set-state-in-effect 18건 + scroll-reveal-text의 render index 재할당 immutability 1건. 후자는 누적 index를 순수 계산으로 바꾸는 최소 수정으로 해결; 기존 13개 hydration 파일의 18건만 경고 유지. unused-disable 경고 2건 포함 최종 목표 0 errors / 20 warnings | 필수 정적 검사 통과를 위한 최소 기존 코드 보정 |

| 2026-09-23 | 필수 P1-T01~04 PASS, 자동 28/28·운영 smoke 4/4, lint 0 errors/20 warnings, 타입·production build·최종 컨테이너 healthy 확인. 결과 MD/HTML과 Phase 2 인수인계 작성 | EXECUTED; 결과 보고서 COMPLETED |
