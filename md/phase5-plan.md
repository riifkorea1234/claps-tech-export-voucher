# Phase 5 상세 개발 플랜 — 공통 job·PostgreSQL 큐·worker·실패 복구

## 1. 기본 정보

| 항목 | 내용 |
| --- | --- |
| Phase | 5 |
| 상태 | `EXECUTED` — 구현·필수 검증 완료, 결과 보고서 COMPLETED |
| 작성일 | 2026-09-22 |
| 예상 기간 | 4~6 작업일; 1명 순차 수행 기준 초기 추정, 외부 결정·계정 준비 대기 제외. 착수 조사 후 재산정 |
| 담당 | 백엔드·운영·프론트엔드 (실제 담당자 배정은 착수 시 기록) |
| 요구사항 추적 | OPS-02, UI-01; GEN/GUIDE/VERIFY/MATCH/MON/FILE 비동기 공통 기반 |
| 전체 검증 연결 | T-06·T-13·T-16 요청 제한; T-03 job 권한 |

문서 작성은 구현 시작이나 Phase 완료를 의미하지 않는다. 선행 결과와 이 Phase의 필수 결정을 확인한 뒤 `READY`로 변경하고 계획을 공유한다. 이후 `IN_PROGRESS → EXECUTED`로 진행하며, `COMPLETED`는 완료 게이트를 충족한 결과 보고서의 판정이다. 미결정 사항으로 구현을 시작할 수 없으면 원인과 재개 조건을 적고 `BLOCKED`로 변경한다.

## 2. 배경과 목표

시간이 오래 걸리는 작업을 요청/실행/복구로 분리하고 worker 중단·중복 요청·취소에도 업무 데이터와 비용 상태가 일관되게 한다.

## 3. 입력 자료와 이전 Phase 인수인계

- [전체 개발 플랜](development-plan.md): 제품 범위·DB/API 계약·최종 완료 기준의 기준 문서.
- [Phase 진행 규칙](phase-development-process-rules.md): 시작·테스트·보고·완료 게이트.
- [기존 연동 가이드](../HANDOFF.md), [저장소 설명](../README.md), [AGENTS.md](../AGENTS.md).
- [Phase 4 계획](phase4-plan.md)과 구현 후 생성될 `phase4-test-checklist.md`, `phase4-result.md`, `phase4-result.html`을 순서대로 읽는다. 이전 결과가 `COMPLETED`이고 필수 검증이 모두 `PASS`인지 확인한다. 2026-09-23 실제 문서 확인: Phase 4 COMPLETED, 필수 5 PASS, 자동 93 PASS. 기술 선행 게이트를 충족했다.
- 필요한 인수인계: Phase 4 소유권/파일/삭제 정책·결과 반영 가드, Phase 0 큐/제한 정책, jobs schema.

후속 Phase를 미리 계획하는 것은 허용하되 구현은 번호 순서대로 진행한다. 이전 Phase의 실패·차단·이월 항목이 이 단계의 완료 기준에 영향을 주면 먼저 해결하거나 범위/계약 변경을 기록한다.

## 4. 현재 상태 조사

실제 착수 시 Phase 4 CRUD/파일과 인증·언어팩은 서버화되어 있고, jobs schema 및 DB heartbeat worker가 존재했다. 생성·검증 엔진은 후속 범위이며 공개 생성 endpoint는 없다. Node 22.22.0/pnpm 10.34.5/Next 16.3.3과 unit/integration/i18n/e2e scripts를 확인했다. Next 로컬 route-handlers/use-client 가이드를 읽었고 기존 미커밋·미추적 파일을 보존했다.

## 5. 구현 범위

PostgreSQL 큐 하나, queued/running/succeeded/failed/canceled, lease/heartbeat/안전한 획득, retry/timeout/cancel/idempotency, provider request ID/응답 불명, 사용자별 제한, polling UI hook, 파일 정리 처리기를 구현한다. 종류별 handler 등록과 test adapter를 제공한다.

이 단계에서 추가·변경하는 사용자/관리자 문구는 ko/en 파일 언어팩에 함께 반영한다. 업무 데이터 번역은 `localized_contents`만 사용하고, 고정 UI·랜딩·메일 문구는 DB로 옮기지 않는다.

## 6. 제외 범위

실제 생성·검증·추천·탐지 엔진과 품질 검증, 어드민 작업 화면(Phase 6), Redis·실시간 소켓·별도 스케줄러 편집기.

결제·구독, 조직 협업, 범용 CMS, 자동 침해 신고는 전체 초기 범위에서 제외한다. 새로운 비용·제품 정책·공개 계약이 필요하면 구현 전에 전체 플랜과 이 문서의 변경 이력을 갱신한다.

## 7. 결정·가정·질문

큐 테이블 직접 구현 또는 검증된 DB 큐 라이브러리 중 Phase 0 선택 하나만 사용한다. 종류별 timeout/재시도/동시 실행/사용량 상한과 응답 불명 작업 정책을 확정한다. 외부 멱등성/결과 재조회가 없으면 응답 불명 작업을 무조건 재실행하지 않는다.

권장안과 확정 사항을 구분한다. 이 문서 작성에는 추가 승인이 필요하지 않으며, 미결정 항목은 해당 구현의 시작 게이트에서 해결한다. 실제 과금·메일 발송·외부 데이터 변경 검증은 진행 규칙 8.6에 따라 승인된 대상과 환경에서만 수행한다.

## 8. 작업 분해와 실행 순서

위에서 아래 순서로 진행한다. 각 작업의 선행 산출물을 확인하고 담당 영역이 산출물·검증 증거를 남긴다.

| 작업 ID | 작업 | 산출물 | 의존성 | 담당 영역 | 검증 |
| --- | --- | --- | --- | --- | --- |
| P5-01 | job envelope·종류별 schema·상태 전이 구현 | input/output 버전·공통 adapter | Phase 4 완료 | 백엔드 | P5-T01 |
| P5-02 | 트랜잭션 획득·lease·heartbeat·종료 신호 구현 | 다중 worker 단일 획득 | P5-01 | 백엔드/운영 | P5-T02 |
| P5-03 | 등록 멱등성·재시도·취소·응답 불명 처리 | 시도 연결·공급자 request ID | P5-02 | 백엔드 | P5-T03 |
| P5-04 | 권한 상태 API·polling·사용량 제한 구현 | job 상태/오류 UI 계약 | P5-03 | 공통 | P5-T04 |
| P5-05 | 만료 파일·삭제 예약 처리 및 장애 주입 | 정리 handler·늦은 결과 차단 | P5-02~04 | 운영/검증 | P5-T05 |

## 9. 예상 파일/API/DB/화면 영향

다음은 예상 경로다. 아직 없는 경로는 생성 예정이며 도구 선택으로 경로가 달라지면 구현 전에 기록한다.

- 생성/변경: `workers/`, `lib/server/jobs/`, `lib/server/adapters/`, `lib/contracts/jobs*`, `app/api/jobs/`, 클라이언트 polling 모듈.
- 변경: `db/` 인덱스/migration, `compose.yaml`, `.env.example`, 상태 표시 컴포넌트·언어팩.
- 생성: worker 중단/동시성/멱등성/정리 테스트.

| 영역 | 영향 |
| --- | --- |
| DB migration | jobs 획득 인덱스·owner/kind/idempotency 유일성·lease/시도 관계. 큐 실행 수명과 참조 업무 이력 보존을 구분. |
| seed | 성공/실패/지연/응답 불명 test handler fixture; 운영에서 test adapter 자동 선택 금지. |
| API 계약 | GET /api/jobs/:id, POST /api/jobs/:id/cancel; job 생성 서비스는 202+jobId·멱등 키·안전한 오류. |
| 화면 | 실제 상태 polling·재시도 가능 여부·취소 요청과 최종 취소 구분. |
| 인프라 | worker heartbeat·SIGTERM·DB 잠금·재시작 복구·web과 같은 볼륨/파일팩. |
| 삭제 | 기본적으로 삭제 파일 없음. 기존 store/mock은 호출자 전환과 참조 검색이 끝난 뒤 해당 Phase 소유 범위에서만 제거한다. |

## 10. 테스트 계획

기본 검사: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`. Phase 1에서 제공할 목표 명령은 `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm test:i18n`, `pnpm db:migrate`, `pnpm db:seed`다. **실제 scripts가 존재하며 실행 증거는 체크리스트에 기록한다.** 실제 도구/필터 인자는 Phase 1에서 확정하고 착수 시 이 문서와 체크리스트에 실행 가능한 명령을 갱신한다. 테스트가 0개이거나 필수 suite가 skip이면 통과로 처리하지 않는다.

2개 worker·동일 멱등 키 동시 요청·강제 종료 위치·공급자 응답 유실·늦은 응답·탈퇴/보관·만료 파일 fixture. 운영 과금 없이 fault injection으로 검증한다.

아래는 **실행 전 검증 설계**다. 구현이 끝나면 `phase5-test-checklist.md`에 환경·명령/절차·실제 결과·종료 코드·suite/test 성공/실패/skip 수·실패 원인·수정·재검증을 기록한다. 해당 Phase에 적용하지 않는 테스트 범주는 삭제하지 말고 `NOT_APPLICABLE` 사유와 이후 검증 Phase를 기록한다.

| ID | 필수 여부 | 분류 | 명령 또는 실행 절차 | 기대 결과 | 현재 상태 |
| --- | --- | --- | --- | --- | --- |
| P5-T01 | 필수 | 단위/계약 | 종류별 input/output·불법 상태 전이·큰 JSON 검증 | 잘못된 입력/전이 거절·기록 보존 | PASS — 체크리스트 참조 |
| P5-T02 | 필수 | 통합/장애 | 동시 worker 획득·running 중 종료·lease 만료·재시작 | 중복 확정 0건·복구 가능·원인 기록 | PASS — 체크리스트 참조 |
| P5-T03 | 필수 | 멱등/공급자 | 동일 요청·명시적 재실행·응답 불명·취소 후 응답 | 재전송 중복 없음·새 시도 추적·불명 작업 무조건 재과금 금지 | PASS — 체크리스트 참조 |
| P5-T04 | 필수 | API/E2E | 타인 job·제한 초과·polling 오류·새로고침 | 권한/제한 강제·실제 상태 복원·내부 오류 미노출 | PASS — 체크리스트 참조 |
| P5-T05 | 필수 | 정리/복구 | 보관/탈퇴 후 늦은 결과·임시/실패/ZIP 파일 만료 | 삭제 대상 부활 0건·참조 파일 보존·정리 재실행 안전 | PASS — 체크리스트 참조 |

기본 코드 검사는 코드가 변경되는 Phase마다 필수다. 표의 필수 검증 중 하나라도 `FAIL/BLOCKED/PENDING`이면 완료할 수 없다. test adapter/sandbox 통과와 실제 공급자 품질 검증을 구분한다.

## 11. 완료 조건

- [x] 동시 worker·중단/재시작·중복 요청 시나리오를 통과했다.
- [x] 응답 불명·취소·재시도·비용 상태가 추적된다.
- [x] 제한/권한/파일 정리/삭제 결과 반영 규칙이 서버에서 강제된다.
- [x] 작업별 필수 검증이 모두 `PASS`이고 미실행을 성공으로 기록하지 않았다.
- [x] 상세 계획 대비 차이, 변경 파일, 실제 명령·결과 및 이월 항목을 기록했다.
- [x] `phase5-test-checklist.md`, `phase5-result.md`, `phase5-result.html`을 실제 실행 후 작성했다.
- [x] MD/HTML 상태·수치·미완료·인수인계가 일치하고 문서 링크/HTML 구조가 검증되었다.
- [x] 다음 Phase를 막는 미해결 항목이 없다.

## 12. 위험과 대응

외부 호출과 DB commit은 원자적이지 않아 exactly-once를 보장한다고 주장하지 않는다. 결과 재조회·멱등성·운영 확인으로 중복 비용 위험을 관리한다.

## 13. rollback/복구

신규 job 등록과 worker 획득을 중지하고 실행 중 lease/공급자 상태를 점검한다. 호환 이전 worker로 복원하되 running 작업을 일괄 재실행하지 않는다.

사용자 변경을 포함한 작업 트리를 통째로 초기화하지 않는다. 적용한 migration과 코드 버전의 호환성을 확인하며, 데이터가 존재하는 환경의 파괴적 되돌리기는 백업/복구 검증 없이 실행하지 않는다.

## 14. 결과 증거와 다음 Phase 인수인계

결과 증거: 강제 종료 시점·job 상태/시도/lease 변화·중복 실행 수·파일 정리·제한 검증.

다음 단계: [Phase 6](phase6-plan.md)에 작업 조회/재시도/취소 서비스·안전한 오류·사용량 집계·운영 확인 절차를 전달한다.

구현·검증 후 생성할 파일은 `phase5-test-checklist.md`, `phase5-result.md`, `phase5-result.html`이다. 현재 미생성 파일은 완료 증거로 링크하지 않는다. HTML은 외부 CDN/런타임 JavaScript 없이 단일 파일·반응형·인쇄 CSS로 작성한다. 로그·화면 증거에서 secret, 세션 쿠키, 개인정보, 비공개 원문을 제거한다. MD를 원본으로 삼고 두 보고서에 같은 완료 판정과 수치를 기록한다.

## 15. 변경 이력

| 날짜 | 변경 | 근거/상태 |
| --- | --- | --- |
| 2026-09-22 | 전체 개발 플랜을 Phase별 상세 계획으로 분할 | 사용자 요청·Phase 진행 규칙 반영; `DRAFT`, 구현/테스트 미착수 |

## Phase 4 인수인계 (2026-09-23)

- [Phase 4 결과](phase4-result.md)·[체크리스트](phase4-test-checklist.md)·[HTML](phase4-result.html): COMPLETED. 필수 5 PASS, 자동 93 PASS, smoke 4 PASS, lint 신규 오류/경고 0.
- 업무 CRUD·소유권·version·보관/복구는 WorkspaceService, public mutation은 같은 AuthService.authenticated transaction과 users 행 잠금을 사용한다.
- worker는 lib/server/assets/lifecycle.ts의 lockActiveSession을 같은 transaction에서 호출한 뒤 결과를 연결한다. 보관/withdrawal_pending/suspended면 실패시키고 절대 부모 상태를 부활시키지 않는다.
- 0002 storage_tickets migration을 먼저 적용한다. 업로드는 reserved→cleanup_pending(IO)→ready→claimed; 만료 reserved/ready, 실패·교체 cleanup_pending이 정리 대상이다. 토큰은 digest 저장, 메타는 예정 경로 또는 strict fileSchema다.
- PNG/JPEG/WebP 커버 최대 10MiB·40MP·단일 프레임, 업로드 15분·다운로드 5분 확정. web/worker 공유 UPLOADS_DIR은 /app/uploads, 원본 UUID-original과 썸네일 UUID-thumbnail이다. 파일 service는 부모 소유권/상태를 매번 확인한다.
- 만료 다운로드 capability 레코드 청소와 업로드/정리 ledger 재처리는 이 Phase에서 구현한다. 현재 별도 영구 files 엔티티는 없고 소유 레코드 JSONB가 원본 메타다.
- 실제 파일 삭제는 사용자 보존 정책 확정 전 비활성이다. hasStoredFileReferences의 false나 cleanup_pending은 삭제 승인이 아니다. 감사/과거 job/업무 참조와 복원 정책을 보존한다.
- 실제 생성/검증/최종화 endpoint는 없다. 합성 에셋 fixture는 격리 tests/helpers에서만 만든다. 테스트 계정/업무/파일/메일을 정리했고 Phase 4 DB/파일 볼륨·이미지는 중지 상태로 보존했다.

## 2026-09-23 착수 조사·실행 계획

- Codex 단독 수행. 기존 미커밋/미추적 작업 보존. Phase 0 정책·Phase 4 계획/체크리스트/MD/HTML·HANDOFF 확인.
- 실제 환경 Node 22.22.0, pnpm 10.34.5, Next 16.3.3. 설치된 Next route-handlers/use-client 가이드를 읽었다. 테스트 scripts 및 PostgreSQL jobs/storage_tickets schema 존재; worker는 DB heartbeat 골격이다.
- PostgreSQL jobs 직접 큐를 유지한다. 추가 큐 테이블 없이 각 재시도는 retry_of_id로 연결되는 새 jobs 행이다. terminal 상태를 재개하지 않는다.
- additive migration: lease token, heartbeat/deadline, provider 호출 전 dispatch 표시, 비용 상태 및 retry child 유일성. worker는 users→업무 대상→jobs 잠금 순서와 lease token fencing을 사용한다.
- 등록 서비스는 인증 transaction 안에서 소유/부모 상태·멱등 hash·제한을 검사한다. 실제 엔진 없는 종류는 운영 handler 미등록으로 거절한다. 공개 테스트 생성 endpoint는 만들지 않는다.
- GET /api/jobs/:id 및 POST /api/jobs/:id/cancel, 후속 화면용 공통 polling hook/상태 패널을 구현한다. 재시도는 Phase 6용 서버 서비스로 제공한다.
- worker heartbeat, timeout, SIGTERM, lease 만료 복구와 보관/탈퇴 후 늦은 결과를 검증한다. 외부 호출 전 dispatch를 commit하고 응답 불명은 failed+운영 확인 상태로 유지한다.
- 파일 maintenance는 만료 다운로드 capability를 batch 정리하고 만료 업로드를 cleanup_pending으로 전환한다. 파일/감사/job 이력 물리 삭제는 기존 비활성 정책을 유지하는 안을 사용자가 아래와 같이 확정했다.
- D-07 착수 제안(아래 사용자 확정 기록 참조): 계정 실행 2개/대기 10개/신규 요청 60회/시간, 종류별 개발 timeout 5분, 안전한 실패 최대 2회 재시도. 실제 공급자별 값은 Phase 7~10에서 재확정.
- 실행: 독립 계약 P5-01 → 결정 반영 → queue/service/runner → API/polling/maintenance → 격리 PostgreSQL 장애 통합·브라우저 E2E → lint/typecheck/build → MD/HTML 증거·Phase 6 인수인계.
- 검증 환경은 새 claps-phase5-tests Compose DB, 별도 private 파일/메일과 web 포트를 사용한다. 운영 데이터·다른 프로젝트 컨테이너에 접근하지 않는다.

### 사용자 결정 반영

2026-09-23 사용자가 제안한 개발용 제한(실행 2/대기 10/시간당 신규 작업 60, timeout 5분, 안전 실패 최대 2회 재시도, 응답 불명 자동 재호출 금지) 및 기존 파일 보존 정책 유지를 확정했다. 모든 종류에 개발 기본값을 적용하고 30초 lease·10초 heartbeat·5초부터 지수 backoff를 사용한다. 재시도도 신규 행/시간당 60 한도에 포함한다. 재시도 상한은 최초 실행+2회다. 실제 공급자 비용/지연 정책은 Phase 7~10에서 별도 결정한다. 공통 output은 기존 64KiB 메타데이터 상한을 유지하고 큰 결과는 파일 참조로 제한한다.

상태 패널은 `/jobs/:id`에 연결한다. 작업 생성 화면이 후속 Phase에 생기면 202 응답의 jobId로 이동/재사용할 수 있다. 테스트 전용 페이지나 공개 test job 생성 API는 추가하지 않는다.

### 실행 완료 기록

2026-09-23: 필수 5 PASS, 최종 고유 자동 121 PASS(단위 28·i18n 6·통합 60·Chromium 27), smoke 4 PASS. lint 신규 오류/경고 0, 기존 warnings 6; typecheck/build 통과. 결과와 최초 실패/수정은 [체크리스트](phase5-test-checklist.md)·[결과 MD](phase5-result.md)·[결과 HTML](phase5-result.html)에 기록한다. 상세 계획 대비 차이는 결과 보고서 3절을 따른다. Phase 6은 미착수다.
