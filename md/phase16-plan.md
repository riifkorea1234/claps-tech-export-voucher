# Phase 16 상세 개발 플랜 — 일본어 감수 패키지·불변 snapshot

## 1. 기본 정보

| 항목 | 값 |
| --- | --- |
| 번호/제목 | 16 / 일본어 감수 패키지·불변 snapshot |
| 계획 상태 | **APPROVED / Phase Round2 계획 승인** |
| 실행 상태 | **localCOMPLETED / EXECUTED·samecoder 수정5·필수미해결0·조건인계총3** |
| 작성일 | 2026-10-01 |
| 예상 기간 | 3~5 작업일,1명 순차 구현 최초 추정·검토/환경/외부 승인 대기 제외 |
| 담당 | coder Codex 구현·검증, 기존 reviewer 독립 리뷰, root coordinator 인계 |
| source trace | [roadmap §6](feat_plan/phase-roadmap.md)의 해당 Phase 행;원본 full SHA는 branch-analysis T01~T34 |
| Git 단위 | stage5 PR=Phase16,integrate/feat-1-4 기준;포팅 trailer/drift/revert는 roadmap §5 |

## 2. 배경과 목표

최종본·증빙·검증과수동확인을일본어제출준비/인쇄자료로일관되게묶는다. 승인된 기능 범위만 실행 단위로 분할하며 [통합계획](feat_plan/integration-plan.md) 기술 기본값을 유지한다.

## 3. 입력 자료와 이전 Phase 인수인계

[전체계획](development-plan.md),[진행규칙](phase-development-process-rules.md),[승인 feat_plan](feat_plan/README.md),[통합계약](feat_plan/integration-plan.md),[커밋근거](feat_plan/branch-analysis.md),[로드맵](feat_plan/phase-roadmap.md),[이전 Phase15 plan](phase15-plan.md),[HANDOFF](../HANDOFF.md),[DB](../db/README.md),[실행서](../scripts/README.md)를 입력으로 삼는다.

Phase15 완료,Phase13 증빙/certificate와 Phase14 UI/폰트,기존최종본/guide가드,3팩은선행이다.현재이전 Phase결과가없어실행대기다.

착수 시 `phase15-test-checklist.md`/`phase15-result.md`/`phase15-result.html`의 상태·이월·완료 리뷰를 확인한다. 기본은 predecessor COMPLETED + 기술 필수 PASS + 인계 완료다. 현재 predecessor가 미완료여서 실행 BLOCKED다. [roadmap §2.1의 A/B 결정안](feat_plan/phase-roadmap.md)을 권한 있는 사용자가 선택해야 하며 **현재 실제 예외 승인은 없다**. B가 명시 승인되면 해당 기술 범위의 COMPLETED·보고/완료 리뷰·인계를 후속 Phase 조건으로 사용하고 Phase11 전체 IN_PROGRESS/외부 BLOCKED는 별도로 유지한다. 계획 승인만으로 착수하지 않는다.

## 4. 현재 상태 조사

고정 backend `b4749eb851c6cfef28f207adfca5f3f1ee942f66`;#4 tip `84f6be15dc96882b6e9dee77010074d4a38c9b39`. refs/공통 기반/누적계보는 승인 README와 같다. 기존 분석을 재사용하며 실제 착수에 refs drift/status를 다시 확인한다.

원본 #4의check/print는localStorage이며backend export는이미지ZIP만처리한다.체크/readiness/불변snapshot 서버기능은신규다. 이번 문서는 새 구현이나 시험 성공을 기록하지 않는다. 현재 관련 테스트는 **PENDING/미실행**,외부 미준비 조건은 BLOCKED다.

## 5. 구현 범위

T31~T32:세수동항목영속·자동항목읽기전용/조치안내,대상asset/guide/job/cutoff기준stale,동기발급manifest·ja링크/고정인쇄·기발급조회. 기능 대응/검증 책임은 roadmap의34행 표와 일치하며 해당 이식/기존충족/폐기 판정을 바꾸지 않는다.

## 6. 제외 범위

공통 제외 범위는 [roadmap §4](feat_plan/phase-roadmap.md)와 승인 통합계획 §7을 따른다. 이 Phase의 기술 작업은 실제 공급자/OAuth 연결, 운영 배포/ja 활성화, 외부 전송, 서버 PDF/문서 ZIP, 영구 삭제를 포함하지 않는다. 기술 범위와 외부 게이트를 구분하며 현재 구현은 미착수다.

## 7. 결정·가정·질문

owner인가는locale무관·출력ja고정·진입링크jaUI만;발급은DB동기API로newjobkind없음;자동true PATCH거절·unknown/warn/미연결통과금지;보관/삭제snapshot metadata읽기와신규발급/파일차단. 상세 계약과 승인 이유·변경영향은 통합계획 §2~3/§7을 참조한다. 추가 기술 대안을 임의 선택해 범위를 확장하지 않는다.

착수 결정은 [roadmap §2.1](feat_plan/phase-roadmap.md)의 A(Phase11 완료 대기)/B(명시 승인된 독립 로컬 기술 범위)와 이유·기간/위험·연쇄·재개 위치를 따른다. 결정 전 실행 BLOCKED다. 담당/격리 환경을 지정하고 권한 있는 사용자 결정 기록을 확보한 뒤 해당 Phase §8부터 재개한다. 외부 활성화 승인은 통합계획 §7에 따라 별도로 인계한다.

## 8. 작업 분해와 실행 순서

아래 순서는 착수 게이트 충족 뒤 수행한다. 구현자는 파일/API/DB 작업과 해당테스트를 소유하고 reviewer는 계획/완료판정을 독립검토한다. coordinator가 의존성·dispatch/결정 기록을 관리한다.

1. Phase15 및 evidence/finalization 인계를확인하고check대상hash·readiness재검사계약을고정한다.
2. review_checks/review_package_snapshots migration·GET/PATCH/POST·snapshotowner read가드를구현한다.
3. readiness/version재검사동기발급·불변manifest를연결하고ja페이지/verify/final링크·print를이식한다.
4. R01/R02/L01로stale/자동조작/경쟁·비ja직접URL·보관·타owner·인쇄를검증한다.운영ja는여전히비활성이다.

작업마다 포팅 SHA/T행·변경 파일·수용 시험·차이/이월을 기록한다. 체크리스트 실제시험→실패수정/재시험→같은사실의MD/HTML→reviewer완료게이트→다음 인계 순서를 생략하지 않는다.

## 9. 예상 파일/API/DB/화면 영향

신규:review contracts/server service·review_checks/review_package_snapshots migration/meta,asset-sessions/[id]/review-checks·review-package·snapshots/[snapshotId] APIroutes,assets/[id]/review-package serverpage/content.변경:verify/final page-content·messages3팩·privatefile참조검사·tests.삭제0.

GET/PATCH review-checks,GET readiness/POST review-package발급,GET snapshots/:snapshotId.동기DBmanifest/checksum/actor/version/cutoff·NO ACTION/ownerguard,export 이미지ZIP유지·jobs_kind CHECK불변;운영seed 없음. 인프라는 기존 단일host web/worker/PostgreSQL/private shared uploads를 유지한다. migration은 새 SQL/meta/journal,빈 DB·0008복제/선행 Phase schema·재실행·구코드호환 검증;down/cascade물리삭제 금지. 운영seed/기존선호·게시본 보호는 공통규칙이다.

## 10. 테스트 계획

필수 feature ID: **L01/R01/R02**. 의미는 통합계획 §5와 이 plan §11을 따른다. 단위·통합(권한/원자성/멱등)·production E2E·수동 UI 검증을 Phase 고유 항목에 적용한다. L01의 세 팩 동등성과 en 유지가 공통 필수다. 외부 공급자/원어민 승인 결과는 기술 시험 PASS와 구분한다.

환경은 [roadmap §4](feat_plan/phase-roadmap.md)의 Node22.22.0/pnpm10.34.5/Next16.3.3·전용 claps_test·sandbox 메일·private shared uploads·Chromium이다. APP_ORIGIN과 E2E_BASE_URL을 맞추고 web/worker에 같은 DB/파일을 주입한다. 아래 명령은 **후속 실행용이며 지금 모두 미실행**이다.

```bash
# 독립 /tmp/claps-phase16-sandbox에서 실행, source구현은 /mnt/f/claps-product.
# TEST_DATABASE_URL은 이미 검증된 own claps_test_phase16(127.0.0.1:55437)을 private env로 주입한다.
# 기존 compose test DB/사용자55433·55436/3193을 시작·수정하지 않는다.
cd /tmp/claps-phase16-sandbox
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test:unit
corepack pnpm test:i18n
DATABASE_URL="$TEST_DATABASE_URL" corepack pnpm db:migrate
DATABASE_URL="$TEST_DATABASE_URL" corepack pnpm db:seed
corepack pnpm test:integration
# fixed4519 offlinebuilder --network none 안에서 pnpm build.
# build 종료 후 새 immutable standalone release/flat public/messages를 검증한다.
# own APP_ORIGIN/E2E_BASE_URL=http://127.0.0.1:3281, shared private uploads/mail/DB 주입 후 actual production web+worker.
corepack pnpm test:e2e
corepack pnpm worker:health
```

전체 E2E의 시험팩/worker 경쟁 방지와 합성 자료 정리는 [roadmap §4](feat_plan/phase-roadmap.md)를 따른다. 기존 테스트 PASS로 이번 Phase를 대신하지 않는다. 구현 전 설치 Next docs의 해당 server/client·route handler·typegen·testing·fonts 가이드를 확인한다.

## 11. 완료 조건

- 수동 3항목 영속, 기준 변경 stale, 자동 항목 조작 거절을 통과한다.
- 발급 경쟁 conflict·manifest 불변·재발급 별도 ID, owner/보관 조회와 신규 발급 차단을 통과한다.
- ja 링크·비ja 직접 URL의 owner 인가·고정 ja 인쇄와 L01/R01/R02를 통과한다.
- 빈/기존 DB migration·구 코드 호환을 확인한다. 실전송/심사 workflow와 운영 ja 활성화는 0건이다.

공통 정량/보고 게이트는 [roadmap §3](feat_plan/phase-roadmap.md)을 적용한다. **승인된 기술 범위**의 필수 FAIL/BLOCKED/PENDING/skip 또는 테스트 0개 통과는 허용하지 않는다. 실제 체크리스트·동일 MD/HTML·완료 리뷰·인계를 갖춘 경우만 해당 범위 COMPLETED로 판정한다. 현재 모든 시험은 미실행이다.

## 12. 위험과 대응

체크를 영구 승인으로 오인하거나 발급 중 기준이 바뀔 수 있다. 대상 hash/version 재검사, 불변 snapshot, owner 인가와 출력 locale 분리로 차단한다. 법적 효력은 외부 검수다. 공통 착수/범위 변경 통제는 [roadmap §2~3](feat_plan/phase-roadmap.md)을 따른다.

## 13. rollback/복구

새 체크/발급 write를 제한하고 기발급 snapshot은 보존한다. 추가 schema 호환 확인 후 stage5 PR을 revert하며 기존 이미지 export는 유지한다. 공통 PR revert·DB down 금지·같은 정지점 DB+uploads 백업/빈 환경 복구는 [roadmap §5](feat_plan/phase-roadmap.md)을 따른다.

## 14. 결과 증거와 다음 Phase 인수인계

미래 산출물은 `md/phase16-test-checklist.md`(구현 후 시험 전),`md/phase16-result.md`/`md/phase16-result.html`(실제 시험 후),`md/evidence/phase16/`다. 명령/exit code·고유 시험 수·최초 실패/재시험·Phase별 고유 증거를 남긴다. 개인정보 제거·동일 MD/단일 HTML·완료 리뷰 규칙은 [roadmap §3](feat_plan/phase-roadmap.md)을 따른다. 지금 결과/체크리스트를 생성하지 않는다.

check/readiness/snapshot DTO·migration/읽기권한·print/ja동선·R01/R02증거·미승인외부조건을Phase17에넘긴다. 후속착수에는이plan과미래체크리스트/MD/HTML/완료review를전달하고미해결 차단을감추지않는다.

## 15. 변경 이력

| 날짜 | 변경 | 근거/상태 |
| --- | --- | --- |
| 2026-10-01 | 승인통합 stage5를Phase16 실행계획으로분할 | 사용자후속요청·규칙§6.2/§13;DRAFT/reviewer계획검토전,구현/시험미실행·predecessor gate BLOCKED |
| 2026-10-01 | Phase 리뷰 Round1 PM1/PM2·Minor6 반영 | REVISED / 재검토 대기; 실행 BLOCKED·착수 결정 미승인, 기술 범위/외부 게이트 분리 |
| 2026-10-01 | [Phase Round2 계획 승인 반영](feat_plan/phase-review-round-2.md) | APPROVED·Major 0; 계획 승인은 착수 승인 아님, 실행 BLOCKED·예외 현재 미승인 유지 |

## 16. 실제 착수 기록 — 2026-10-01

Live task_95c6719b10fc / ctx_903fabbd1466, 실제 /mnt/f/claps-product. Phase15 localCOMPLETED·고유314PASS·CLOSED5·기술필수미해결0·조건인계2 확인. Phase12-plan §16에 기록된 사용자 실행 지시/질문 권장안 위임에 따른 roadmap B 독립 로컬 기술 승인(Phase12~17 기간)을 승계한다. 직접 사용자 발언을 새로 만들어 인용하지 않는다. §3/§7의 미승인/선행미완료는 계획 작성 당시 이력이며 이 기록이 대체한다.

담당 coder Codex, 기존 reviewer 독립검토→samecoder 수정 closure는 root 후속 dispatch. 현재 REVIEW_READY / IN_PROGRESS까지. Phase11 전체 IN_PROGRESS/외부 BLOCKED 유지. n3 원장 규모/rate 정책, n5 운영 owner/app role 분리는 미구현·미충족 그대로 Phase17 조건인계2 유지. Phase17/clear 자동 착수0.

권장 계약: owner locale 무관/ja 고정 출력/ja verify·final 링크만, 자동 읽기 전용, target hash+check version CAS, 동기 발급/멱등key/발급시 check version 소비로 경쟁409, append-only snapshot. owner→session→project→guide 잠금으로 asset 상태/version/checksum·guide 규칙/version/checksum·검증job/output·evidence cutoff·session/project version을 기준에 포함. 재확인은 actor/time/check version에 연결한다. 수신자 확인 변경은 해당 수동 체크를 해제하고 재확인한다. 새jobkind/PDF/문서ZIP/seed/운영preference변경0.

독립 /tmp/claps-phase16-sandbox internal physical deps·Node22.22.0/pnpm10.34.5/Next16.3.3, fixed4519 offlineimage/networknone, 새 claps_test_phase16 및 unused clones·own3281~3283/uploads/mail만. 기존문서/코드/증거/SQL/meta/seed/refs baseline SHA 보존 후 승인 코드와 신규 migration만 변경. 기존 사용자 프로세스/DB 보존. Phase12 nativeexit139 원인미확정 유지.

## 17. 현재 coder 결과 — REVIEW_READY / IN_PROGRESS

실제 T31/T32/L01/R01/R02 구현과 로컬필수검증을 마쳤다. 고유346PASS(unit70/integration191/i18n9/production75/demo1), Phase16 신규32(3/23/6), 반복 고유중복0. lint/typegen/tsc/fixed4519networknonebuild/6migration경로+fixedoldAuth/최종3팩feature23·E2E6·demo1·실제2restart/직접UIinspect PASS. 최종allsoftdeleted metadataOnly 차단과 snapshot-only 파일참조를 보강했으며 최종build에서전체75를재실행했다고주장하지않는다. 현재 독립review/samecoderclosure PENDING이며 APPROVED/COMPLETED 판정0.

[결과MD](phase16-result.md)/[동일HTML](phase16-result.html)/[체크리스트](phase16-test-checklist.md)/[인계](phase16-handoff.md)/[source trace](evidence/phase16/source-trace.md)/[actualledger](evidence/phase16/execution.jsonl). Phase15조건인계2 미구현·미충족 유지, Phase11전체IN_PROGRESS/외부BLOCKED, Phase17/clear자동착수0. DB/사용자프로세스/기존증거/refs는보존하고운영ja/seed/기존preference변경0. 상세실패와빌드별범위는결과를따른다.

## 18. samecoder 수정·로컬종료 — 2026-10-01

Live task_34c11baa35b4 / ctx_6f38125dfd5d 새 rootTASK가 사용자12~17 실행·질문전부권장안 위임 및 1review→samecoderfix→phaseclose에 따라 local closure를 허가했다. Phase15 localCOMPLETED314PASS 선행과 B승계 유지, 직접사용자발언 새인용0. 원본독립review CHANGES_REQUESTED C0/M0/m2/n4는보존한다. 현 m1/m2/n1/n3/n4 mitigation 수정5/필수미해결0/현n2+선행2 총조건3으로 localCOMPLETED / EXECUTED 종료, 독립APPROVED날조0. §16~17 REVIEW_READY는최초구현시점 이력이다.

누적350고유PASS=최초346+신규integration2+production2, 현재재시험280(70/193/9/8)·최종lint/typecheck/build/migration6경로/legacyfixedAuth/3PDFdirectinspect·보존감사 PASS. 전체75/demo/실제2restart는이전근거이며현재재실행주장0. cursor더보기미구현은root권장좁은mitigation CLOSED, n2readiness비용은Phase17조건1이며선행2와묶어총3미구현·미충족 유지. [수정표](phase16-review-fixes.md)/[결과](phase16-result.md)/[동일HTML](phase16-result.html)/[체크리스트](phase16-test-checklist.md)/[인계](phase16-handoff.md)/[조건3](evidence/phase16/fixes/phase17-conditions.md). Phase11전체IN_PROGRESS/외부BLOCKED, Phase17/clear root관리·자동시작0.
