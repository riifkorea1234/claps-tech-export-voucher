# Phase 8 결과 — 독립 서버·다운로드

상태: **IN_PROGRESS — 승인된 독립 범위 완료, 실제 공급자 포함 전체 Phase는 보류.**
작업일: 2026-09-23. 담당: Codex 단독. Phase 7은 PAUSED 유지.

## 목표와 범위 판정

사용자가 “실제 공급자는 보류하고 Phase 8 서버·다운로드부터 구현”을 승인했다. [상세 계획](phase8-plan.md) 16절에 순차 게이트 예외·기본값을 기록한 후 구현했다. 임시 가이드 UI의 고정 규칙은 서버 검증 근거로 사용하지 않는다. 실제 provider 선정/과금 호출/생성 품질 평가는 수행하지 않았다.

| 범위 | 결과 |
| --- | --- |
| 검증 API·snapshot·adapter 계약·근거 저장 | 완료, 테스트 전용 provider로 검증 |
| 서버 최종 확정/취소·가이드/버전/동시성 검사 | 완료 |
| 라이브러리/커버/집계·단일 다운로드·선택 ZIP | 완료, production 웹/worker로 검증 |
| 실제 공급자·Phase 7 생성→검증 품질/전체 E2E | 보류, 전체 COMPLETED 판정 불가 |

## 구현과 주요 결정

검증 요청은 채택된 같은 세션의 에셋 1~10개와 active 게시 가이드만 받는다. 서버가 규칙·가이드 버전·에셋 version snapshot을 저장하고, 외부 요청 직전 dispatch 기록 및 완료 전 snapshot 재검사를 적용한다. adapter는 모든 에셋/규칙의 판정·이유·근거와 엔진 버전을 반환해야 한다. 누락·중복·부분 응답은 실패하며, pass/warn/reject/unknown을 저장한다. legacy fail/review 계약도 읽을 수 있으나 통과로 취급하지 않는다.

운영 registry는 실제 ZIP handler만 추가했다. 검증 provider는 미등록이며 API가 SERVICE_UNAVAILABLE(503)을 반환한다. 테스트 adapter 자동 선택이나 공개 성공 fixture API는 없다.

최종 확정은 채택·현재 에셋 version·최신 active 게시 가이드·성공한 검증 job·동일한 서버 근거·모든 규칙 pass·진행 중 검증 없음이 필수다. version이 같은 상태 반복은 no-op, stale 동시 요청은 409다. 과거 최종본은 당시 근거를 유지한다. 취소는 원본·검증 job을 보존하고 에셋 지정 커버를 해제하며, 재확정에는 재검증이 필요하다. 기존 서버 라이브러리/커버/집계는 동일한 assets 상태를 읽는다.

ZIP은 동일 프로젝트의 최종본 1~50개, 원본당 10MiB·합계 100MiB다. worker에서 ASCII 에셋 ID 파일명으로 무압축 ZIP32를 만들고 실제 CRC/원본 checksum을 검사한다. IO 전 파일 ledger를 commit하며, 완료와 다운로드 때 소유권·계정/부모·최종 version을 재검사한다. 중단된 시도는 기존 큐의 lease/retry 정책을 사용하고 늦은 결과는 게시하지 않는다. 결과는 24시간, 발급 ticket은 5분 유효하다. 최종 취소·보관·정지·만료 후 기존 ticket도 거절한다.

ZIP 파일을 포함한 물리 파일은 기존 보존 정책대로 삭제하지 않는다. 만료 접근 차단·기존 정리 ledger/ticket 정리만 수행한다. worker의 ZIP buffer는 합계 상한 내에서 메모리를 사용하므로 작업당 약 200MiB 이상 여유 메모리가 필요하다.

## API와 화면

| Endpoint | 계약 |
| --- | --- |
| POST /api/asset-sessions/:id/verifications | assetIds, guideId, outputLocale, idempotencyKey → 202 job 또는 미연결 503 |
| GET /api/assets/:id/verification | verification/currentGuideId/stale/canFinalize |
| PUT/DELETE /api/assets/:id/finalization | version → 확정/취소 결과 |
| POST /api/exports | assetIds, outputLocale, idempotencyKey → 202 job |
| GET /api/exports/:jobId | 현재 상태 재검사 후 downloadUrl/expiresAt |
| GET /api/files/:token | 단일 attachment는 최종본만, ZIP은 완료·만료·snapshot 재검사 |

검증/최종 페이지에 서버 판정·규칙 근거·과거 가이드 표시·확정/취소를 연결했다. 최종 페이지는 최종 시각순이며, 최종 페이지와 프로젝트 라이브러리에서 ZIP 항목을 선택한다. `/jobs/:id` 성공 화면에서 실제 ZIP을 다운로드한다. ko/en 문구를 함께 추가했다. 공급자 미연결 안내를 표시하고 임의 점수는 사용하지 않는다.

## 변경 파일과 DB 영향

기존 미커밋/미추적 사용자 변경을 보존했다. 새 SQL migration/테이블/운영 seed/패키지 의존성/환경 secret은 없다. JSONB의 선택 필드를 확장했으며 이전 레코드를 임의로 통과 처리하지 않는다.

| 구분 | 파일 |
| --- | --- |
| 신규 계약/서버 | lib/contracts/{verification,exports}.ts; lib/server/verifications/{service,guards,handler,http}.ts; lib/server/finalizations/service.ts; lib/server/exports/{service,guards,handler,download,zip}.ts; lib/server/storage/{config,read-file}.ts |
| 신규 routes | app/api/asset-sessions/[id]/verifications/route.ts; app/api/assets/[id]/{verification,finalization}/route.ts; app/api/exports/route.ts; app/api/exports/[id]/route.ts |
| 신규 UI/테스트 | components/domain/{asset-verification,export-download}.tsx; tests/unit/phase8.test.ts; tests/integration/phase8.test.ts; tests/e2e/phase8.spec.ts; tests/helpers/phase8-worker.ts |
| 기존 파일 변경 | lib/contracts/metadata.ts; lib/server/adapters/registry.ts; lib/server/jobs/parents.ts; lib/server/storage/service.ts; lib/server/projects/http.ts; components/domain/{server-asset-gallery,asset-workspace-body,job-status-panel}.tsx; messages/{ko,en}/assets.json; tests/unit/jobs.test.ts |
| 문서/증거 | README.md; HANDOFF.md; scripts/README.md; md/development-plan.md; Phase 8 계획·체크리스트·결과 MD/HTML·모바일 캡처·문서 검사 스크립트 |

## 검증 결과

[테스트 체크리스트](phase8-test-checklist.md)에 실행 명령·환경·최초 실패와 재검사를 기록했다.

| 검사 | 최종 결과 |
| --- | --- |
| 단위 + i18n | 10 files, 38 PASS (단위 31 + i18n 7), 0 FAIL/skip |
| 전체 서버 통합 | 7 files, 94 PASS (신규 Phase 8 18 포함), 0 FAIL/skip |
| production Chromium | 3 files, 선택된 6 PASS (Phase 8 1 + jobs 3 + workspace 2), 0 FAIL/skip |
| 고유 자동 테스트 합계 | 20 files, 138 PASS, 0 FAIL/skip; 중복 실행 미합산 |
| typecheck / lint | exit 0, lint 오류 0 / 기존 경고 6 / 신규 경고 0 |
| production build | exit 0, 새 API 포함 route 생성 |
| 공백 / 문서 | git diff --check exit 0; 로컬 링크·독립 HTML·MD/HTML 동일 본문 검사 |

최초 typecheck/build에서 테스트 helper의 UUID 기본 인수 타입과 선택적 snapshot 좁히기 오류를 발견해 수정했다. 최초 동시 실행한 전체 회귀는 worker 프로세스 시작 20초 timeout 3개로 실패했다. worker 불필요 저장소 import를 분리하고 빌드와 분리 재실행하여 기존 timeout 값 그대로 94개 모두 통과했다. 호스트 파일 시스템의 느린 시작 영향과 구분하며, 실패를 성공으로 집계하지 않았다. 테스트 worker helper도 async main 실행 형태로 보완하고 별도 worker 컨테이너 없이 Chromium 1개를 재검증했다. 이 중복 성공은 138개 합계에 추가하지 않았다.

ZIP은 Python zipfile로 독립 해제·CRC·항목명을 검증했다. 브라우저는 synthetic 검증 근거를 격리 DB에 준비한 뒤 실제 production 웹/worker에서 단일 이미지·ZIP 다운로드와 취소 후 409를 확인했다. [390px 모바일 캡처](evidence/phase8/final-mobile.png)를 직접 열어 버튼·근거 영역을 확인했다. 사람의 별도 직접 클릭 평가는 수행하지 않았다.

## 완료 조건과 남은 작업

| 조건 | 판정 |
| --- | --- |
| 미검증/반려/unknown/타인/구버전 확정 차단 | PASS |
| 동시성·취소·늦은 결과·가이드 변경·증거 보존 | PASS |
| 실제 단일/ZIP·checksum·타인/만료·worker 복구 | PASS |
| 서버 상태 기반 UI·ko/en·모바일 | PASS |
| 원본/과거 파일 참조 보존 | PASS |
| 실제 생성부터 검증/최종까지 품질 평가 | BLOCKED — 사용자 승인 보류 |
| 전체 Phase 8 COMPLETED | 미충족; 독립 승인 범위만 완료 |

다음 실연동 시 Phase 7의 영속 게시 가이드·실제 생성 에셋을 연결하고 검증 provider/모델/예산·품질 평가를 확정해야 한다. 원래 전체 P8-T01/T03/T05의 실공급자 부분은 미실행이다. Phase 9 전체 착수 가능으로 자동 판정하지 않는다. [서버 인수인계](../HANDOFF.md)와 [실행 안내](../scripts/README.md)에 API·제한·복구·보존 계약을 기록했다.

최종 환경 정리: 격리 users/projects/jobs/storage_tickets 0건을 확인했고 테스트 web/worker/DB를 중지한다. 임시 sandbox 파일을 정리하며 DB volume·migration·빌드 이미지는 보존한다.
