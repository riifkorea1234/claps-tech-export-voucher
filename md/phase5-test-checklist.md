# Phase 5 테스트 체크리스트

상태: COMPLETED, 2026-09-23. 필수 5 PASS, 자동 최종 고유 121 PASS, smoke 4 PASS. 초기 실패와 재실행은 아래에 보존한다.
환경: Node 22.22.0 / pnpm 10.34.5 / Next 16.3.3 / PostgreSQL 17.11, 격리 Compose claps-phase5-tests. 운영 공급자/실제 메일 없음.

| ID | 필수 | 분류·대상 | 명령/절차 | 기대 결과 | 실제 결과 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| P5-T01 | 필수 | 계약/단위 | tests/unit/jobs.test.ts | 종류/버전/크기/전이 검증 | 단위 jobs 4 및 기존 계약·언어팩 검사 통과 | PASS |
| P5-T02 | 필수 | worker 통합/장애 | tests/integration/jobs.test.ts | 동시 획득 1건, 강제 종료 복구, fencing | 동시 획득·실제 SIGKILL/SIGTERM·lease·deadline 통과 | PASS |
| P5-T03 | 필수 | 멱등·응답 불명·취소 | jobs 통합 suite | 재전송 중복 0, retry 연결, 불명 재호출 0 | 멱등/재시도/불명/취소·늦은 usage 통과 | PASS |
| P5-T04 | 필수 | API/화면/제한 | jobs integration 및 tests/e2e/jobs.spec.ts | 권한/한도/실제 polling·새로고침/오류 복구 | 서비스 상한·실제 HTTP/브라우저 jobs 3개 통과 | PASS |
| P5-T05 | 필수 | 정리/늦은 응답 | jobs 통합 suite | 부모 비활성 결과 0, 파일 유지·ledger 재실행 안전 | 부모 비활성 4종·파일 maintenance 재실행 통과 | PASS |
| 기본 | 필수 | lint/typecheck/build·회귀 | pnpm lint/typecheck/build/test:unit/test:i18n/test:integration/test:e2e | 기존 동작 보존, 신규 오류 0 | lint 0 errors/6 기존 warnings, typecheck/build 및 회귀 통과 | PASS |

## 적용 제외

- 실제 AI 공급자 품질/과금/취소·SLA: NOT_APPLICABLE, Phase 7~10. test adapter 장애 주입과 구분.
- 영구 파일/계정/감사/백업 삭제: NOT_APPLICABLE, 사용자 기존 보존 정책 유지 승인. 물리 삭제 비활성 검증은 필수.
- 관리자 작업 화면·공개 운영 추가 인증: NOT_APPLICABLE, Phase 6.
- 운영 TLS/ingress·대규모 부하·off-host 백업 복원: NOT_APPLICABLE, Phase 11.

## 실행 기록

실제 명령/종료 코드/성공·실패·skip 수 및 실패 수정 후 재검증을 아래에 기록한다.

### 실행 중 기록

- 첫 자동 전체 실행: 14 files / 92 tests, 85 PASS / 7 FAIL / 0 skip, exit 1. 신규 언어팩을 중첩 객체로 추가하여 기존 flat-key loader와 불일치(5 failures); child test worker top-level await가 CJS 실행과 불일치(2 failures). flat-key 및 async main으로 수정.
- 첫 Docker typecheck: exit 2. 테스트의 UUID default 인자 타입과 discriminated union spread 타입을 명시/재검증하여 해결.
- 두 번째 자동 실행: 14 files / 94 tests, 93 PASS / 1 FAIL / 0 skip, exit 1. SIGTERM과 handler 완료 경합에서 성공 확정되는 문제를 발견. 완료 transaction 내부에서 abort 상태를 검사하고 안전 실패/새 retry로 종결하도록 수정.
- 최종 자동 실행: `docker run --rm --network claps-phase5-tests_default -e TEST_DATABASE_URL=<isolated-test-db> claps-phase5-test pnpm exec vitest run --project unit --project i18n --project integration`, exit 0, **14 files / 94 PASS / 0 FAIL / 0 skip**, 16.46초. unit 28 + i18n 6 + integration 60 (job suite 21).
- 최종 타입/lint: Docker test `pnpm typecheck && pnpm lint`, exit 0. lint 0 errors / 6 기존 warnings, 신규 warning 0. 직접 tsc는 typecheck script에 포함.
- production build: `docker build --target web -t claps-phase5-web-final .`, exit 0. Next 16.3.3 compile·TypeScript·28 static page 생성 통과, runtime secret 없이 빌드. worker image build도 exit 0.
- migration/seed/locale activation: Docker test `pnpm db:migrate && pnpm db:seed && pnpm i18n:activate`, exit 0. migration replay와 seed 재실행 멱등성은 기존 database 통합 suite에서 통과.
- 첫 Chromium 전체: 5 files / 27 tests, 26 PASS / 1 FAIL, exit 1, 2.2분. polling이 자동 복구하여 오류 버튼이 사라진 뒤 테스트가 해당 버튼을 누르려던 순서 경합. 실패 상태에서 먼저 수동 재조회하고 이후 자동 복구를 검증하도록 테스트 순서 수정. 앱 코드는 변경하지 않음. 영향 jobs 3개 재검증 중.
- Docker worker 최초 health exit 0, SIGTERM stop exit 0 및 heartbeat 파일 제거 확인, restart 뒤 health exit 0. DB 중단/복구는 브라우저 실행 종료 후 확인한다.
- Compose config --quiet 및 git diff --check exit 0. 모바일 `/jobs/:id` ko 취소 상태 캡처를 도구로 직접 확인, 잘림/가로 overflow 없음.

- jobs E2E 첫 재검증: 2 PASS / 1 FAIL. 실제 상태는 Completed였지만 전역 alert 1개가 남아 실패했다. Next route announcer도 alert이므로 오류 검증 범위를 Job status region으로 제한했다. 첫 실행의 오류 감지도 같은 전역 selector로 너무 일찍 통과할 수 있었음을 확인했으며, 실제 패널 오류의 표시/해제를 검증하도록 수정한다.


## 최종 재검증 및 수치

- jobs Chromium 최종: `E2E_BASE_URL=http://127.0.0.1:3105 E2E_MAIL_DIR=/tmp/claps-phase5-mail TEST_DATABASE_URL=<isolated-test-db> corepack pnpm exec playwright test tests/e2e/jobs.spec.ts`, exit 0, **3 PASS / 0 FAIL / 0 skip**, 24.3초. 실제 Job status region의 오류 표시·재조회·자동 복구를 확인했다.
- 전체 고유 테스트 **19 files / 121 PASS / 0 FAIL / 0 skip**: 단위 28·i18n 6·통합 60·Chromium 27. Chromium은 기존 회귀 24 PASS와 최종 jobs 3 PASS를 합산했다. 최초 전체 실행의 jobs 2 PASS는 중복 합산하지 않는다.
- 마지막 production web build에는 수정된 worker 종료 fence 코드가 포함된다. E2E 최종 subset은 이 final web 이미지로 컨테이너를 교체한 뒤 실행했다.

## Docker smoke — 4 PASS

| Check | 실제 명령/절차 | 결과 |
| --- | --- | --- |
| 1 | 전용 worker image 실행 후 docker exec claps-phase5-worker pnpm worker:health | exit 0 |
| 2 | docker stop -t 20 claps-phase5-worker, inspect ExitCode 및 heartbeat 경로 확인 | exit 0, heartbeat 제거 |
| 3 | docker start claps-phase5-worker 후 worker:health | exit 0 |
| 4 | 전용 db-test stop 후 health, 다시 start 후 health·web /api/health | 중단 시 exit 1(기대), 복구 후 exit 0·status ok |

운영/다른 프로젝트 DB는 중단하지 않았다. synthetic job worker의 SIGKILL/SIGTERM은 통합 suite 21개에 포함하며 smoke 수에 중복 합산하지 않는다.

## 정리·완료 판정

격리 DB users/projects/jobs/storage_tickets/assets/sessions 모두 0건 확인. 합성 요청 제한 레코드 82개, 전용 uploads 파일 6개, sandbox 메일 33개 및 private 실패 trace를 정리했다. web/worker/db-test를 중지하고 named volume·migration·이미지는 보존했다. 제품의 물리 파일 삭제는 계속 비활성이다.

필수 5 PASS와 정적·빌드·회귀·smoke 검증으로 승인된 Phase 5 개발 범위의 완료 조건을 충족한다. [결과 보고서](phase5-result.md) · [HTML 보고서](phase5-result.html).

문서 최종 검증: `python3 md/evidence/phase5/verify-docs.py --render`, exit 0, 3 PASS. MD 로컬 링크 31개·HTML 표 5개/링크 6개·태그 구조·MD/HTML 본문 일치. 문서 검증은 제품 자동 테스트 121개와 별도로 집계한다.
