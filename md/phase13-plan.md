# Phase 13 상세 개발 플랜 — 증빙 서버·사건 원장

## 1. 기본 정보

| 항목 | 값 |
| --- | --- |
| 번호/제목 | 13 / 증빙 서버·사건 원장 |
| 계획 상태 | **APPROVED / Phase Round2 계획 승인** |
| 실행 상태 | **EXECUTED / Phase13 로컬 기술 COMPLETED — 독립 review 후 9건 수정·재검증·인계 완료** |
| 작성일 | 2026-10-01 |
| 예상 기간 | 3~5 작업일,1명 순차 구현 최초 추정·검토/환경/외부 승인 대기 제외 |
| 담당 | 기존 Codex coder 구현, 기존 Claude reviewer 독립 리뷰, coordinator 보고/dispatch |
| source trace | [roadmap §6](feat_plan/phase-roadmap.md)의 해당 Phase 행;원본 full SHA는 branch-analysis T01~T34 |
| Git 단위 | stage2 PR=Phase13,integrate/feat-1-4 기준;포팅 trailer/drift/revert는 roadmap §5 |

## 2. 배경과 목표

생성/인간선택/검증/최종본 사건과 provenance를 재시작에도 유지하는 원자적 서버 증빙으로 만든다. 승인된 기능 범위만 실행 단위로 분할하며 [통합계획](feat_plan/integration-plan.md) 기술 기본값을 유지한다.

## 3. 입력 자료와 이전 Phase 인수인계

[전체계획](development-plan.md),[진행규칙](phase-development-process-rules.md),[승인 feat_plan](feat_plan/README.md),[통합계약](feat_plan/integration-plan.md),[커밋근거](feat_plan/branch-analysis.md),[로드맵](feat_plan/phase-roadmap.md),[이전 Phase12 plan](phase12-plan.md),[HANDOFF](../HANDOFF.md),[DB](../db/README.md),[실행서](../scripts/README.md)를 입력으로 삼는다.

Phase12의3팩/성명 migration·backend 보존·검증/인계 자료가 선행 입력이다. Phase12는 독립 로컬 기술 범위 COMPLETED/236 PASS/11 finding 해결과 인계를 마쳤으며 두 기존 세션 clear 후 이번 live dispatch로 착수한다.

착수 시 `phase12-test-checklist.md`/`phase12-result.md`/`phase12-result.html`의 상태·이월·완료 리뷰를 확인한다. 기본은 predecessor COMPLETED + 기술 필수 PASS + 인계 완료다. 실제 predecessor 기술 게이트는 충족되었다. [roadmap §2.1의 A/B 결정안](feat_plan/phase-roadmap.md)을 권한 있는 사용자가 선택해야 하며 **사용자의 B 예외 승인은 phase12-plan §16에 기록되어 Phase17 로컬 기술 인계까지 유효하다**. B가 명시 승인되면 해당 기술 범위의 COMPLETED·보고/완료 리뷰·인계를 후속 Phase 조건으로 사용하고 Phase11 전체 IN_PROGRESS/외부 BLOCKED는 별도로 유지한다. 계획 승인만으로 착수하지 않는다.

## 4. 현재 상태 조사

고정 backend `b4749eb851c6cfef28f207adfca5f3f1ee942f66`;#4 tip `84f6be15dc96882b6e9dee77010074d4a38c9b39`. refs/공통 기반/누적계보는 승인 README와 같다. 기존 분석을 재사용하며 실제 착수에 refs drift/status를 다시 확인한다.

sessions/assets/jobs/brand_guides와 finalization/verification snapshot 가드는 존재한다. append-only 원장과 evidence/certificate API는 이번 Phase13에서 구현했다. 최종기술고유275 PASS/새39, 상세 실제시험과실패는 phase13-result/checklist/evidence를 따른다. 독립 reviewer CHANGES_REQUESTED 후 9건 수정·재검증·인계를 완료했다. 최종 고유275/새39, 원본 review 불변·외부 BLOCKED 유지.

## 5. 구현 범위

T19/T20/T26: evidence_events·원자적 업무writer·generate 요청/성공/실패/취소·채택/해제·검증·최종본/취소·asset.deleted·certificate 집계/읽기 API와 legacy-derived 구분. 기능 대응/검증 책임은 roadmap의34행 표와 일치하며 해당 이식/기존충족/폐기 판정을 바꾸지 않는다.

## 6. 제외 범위

공통 제외 범위는 [roadmap §4](feat_plan/phase-roadmap.md)와 승인 통합계획 §7을 따른다. 이 Phase의 기술 작업은 실제 공급자/OAuth 연결, 운영 배포/ja 활성화, 외부 전송, 서버 PDF/문서 ZIP, 영구 삭제를 포함하지 않는다. 기술 범위와 외부 게이트를 구분하며 이번 구현은 로컬 기술 범위에 한정한다.

## 7. 결정·가정·질문

서버 actor/시각/순번·job+kind dedupe, jobs.input 참조로 prompt복제0, asset별 generation_job provenance·guide id/version/checksum,별도 owner metadata read guard로 보관/삭제읽기 허용·파일/write차단. 로컬증빙 자동수입 없음. 상세 계약과 승인 이유·변경영향은 통합계획 §2~3/§7을 참조한다. 추가 기술 대안을 임의 선택해 범위를 확장하지 않는다.

착수 결정은 [roadmap §2.1](feat_plan/phase-roadmap.md)의 A(Phase11 완료 대기)/B(명시 승인된 독립 로컬 기술 범위)와 이유·기간/위험·연쇄·재개 위치를 따른다. 이번 live TASK가 Phase13 구현·검증·REVIEW_READY 보고를 승인했다. 담당/격리 환경을 지정하고 권한 있는 사용자 결정 기록을 확보한 뒤 해당 Phase §8부터 재개한다. 외부 활성화 승인은 통합계획 §7에 따라 별도로 인계한다.

## 8. 작업 분해와 실행 순서

아래 순서는 착수 게이트 충족 뒤 수행한다. 구현자는 파일/API/DB 작업과 해당테스트를 소유하고 reviewer는 계획/완료판정을 독립검토한다. coordinator가 의존성·dispatch/결정 기록을 관리한다.

1. Phase12 인계·원본T19/T20/T26·guard 잠금순서를 확인하고 evidence strict 계약/조회 cursor를 고정한다.
2. evidence_events schema+새 migration/meta를 작성하고 빈/0008 복제 DB와 최신 Phase12 schema에서 적용·재실행/구코드호환을 검증한다.
3. 기존 업무 transaction/worker apply에 사건writer를 넣고 rollback·replay·늦은완료/보관·삭제를 검사한다.
4. GET evidence/certificate 집계·읽기 권한을 구현하고 두계정/정지·legacy·배치혼합 E01을 실행한다.

작업마다 포팅 SHA/T행·변경 파일·수용 시험·차이/이월을 기록한다. 체크리스트 실제시험→실패수정/재시험→같은사실의MD/HTML→reviewer완료게이트→다음 인계 순서를 생략하지 않는다.

## 9. 예상 파일/API/DB/화면 영향

신규: lib/contracts/evidence.ts·lib/server/evidence 서비스/집계·evidence_events migration/meta·app/api/asset-sessions/[id]/evidence/route.ts·app/api/assets/[id]/certificate/route.ts·lib/api/evidence client(명칭제안). 변경: db/schema.ts·server/projects/service·verifications/handler·finalizations/service·jobs/적용writer·messages3팩/테스트. 삭제0.

GET /api/asset-sessions/:id/evidence, GET /api/assets/:id/certificate. 사건을 UI가 임의작성하는 공개POST 없음. evidence_events FK/unique/index/64KiB strict payload,기존 NO ACTION 및 jobs_schema_version=1 유지;운영seed 증빙 backfill 없음. 인프라는 기존 단일host web/worker/PostgreSQL/private shared uploads를 유지한다. migration은 새 SQL/meta/journal,빈 DB·0008복제/선행 Phase schema·재실행·구코드호환 검증;down/cascade물리삭제 금지. 운영seed/기존선호·게시본 보호는 공통규칙이다.

## 10. 테스트 계획

필수 feature ID: **L01/E01**. 의미는 통합계획 §5와 이 plan §11을 따른다. 단위·통합(권한/원자성/멱등)·production E2E·수동 UI 검증을 Phase 고유 항목에 적용한다. L01의 세 팩 동등성과 en 유지가 공통 필수다. 외부 공급자/원어민 승인 결과는 기술 시험 PASS와 구분한다.

환경은 [roadmap §4](feat_plan/phase-roadmap.md)의 Node22.22.0/pnpm10.34.5/Next16.3.3·전용 claps_test·sandbox 메일·private shared uploads·Chromium이다. APP_ORIGIN과 E2E_BASE_URL을 맞추고 web/worker에 같은 DB/파일을 주입한다. 실제 실행은 고정 Linux sandbox 및 private TEST_DATABASE_URL 환경에서 수행했다. 원본 명령/exit는 evidence/phase13/execution.jsonl에 있다.

```bash
cd /tmp/claps-phase13-sandbox
export PATH=/home/arcreation/.nvm/versions/node/v22.22.0/bin:$PATH
# private TEST_DATABASE_URL: isolated55437 / claps_test_phase13
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test:unit
corepack pnpm test:i18n
corepack pnpm test:integration
# 새DB 이름이 필요한 재현은 보존DB drop 없이 별도 fixture 환경 준비
node --conditions=react-server --import tsx scripts/phase13-migration-check.ts
# offline container/source snapshot → 새immutable standalone release
# 실제 production/web/worker/E2E와 demo 명령은 execution.jsonl/handoff 참조
```

전체 E2E의 시험팩/worker 경쟁 방지와 합성 자료 정리는 [roadmap §4](feat_plan/phase-roadmap.md)를 따른다. 기존 테스트 PASS로 이번 Phase를 대신하지 않는다. 구현 전 설치 Next docs의 해당 server/client·route handler·typegen·testing·fonts 가이드를 확인한다.

## 11. 완료 조건

- 업무 변경과 사건 write가 한 transaction에서 rollback되며 worker replay 중복 사건 0건을 확인한다.
- 타 owner/정지 계정 읽기를 거절하고 보관/삭제 metadata 읽기·파일/write 차단을 통과한다.
- 다른 batch 조건 혼합과 모르는 과거 행동 생성은 0건, legacy-derived/미기록 표시가 정확하다.
- 빈/기존 DB migration·구 코드 호환·재시작 영속성과 L01/E01을 통과한다.

공통 정량/보고 게이트는 [roadmap §3](feat_plan/phase-roadmap.md)을 적용한다. **승인된 기술 범위**의 필수 FAIL/BLOCKED/PENDING/skip 또는 테스트 0개 통과는 허용하지 않는다. 실제 체크리스트·동일 MD/HTML·완료 리뷰·인계를 갖춘 경우만 해당 범위 COMPLETED로 판정한다. 기술 필수시험 모두 PASS 및 독립 review→후속9건 수정·재검증·인계 gate를 충족했다. 사용자 최신 live TASK의 종료 권한으로 Phase13 로컬 기술만 COMPLETED/EXECUTED다.

## 12. 위험과 대응

클릭만으로 생성 성공을 기록하거나 다른 batch 조건을 합치는 위험이 있다. 성공 apply와 같은 transaction, job/kind dedupe, asset generation_job 연결 및 실패 주입을 검증한다. 공통 착수/범위 변경 통제는 [roadmap §2~3](feat_plan/phase-roadmap.md)을 따른다.

## 13. rollback/복구

새 사건 writer를 제한하고 원장·jobs·provenance를 보존한다. 추가 테이블이 남은 구 코드 호환을 확인한 뒤 stage2 PR을 revert하거나 forward-fix한다. 공통 PR revert·DB down 금지·같은 정지점 DB+uploads 백업/빈 환경 복구는 [roadmap §5](feat_plan/phase-roadmap.md)을 따른다.

## 14. 결과 증거와 다음 Phase 인수인계

미래 산출물은 `md/phase13-test-checklist.md`(구현 후 시험 전),`md/phase13-result.md`/`md/phase13-result.html`(실제 시험 후),`md/evidence/phase13/`다. 명령/exit code·고유 시험 수·최초 실패/재시험·Phase별 고유 증거를 남긴다. 개인정보 제거·동일 MD/단일 HTML·완료 리뷰 규칙은 [roadmap §3](feat_plan/phase-roadmap.md)을 따른다. 구현 후 시험 전에 체크리스트를 작성하고 실제 검증 결과를 보고한다.

원장schema/migration·사건코드/정렬/cursor·certificate DTO/API·권한/legacy정책·E01 증거·미연결503 제한을 Phase14에 넘긴다. 후속착수에는이plan과미래체크리스트/MD/HTML/완료review를전달하고미해결 차단을감추지않는다.

## 15. 변경 이력

| 날짜 | 변경 | 근거/상태 |
| --- | --- | --- |
| 2026-10-01 | 승인통합 stage2를Phase13 실행계획으로분할 | 사용자후속요청·규칙§6.2/§13;DRAFT/reviewer계획검토전,구현/시험미실행·predecessor gate BLOCKED |
| 2026-10-01 | Phase 리뷰 Round1 PM1/PM2·Minor6 반영 | REVISED / 재검토 대기; 실행 BLOCKED·착수 결정 미승인, 기술 범위/외부 게이트 분리 |
| 2026-10-01 | [Phase Round2 계획 승인 반영](feat_plan/phase-review-round-2.md) | APPROVED·Major 0; 계획 승인은 착수 승인 아님, 실행 BLOCKED·예외 현재 미승인 유지 |

## 16. 실제 착수 승인·환경·순서 (2026-10-01)

Task task_bebc7e44c944 / dispatch ctx_a8ef9c6a2c6f. 사용자 Phase13만 구현·검증·review-ready 지시, 모든 질문 권장안; phase12-plan §16 B 예외 계승. Phase11 전체 IN_PROGRESS/외부 출시 BLOCKED 유지. Phase 종료·후속 Phase·clear·commit/push/PR 권한 없음. 기존 작업 트리와 원본 review/계획/고정 refs는 baseline-hashes/status로 보존한다.

고정 WSL Linux Node22.22.0·pnpm10.34.5, Linux sandbox, isolated55437를 재사용하되 Phase13 전용 합성 DB를 생성한다. 사용자3193/55433/55436 미수정. integration은 외부 worker/web 정지 상태에서 순차 실행, production은 source/build 완료 후 새 immutable release로 실행한다. 기존 exit139 원인은 미확정으로 보존한다.

실행 순서: T19/T20/T26 및 설치 Next route/server guide 확인 → additive schema/migration → transaction writer/worker fencing → owner metadata guard/cursor/certificate → 체크리스트 → meaningful 고유/전체 regression·migration·offline build·production E2E → 동일 MD/HTML/인계 → 기존 reviewer 독립 검토 대기.

## 17. 구현·검증·review-ready 인계

2026-10-01 고유258 PASS(unit55/integration142/i18n9/productionE2E51/demo1), Phase13새22(unit4/integration16/E2E2), 필수skip0/0개suite0/최종FAIL0. actor attribution·원장INSERT시간까지lastclock fence·native resultCount 보완을같은범위에서검증했다. 최초typecheck/integration/E2E43/8(합성IP429)과교정은실행ledger에보존. 최종3팩networknonebuild와실제두restart증빙4/nativeSharpPASS, Phase12실제139원인미확정유지. 기존docs330/source358/고정refs/기존migrations보존. 결과MD/단일HTML/체크리스트/handoff/Ttrace로기존reviewer의독립검토를요청할준비가완료되었고현재 REVIEW_READY / IN_PROGRESS까지만판정한다. Phase11/외부BLOCKED·B예외·금지범위유지, 다음Phase/clear/commit/push/PR0.

## 18. 독립 review 후 9건 해결·기술 종료 권한

2026-10-01 사용자 최신 요청/task_c6ea3540df87/ctx_9288c5d87b4e는 기술 gate와 인계 충족 시 Phase13 종료를 명시 승인했다. 원본 Claude review는 CHANGES_REQUESTED C0/M0/Minor5/Nit4 그대로 보존한다. m1~m5+n1~n4 수정·검증·인계를 모두 완료했고 새 reviewer APPROVED를 만들지 않았다. 최종275PASS/새39/skip0/최종FAIL0, additive0011·빈/0008/Phase12/Phase13clone·oldAuth·±1B/INVALID_RESULT·actorPII/HTTP/stale·offline3팩/2restart·보존/동일보고 PASS. [9건 상세](phase13-review-fixes.md)와 [최종 결과](phase13-result.md)에 근거가 있다. 실행 상태 EXECUTED / 로컬 기술 COMPLETED이며 Phase11 전체 IN_PROGRESS/외부출시BLOCKED와B예외 유지, 운영role분리는Phase17외부선행조건이다. Phase14준비자료만인계/착수0·clear0·worker_done후대기한다. §16~17은 이전review-ready dispatch의 역사 기록이며 현재 권한/상태는 이 §18을 따른다.
