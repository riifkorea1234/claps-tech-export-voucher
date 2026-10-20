# Phase13 테스트 체크리스트

## 1. 상태·환경

2026-10-01(KST), **COMPLETED / plan EXECUTED**. 독립 기존 reviewer CHANGES_REQUESTED 후 9건 수정·재검증·인계를 완료했다. 기존 §2~4는 최초 coder 검증 역사이며 최신 gate는 §7이다. Phase11 전체 IN_PROGRESS/외부 출시 BLOCKED 유지. 최초 시험 전 체크리스트는 [불변 사본](evidence/phase13/checklist-before-tests.md), [원본 실행 ledger](evidence/phase13/execution-ledger.md)·[명령/exit JSONL](evidence/phase13/execution.jsonl)에 최초 실패와 재시험을 모두 기록했다.

고정 WSL Linux Node22.22.0/pnpm10.34.5/Next16.3.3/PostgreSQL17.11/Chromium. isolated55437의 새 claps_test_phase13 및 별도 claps_test_demo13, private uploads/sandbox mail, 새 immutable release. integration은 production worker/E2E 정지 후 실행, demo는 별도 DB/origin/uploads로 순차 실행. 사용자3193/55433/55436 및 기존 Phase12 DB는 미수정.

## 2. 필수 검증

| ID | 필수 | 분류·대상 | 실제 명령/절차 | 기대·실제 최종 결과 | 상태 |
| --- | --- | --- | --- | --- | --- |
| E01-U | 예 | strict/UTF8 64KiB/cursor/위조 필드 | pnpm test:unit | 신규4 포함55 PASS/0 FAIL/0 SKIP, unit.log exit0 | PASS |
| E01-I | 예 | transaction/replay/batch/권한/legacy/worker actor | pnpm test:integration | 신규16 포함142 PASS/0 FAIL/0 SKIP, integration-actor-final.log exit0 | PASS |
| E01-M | 예 | additive migration·구코드 | scripts/phase13-migration-check.ts | empty/0008 clone/Phase12 latest clone apply+replay, 기존행 보존/backfill0, fixed b4749eb actual AuthService read/profile/logout PASS, migration.log exit0 | PASS |
| E01-E | 예 | production GET/browser/permission/POST405 | production-check.py + pnpm test:e2e | 신규2 포함전체51 PASS/0 FAIL/0 SKIP, production-e2e-retry-final.log exit0 | PASS |
| E01-R | 예 | 실제 두 process restart·영속성 | runtime-restarts.py | 증빙4/동일 certificate digest/native generation/selection1 및 native Sharp, runtime-3pack-final.log exit0 | PASS |
| E01-F | 예 | 원장 INSERT 중deadline·원자성 | integration 고유 실패주입 | 0.2s INSERT 지연/0.1s deadline, assets/event/job성공 모두 rollback, 고유142에 포함 | PASS |
| E01-G | 예 | 보관·삭제 read vs files/write | integration/E2E 두 owner·정지 | owner metadata 허용, 기존 file/write guard 차단; 타owner404/정지401/미인증401 | PASS |
| L01 | 예 | ko/en/ja 전체팩/en 유지 | pnpm test:i18n + 기존 UI regression | 3팩 각13namespace/1080키 parity, i18n9 PASS/0 FAIL/0 SKIP, i18n-release-final.log exit0 | PASS |
| BASE-S | 예 | lint/typegen/tsc | pnpm lint/typecheck | exit0; lint 기존2warnings/0errors, lint/typecheck-report-final.log | PASS |
| BASE-B | 예 | network-none production | docker start -a claps-phase13-offline | source/locked Linux deps, 최종3팩build exit0, build-final-3pack.log | PASS |
| BASE-D | 예 | 기존 sample regression | 별도 demo-check.py/playwright.demo.config.ts | fresh claps_test_demo13, 실제 web+worker, 1 PASS/0 FAIL/0 SKIP, demo-final.log exit0 | PASS |
| HEALTH | 예 | 실제 production worker | worker-health.mjs | E2E 중 health exit0, 종료 worker0/web143, user ports 미수정 | PASS |
| CLEAN | 예 | 합성파일·시험팩 안전 정리 | SHA manifest/cleanup-packs.py | 자신의PNG 파일집합/hash 확인, en-GB13팩 hash 확인 후 제거, source/release 최종3팩, 기존자료 삭제0 | PASS |
| PRESERVE | 예 | 원본문서/refs/migration prefix | validate-preservation.py | 보호330파일hash불변, HEAD+6refs불변, journal10prefix+new1; 기존source358보존/변경은Phase13코드·테스트만 | PASS |
| REPORT | 예 | 동일MD/HTML·링크·privacy | render-report.py | 같은 원본에서 HTML 생성, 사실/수치/실패/이월 일치, 단일HTML/외부CDN·JS0 | PASS |

## 3. 고유 시험·비적용

자동 framework 고유 **258 = unit55 + integration142 + i18n9 + productionE2E51 + demo1**. Phase13 새 framework **22 = unit4 + integration16 + E2E2**. 반복/script/manual/migration/runtime checks는 고유수에 합산하지 않는다. 필수 skip0/0개suite0/최종 FAIL0. 신규 UI/print/PDF는 Phase14 이후 범위라 Phase13 수동 신규화면 검사는 NOT_APPLICABLE; production 실제 브라우저 cookie fetch와 기존 전체UI/390px/200%/3locale E2E는 수행했다.

## 4. 실패·재시험

- typecheck 최초 exit2: UUID template literal key 추론 → string 명시 후 exit0.
- 첫 integration136 PASS/4 FAIL: 새table/timestamp count 갱신, syntheticworker ID공백 제거, 정지 기존 UNAUTHORIZED 기대 유지. verification fixture 저장키 규약 실패를 실제 handler에서 진단(13/1 두번)하고 UUID-original 및 checksum-valid PNG로 교정 → 전체140 PASS.
- 자체점검으로 최종 clock fence 앞으로 원장write 이동 및 immutable resultCount 사용 → 새deadline 실패주입 포함141 PASS. auto retry worker/admin actor 분리 및 hash cleanup → 최종142 PASS.
- production 최초51 PASS 및 fence 보완 뒤51 PASS. actor 최종 최초43 PASS/8 FAIL은 같은fresh DB를15분내반복한 합성IP auth limit429. 정책 변경0, 자기DB의고정9action hash manifest의 실제8행만만료 → 새immutable retry release 전체51 PASS. 실패trace는 /tmp private 보존, 실패로그 삭제0.
- 최종3팩 offlinebuild 및 두재시작 PASS. 기존 Phase12의실제exit139는원인미확정이며이번PASS가원인규명이나외부native품질승인은아니다.

## 5. 외부·완료 게이트

독립 reviewer 원본 CHANGES_REQUESTED 보존 후 사용자 종료 권한에 따른9건 수정·재검증·인계를 완료하여 로컬 기술 COMPLETED/EXECUTED다. 독립 APPROVED를 주장하지 않는다. Phase11 전체/외부출시, 실공급자/과금/법무/RPO·RTO/보존, ja 원어민·제품 용어/OAuth/운영ja는 외부 BLOCKED 유지. 다음 Phase·clear·commit/push/PR·실송신·영구삭제 수행0.

## 6. 독립 review 후 수정 재검증 계획 (시험 실행 전·진행 중)

현재 후속 task_c6ea3540df87/ctx_9288c5d87b4e는 m1~m5/n1~n4 해결 및 기술 종료 권한을 갖는다. 새 DB claps_test_fix13, 별도 fresh demo/migration DB, 새 immutable release를 사용한다. 수정 영향으로 unit/integration/production HTTP·전체 E2E/정적 검증·migration·3팩 build/restart를 재시험한다. i18n/demo는 공통 필수로 한 번 최종 실행한다. 결과는 fixes/execution.jsonl에 실패까지 보존하고 중복 PASS는 고유 수에 합산하지 않는다. 경계 ±1B/실제 INVALID_RESULT, admin queued/running cancel/retry/PII, user running cancel, regex cleanup, TRUNCATE, HTTP 숫자·중복키·auth-first·HEAD/Allow/no-store, native birth selection·legacy stale 일치가 추가 수용 기준이다.

## 7. 후속 수정 최종 gate

[9finding 변경·시험·정책](phase13-review-fixes.md), [최종 결과](phase13-result.md), [수정 원본명령/exit](evidence/phase13/fixes/execution.jsonl). 미해결0/9·기술차단0. Unit56, integration157(기존126+최신31,관련Phase8 18재시험), i18n9, productionE2E52, demo1의 고유275/Phase13새39/skip0/최종FAIL0. static-final/lint-stale-final·migration·build-3pack-final·runtime-3pack·preservation·report-validation 전부PASS. DBjsonb경계±1B 및실제provider/queueINVALID_RESULT, adminqueued/runningcancel/retry/PII·usercancel/autoRetry, freshregexfixturecleanup, TRUNCATE, HTTP중복키/decimal/auth-first/HEAD/Allow/no-store, nativebirthselection/legacyguidestale양쪽일치PASS. 기존snapshot/fencing/file/write가드회귀PASS. 독립review→수정/실제재검증/동일MDHTML/인계충족으로사용자권한내Phase13로컬기술종료. Phase11전체IN_PROGRESS/외부BLOCKED·Phase17운영role분리·B예외·금지범위유지.
