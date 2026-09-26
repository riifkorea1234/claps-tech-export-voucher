# Phase 5 결과 보고서 — 공통 job·PostgreSQL 큐·worker·실패 복구

## 1. 판정

| 항목 | 결과 |
| --- | --- |
| 상태 | COMPLETED — 승인된 Phase 5 개발 범위 |
| 작업일·담당 | 2026-09-23, Asia/Seoul · Codex 단독 수행 |
| 선행 조건 | Phase 4 COMPLETED, 필수 5 PASS·자동 93 PASS 확인 |
| 필수 검증 | 5 PASS / 0 FAIL / 0 BLOCKED / 0 PENDING |
| 자동 테스트 최종 결과 | 19 files / 121 tests / 121 passed / 0 failed / 0 skipped, 재실행 중복 제외 |
| 구성 | 단위 28 + i18n 6 + PostgreSQL 통합 60 + Chromium E2E 27 |
| Docker smoke | 4 checks / 4 PASS, 자동 테스트 수와 별도 |
| 정적·빌드 | lint 0 errors / 6 기존 warnings; typecheck 및 production build exit 0 |
| 언어팩 | ko/en 각각 581 key, 11 namespace |

PostgreSQL jobs 큐와 worker의 획득·lease·heartbeat·복구를 구현했다. 멱등 등록, 연결된 새 시도의 안전 재시도, 취소, 응답 불명과 비용 상태, 권한 상태 API·polling 화면, 보존 정책을 지키는 파일 정리를 제공한다. 실제 AI 공급자 연동·품질 검증과 운영 배포 완료를 뜻하지 않는다.

## 2. 실제 완료 범위

- 여섯 종류의 버전 1 input/output schema와 64KiB 메타데이터 상한, 상태 전이 계약, 안전한 상태 DTO, 종류별 handler 등록 interface. 운영 registry는 실제 handler가 없어 비어 있으며 미등록 작업 생성은 거절한다.
- 사용자 행 잠금과 PostgreSQL SKIP LOCKED로 다중 worker 획득을 직렬화한다. 소유자 잠금 뒤 running 수를 새 snapshot으로 재확인하여 사용자별 실행 상한을 강제한다.
- lease token으로 과거 worker 완료를 차단하고 lease/heartbeat/deadline을 기록한다. 만료 시 기존 시도는 failed로 종료하며 안전할 때만 새 retry 행을 만든다. terminal 상태를 queued로 되돌리지 않는다.
- owner/kind/idempotency key와 순서에 독립적인 요청 hash를 검사한다. 동시 재전송은 같은 job, 다른 payload는 409다. retry_of_id UNIQUE로 같은 시도의 중복 재시도 생성도 방지한다.
- dispatch를 외부 호출 전에 commit하고 provider request ID를 기록한다. 호출 이후 응답 유실·timeout·worker 중단은 PROVIDER_UNKNOWN/unknown으로 보존하며 자동·일반 수동 재호출을 금지한다.
- queued 취소는 즉시 canceled, running 취소는 요청을 저장한 뒤 완료 transaction에서 결과 반영을 차단한다. 취소/timeout 이후 도착한 사용량 증거도 기록하며 외부 과금 취소를 보장하지 않는다.
- 결과 연결 전 계정·세션·프로젝트/참조 대상 상태를 검사한다. 보관·정지·탈퇴 후 결과는 부모를 부활시키지 않는다. handler apply 실패나 deadline 초과는 DB 쓰기를 rollback한다.
- 사용자 승인값: 실행 2개·대기 10개·시간당 새 시도 60개, timeout 5분, 안전 실패 최대 2회 재시도. lease 30초·heartbeat 10초, 5초부터 지수 backoff. 재시도도 시간당 한도에 포함한다.
- GET /api/jobs/:id, POST /api/jobs/:id/cancel, 후속 생성 endpoint용 202 응답 helper, /jobs/:id 상태 페이지와 useJob hook. 오류·새로고침·일시 장애 복구·취소 요청/종결·다음 시도 링크를 ko/en으로 표시한다. 내부 요청/출력·공급자 ID·오류 원문은 상태 API에 노출하지 않는다.
- 파일 IO 전에 job cleanup ledger를 예약할 수 있다. maintenance는 만료 다운로드 capability만 삭제하고 만료 업로드를 cleanup_pending으로 전환한다. 임시·실패·ZIP·참조 파일과 job/audit 이력의 물리 삭제는 비활성이다.

## 3. 계획 대비 결정과 차이

| 항목 | 실제 구현·근거 |
| --- | --- |
| 미확정 정책 | 사용자에게 개발 상한과 보존 정책을 확인한 후 반영. 실제 공급자 비용/품질 수치는 후속 Phase에서 확정 |
| 큐 저장 | 기존 jobs 한 테이블과 재시도 연결을 유지. 별도 Redis·큐 라이브러리·attempt 테이블 없음 |
| migration | 기존 획득/lease/owner 인덱스 재사용. 0003 additive lease/dispatch/cost 컬럼 및 retry child UNIQUE, storage job target 추가 |
| 파일 정리 | 승인대로 실제 파일 삭제 제외. 소유자가 없는 가짜 업무 job을 만들지 않고 worker maintenance handler가 30초마다 batch 100개를 처리 |
| polling 연결 | 후속 생성 화면에서 재사용할 hook/패널과 /jobs/:id 페이지 제공. 공개 test 생성 endpoint 없음 |
| 재시도 API | 인증된 소유자 서버 서비스만 제공. 관리자 권한·감사·추가 인증 wrapper와 관리자 UI는 Phase 6 |
| 검증 | Docker의 동일 Node/pnpm으로 정적·통합/build, 호스트 Chromium으로 E2E. SIGKILL/SIGTERM은 실제 child worker에 주입 |

## 4. 생성·변경 파일

| 영역 | 파일 |
| --- | --- |
| 계약·클라이언트 | lib/contracts/jobs.ts, lib/api/jobs.ts |
| 서버 | lib/server/jobs/{types,policy,parents,service,queue,runner,runtime,http}.ts, lib/server/adapters/registry.ts, lib/server/storage/maintenance.ts |
| worker·환경 | workers/index.ts, compose.yaml, .env.example |
| API·화면 | app/api/jobs/[id]/route.ts 및 cancel/route.ts, app/(app)/jobs/[id]/page.tsx, components/domain/job-status-panel.tsx |
| DB | db/schema.ts, 0003_medical_tenebrous.sql, 0003 snapshot 및 migration journal |
| 번역 | messages/{ko,en}/common.json, tests/i18n/packs.test.ts 동적 enum 검증 |
| 테스트 | tests/unit/jobs.test.ts, tests/integration/jobs.test.ts, tests/e2e/jobs.spec.ts, tests/helpers/job-worker.ts |
| 문서 | Phase 5 계획·체크리스트·MD/HTML 결과·증거, 전체 개발 계획·Phase 6 인수인계, README/HANDOFF/scripts/DB 안내 |

새 패키지 의존성·별도 큐 인프라·운영 공급자 계정을 추가하지 않았다. 기존 미커밋/미추적 사용자 파일을 보존했으며 전체 git diff는 이번 Phase의 변경 통계로 취급하지 않는다. 커밋·브랜치 변경·운영 배포는 하지 않았다.

## 5. 검증 결과와 증거

[테스트 체크리스트](phase5-test-checklist.md)에 실제 명령, 종료 코드, 초기 실패/수정과 재검증을 기록했다. [검증 요약](evidence/phase5/verification.txt)과 [모바일 상태 화면](evidence/phase5/job-mobile.png)을 보존한다.

| 검증 | 최종 결과 |
| --- | --- |
| P5-T01 계약 | 6종 input/output, 불법 전이·버전·필드·큰 UTF-8 JSON 거절, hash canonicalization PASS |
| P5-T02 획득·복구 | 단일 획득, 사용자 동시 상한, 잘못된/만료 token 완료 거절, heartbeat, 실제 SIGKILL 전/후 dispatch·SIGTERM·deadline rollback PASS |
| P5-T03 멱등·공급자 | 동시 멱등 요청 1건, 새 retry 최대 2회·단일 child, 불명 자동 재호출 0건, 취소 후 업무 반영 0건, 늦은 usage 보존 PASS |
| P5-T04 API·화면 | 소유권/Origin/strict DTO, 대기·시간당 한도, 실제 polling·새로고침·오류 재조회/자동 복구, ko/en 취소 구분 PASS |
| P5-T05 정리·부모 | 프로젝트/세션 보관·정지·탈퇴 후 반영 0건, 만료 capability/업로드 batch 정리·재실행 안전, 물리 파일 유지 PASS |
| 자동 전체 | 최종 unit/i18n/integration 14 files / 94 PASS, 16.46초 |
| Chromium | 기존 회귀 24 PASS + 수정 후 jobs 3 PASS, 총 고유 27 PASS. 최초 전체 26 PASS/1 FAIL 및 후속 재검증 경과를 체크리스트에 보존 |
| 정적·빌드 | typecheck/tsc, lint, production web/worker build, compose config, diff --check 통과 |
| Docker smoke 4개 | worker 최초 health, SIGTERM exit 0·heartbeat 제거, worker 재시작 health, DB 중단 시 unhealthy→재시작 후 worker/web 복구 |

초기 언어팩 flat-key 형식과 test worker CJS 실행 오류를 수정했다. SIGTERM과 완료 경합은 실제 구현 결함으로 확인하여 transaction 내 abort 검사로 해결했다. 브라우저 오류 검증은 Next route announcer를 잘못 포함한 전역 alert selector를 작업 region으로 제한했다. 실패하거나 실행하지 않은 항목을 PASS로 합산하지 않았다.

## 6. 완료 게이트

| 조건 | 판정 |
| --- | --- |
| 동시 worker·중단/재시작·중복 요청 | 충족 |
| 응답 불명·취소·새 retry·비용 상태 추적 | 충족 |
| 권한·상한·파일 보존·부모 결과 반영 가드 | 충족 |
| 필수 검증 및 기본 검사 | 충족: 필수 5 PASS, 자동 고유 121 PASS, smoke 4 PASS |
| 계획 차이·변경·실행 증거·이월 기록 | 충족 |
| MD/HTML·체크리스트·링크/본문 검증 | 충족: 문서 검증 3 PASS |
| Phase 6 기술 선행 조건 | 인수 가능, Phase 5 개발 범위의 미해결 차단 없음 |

## 7. 한계·후속 작업

- 실제 생성·가이드 추출·검증·추천·탐지·ZIP 엔진과 공급자별 비용/취소/멱등성/결과 재조회는 Phase 7~10 범위다. synthetic adapter 통과를 공급자 품질 통과로 간주하지 않는다.
- 외부 호출과 DB는 원자적이지 않다. exactly-once 과금 보장을 주장하지 않는다. 응답 불명은 운영 확인 전 자동 재실행하지 않는다.
- 계정/파일/작업/감사/백업 영구 삭제·보존 기간은 미확정이며 비활성이다. cleanup_pending 축적량과 파일 용량을 운영 활성화 전에 관찰·정책 확정해야 한다.
- worker 하나는 한 번에 하나의 job을 실행한다. 다중 worker에서 사용자당 최대 2개를 강제한다. 대규모 부하·RPO/RTO·외부 백업 복원·TLS는 Phase 11에서 검증한다.
- 관리자 목록·취소·재시도·감사·추가 인증은 Phase 6에서 구현한다. 현재 소유자용 서비스에 임의 사용자 session을 넣어 관리자 권한을 우회하지 않는다.

## 8. Phase 6 인수인계와 복구

[서버 연동 가이드](../HANDOFF.md), [운영/테스트 안내](../scripts/README.md), [Phase 6 계획](phase6-plan.md)을 따른다. 0003 migration을 먼저 적용하고 같은 버전의 web/worker를 배포한다. handler는 dispatch/파일 예약을 IO 전에 commit하고 apply에는 DB 변경만 둔다. 정책은 lib/server/jobs/policy.ts가 원본이다.

관리자 화면은 상태·retry chain·cancelRequested·costState·안전 오류를 활용한다. 내부 provider ID·사용량은 추가 인증/관리자 권한·감사 경계 안에서만 조회한다. PROVIDER_UNKNOWN은 일반 retry 대상이 아니다. 새 공급자의 재조회/정산 정책 없이 수동으로 status를 queued로 바꾸지 않는다.

되돌릴 때는 신규 등록·worker 획득을 먼저 중지하고 lease/dispatch/공급자 상태를 확인한다. additive 컬럼과 이력은 보존하며 호환 이미지로 복원한다. 데이터가 있는 DB에 파괴적 down migration이나 볼륨 제거를 하지 않는다.

## 9. 마무리 기록

합성 users/projects/jobs/storage_tickets가 모두 0건임을 확인했다. 테스트 fixture 파일·sandbox 메일·요청 제한 레코드와 private 실패 trace 정리를 수행하고 테스트 컨테이너를 중지했다. 합성 rate 레코드 82개·파일 6개·메일 33개를 정리했다. DB/파일 named volume·migration·이미지는 보존한다. 이 정리는 격리 테스트 fixture만 대상으로 하며 제품의 물리 삭제 기능을 활성화하지 않는다.

Markdown 원문에서 외부 CDN·런타임 JavaScript 없는 standalone HTML을 생성했다. 문서 검증 3/3 PASS: Markdown 로컬 링크 31개, HTML 표 5개·링크 6개와 태그 구조, MD/HTML 렌더링 본문·완료 수치 일치를 확인했다. 반응형·인쇄 CSS를 포함한다. 재현 명령은 `python3 md/evidence/phase5/verify-docs.py --render`다.
