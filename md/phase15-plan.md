# Phase 15 상세 개발 플랜 — 모니터링 근거·오탐 신고/철회

## 1. 기본 정보

| 항목 | 값 |
| --- | --- |
| 번호/제목 | 15 / 모니터링 근거·오탐 신고/철회 |
| 계획 상태 | **APPROVED / Phase Round2 계획 승인** |
| 실행 상태 | **IN_PROGRESS / B 승인승계·Phase14 로컬 COMPLETED·구현 담당 coder** |
| 작성일 | 2026-10-01 |
| 예상 기간 | 3~4 작업일,1명 순차 구현 최초 추정·검토/환경/외부 승인 대기 제외 |
| 담당 | planner 계획,coder 구현·검증,reviewer 독립 리뷰,root 보고·조정 |
| source trace | [roadmap §6](feat_plan/phase-roadmap.md)의 해당 Phase 행;원본 full SHA는 branch-analysis T01~T34 |
| Git 단위 | stage4 PR=Phase15,integrate/feat-1-4 기준;포팅 trailer/drift/revert는 roadmap §5 |

## 2. 배경과 목표

실제 scan 결과의 근거와 사용자 판단을 구분하고 신고/철회를 영속 보존한다. 승인된 기능 범위만 실행 단위로 분할하며 [통합계획](feat_plan/integration-plan.md) 기술 기본값을 유지한다.

## 3. 입력 자료와 이전 Phase 인수인계

[전체계획](development-plan.md),[진행규칙](phase-development-process-rules.md),[승인 feat_plan](feat_plan/README.md),[통합계약](feat_plan/integration-plan.md),[커밋근거](feat_plan/branch-analysis.md),[로드맵](feat_plan/phase-roadmap.md),[이전 Phase14 plan](phase14-plan.md),[HANDOFF](../HANDOFF.md),[DB](../db/README.md),[실행서](../scripts/README.md)를 입력으로 삼는다.

Phase14 완료/필수 PASS와 Phase12 locale/Phase13 원자원장/owner guard 패턴,기존 Phase10 monitoring 계약이 선행이다. 이전 공급자/품질 BLOCKED도 유지한다.

착수 시 `phase14-test-checklist.md`/`phase14-result.md`/`phase14-result.html`의 상태·이월·완료 리뷰를 확인한다. 기본은 predecessor COMPLETED + 기술 필수 PASS + 인계 완료다. 계획 작성 당시 predecessor 미완료로 실행 BLOCKED였다. 현재 Phase14 local COMPLETED 선행 및 B 승인승계는 §16의 실제 기록을 따른다. [roadmap §2.1의 A/B 결정안](feat_plan/phase-roadmap.md)을 권한 있는 사용자가 선택해야 하며 **계획 작성 당시 실제 예외 승인이 없었다; 현재 승인승계는 §16 참조**. B가 명시 승인되면 해당 기술 범위의 COMPLETED·보고/완료 리뷰·인계를 후속 Phase 조건으로 사용하고 Phase11 전체 IN_PROGRESS/외부 BLOCKED는 별도로 유지한다. 계획 승인만으로 착수하지 않는다.

## 4. 현재 상태 조사

고정 backend `b4749eb851c6cfef28f207adfca5f3f1ee942f66`;#4 tip `84f6be15dc96882b6e9dee77010074d4a38c9b39`. refs/공통 기반/누적계보는 승인 README와 같다. 기존 분석을 재사용하며 실제 착수에 refs drift/status를 다시 확인한다.

monitoring 원본·jobs/scans·최근성공·nullable similarity·출처10/결과50 제한은 구현되어 있다. factors DTO/feedback 원장은 신규며 production 공급자는 미등록이다. 계획 원본 조사와 실제 실행 기록을 분리하고 §16~17에서 현재 구현/검증 인계를 기록한다. 이 문장의 PENDING/미실행은 계획 작성 당시 조사 상태다. 현재 실제 검증은 phase15-test-checklist.md와 phase15-result.md 참조; 외부 미준비 조건은 BLOCKED를 유지한다.

## 5. 구현 범위

T28~T30:선택적 bounded factors,참고80/90·확인필요/판단불가,안정result ID·신고/철회API/원장·상세아이콘/aria·카드여백 UX. 기능 대응/검증 책임은 roadmap의34행 표와 일치하며 해당 이식/기존충족/폐기 판정을 바꾸지 않는다.

## 6. 제외 범위

공통 제외 범위는 [roadmap §4](feat_plan/phase-roadmap.md)와 승인 통합계획 §7을 따른다. 이 Phase의 기술 작업은 실제 공급자/OAuth 연결, 운영 배포/ja 활성화, 외부 전송, 서버 PDF/문서 ZIP, 영구 삭제를 포함하지 않는다. 기술 범위와 외부 게이트를 구분하며 현재 실제 구현·검증 인계는 §17을 따른다.

## 7. 결정·가정·질문

path resultId=itemIndex0~49 및 실제output범위검사→server jobId:index;불변output/schemaVersion1·64KiB 유지;idempotencyKey+requestHash/owner+action+key·result직렬잠금;참고등급은침해판정/자동조치아님. 상세 계약과 승인 이유·변경영향은 통합계획 §2~3/§7을 참조한다. 추가 기술 대안을 임의 선택해 범위를 확장하지 않는다.

착수 결정은 [roadmap §2.1](feat_plan/phase-roadmap.md)의 A(Phase11 완료 대기)/B(명시 승인된 독립 로컬 기술 범위)와 이유·기간/위험·연쇄·재개 위치를 따른다. 계획 작성 당시 결정 전 실행 BLOCKED였으며 현재 실행은 §16의 사용자 B 승인승계를 따른다. 담당/격리 환경을 지정하고 권한 있는 사용자 결정 기록을 확보한 뒤 해당 Phase §8부터 재개한다. 외부 활성화 승인은 통합계획 §7에 따라 별도로 인계한다.

## 8. 작업 분해와 실행 순서

아래 순서는 착수 게이트 충족 뒤 수행한다. 구현자는 파일/API/DB 작업과 해당테스트를 소유하고 reviewer는 계획/완료판정을 독립검토한다. coordinator가 의존성·dispatch/결정 기록을 관리한다.

1. Phase14 인계와 monitoring 응답·과거output호환/범위를 확인한다.
2. optional근거 DTO·feedback schema/migration·owner/result guard·멱등/철회writer/API를 구현한다.
3. monitoring-workspace에bars/참고배지·null·상세아이콘/aria·카드UX를 이식한다.
4. M01/M02/L01과 replay·재탐지새job·503·늦은완료·2계정·저장재시작을 검증한다.

작업마다 포팅 SHA/T행·변경 파일·수용 시험·차이/이월을 기록한다. 체크리스트 실제시험→실패수정/재시험→같은사실의MD/HTML→reviewer완료게이트→다음 인계 순서를 생략하지 않는다.

## 9. 예상 파일/API/DB/화면 영향

변경: contracts/monitoring-result.ts·server/monitoring service/handler·domain/monitoring-workspace.tsx·messages3팩·tests.신규:feedback contract/service·app/api/monitoring-records/[id]/scans/[jobId]/results/[resultId]/feedback/route.ts·monitoring_feedback_events schema/migration/meta.삭제0.

POST/DELETE feedback(reason enum/idempotencyKey,철회는key본문),resultId0~49. feedback 원장+unique/hash/index 신규,과거jobs.output은불변·newkind 없음·운영seed 변경없음.신고는공급자학습/외부신고/점수변경을유발하지않음. 인프라는 기존 단일host web/worker/PostgreSQL/private shared uploads를 유지한다. migration은 새 SQL/meta/journal,빈 DB·0008복제/선행 Phase schema·재실행·구코드호환 검증;down/cascade물리삭제 금지. 운영seed/기존선호·게시본 보호는 공통규칙이다.

## 10. 테스트 계획

필수 feature ID: **L01/L03/M01/M02**. 의미는 통합계획 §5와 이 plan §11을 따른다. 단위·통합(권한/원자성/멱등)·production E2E·수동 UI 검증을 Phase 고유 항목에 적용한다. L01의 세 팩 동등성과 en 유지가 공통 필수다. 외부 공급자/원어민 승인 결과는 기술 시험 PASS와 구분한다.

환경은 [roadmap §4](feat_plan/phase-roadmap.md)의 Node22.22.0/pnpm10.34.5/Next16.3.3·전용 claps_test·sandbox 메일·private shared uploads·Chromium이다. APP_ORIGIN과 E2E_BASE_URL을 맞추고 web/worker에 같은 DB/파일을 주입한다. 아래 명령은 계획 작성 당시 후속 실행 예시다. 실제 검증은 55437의 새 claps_test_phase15·전용 포트3251~3253에서 수행했으며 아래 예시의 55433/3000은 사용하지 않았다. 현재 actual 명령/exit는 evidence/phase15/execution.jsonl 참조.

```bash
cd /mnt/f/claps-product
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test:unit
corepack pnpm test:i18n
corepack pnpm test:db:up
# DATABASE_URL도 아래 전용 DB로 주입한 격리환경에서 적용(운영DB금지)
DATABASE_URL=postgresql://claps_test:claps_test_local_only@127.0.0.1:55433/claps_test corepack pnpm db:migrate
DATABASE_URL=postgresql://claps_test:claps_test_local_only@127.0.0.1:55433/claps_test corepack pnpm db:seed
TEST_DATABASE_URL=postgresql://claps_test:claps_test_local_only@127.0.0.1:55433/claps_test corepack pnpm test:integration
corepack pnpm build
# 별도세션에서 위 DB/APP_ORIGIN/sandbox/shared uploads를 주입한 production web+worker 준비
TEST_DATABASE_URL=postgresql://claps_test:claps_test_local_only@127.0.0.1:55433/claps_test E2E_BASE_URL=http://127.0.0.1:3000 E2E_MAIL_DIR=/tmp/claps-phase15-mail corepack pnpm test:e2e
corepack pnpm worker:health
```

전체 E2E의 시험팩/worker 경쟁 방지와 합성 자료 정리는 [roadmap §4](feat_plan/phase-roadmap.md)를 따른다. 기존 테스트 PASS로 이번 Phase를 대신하지 않는다. 구현 전 설치 Next docs의 해당 server/client·route handler·typegen·testing·fonts 가이드를 확인한다.

## 11. 완료 조건

- resultId 0~49와 실제 output 범위, jobId:index 결정성, 참고 80/90 경계·null·과거 output 호환을 통과한다.
- 재전송 중복 0건, 다른 payload의 멱등 충돌·신고/철회 경쟁·재시작 영속성을 확인한다.
- 재탐지·503·늦은 완료에도 최근 성공을 유지하고 과거 output 변경은 0건이다.
- 빈/기존 DB migration·구 코드 호환과 L01/L03/M01/M02를 통과한다. 실제 공급자 품질이나 침해 판정은 승인하지 않는다.

공통 정량/보고 게이트는 [roadmap §3](feat_plan/phase-roadmap.md)을 적용한다. **승인된 기술 범위**의 필수 FAIL/BLOCKED/PENDING/skip 또는 테스트 0개 통과는 허용하지 않는다. 실제 체크리스트·동일 MD/HTML·완료 리뷰·인계를 갖춘 경우만 해당 범위 COMPLETED로 판정한다. 계획 작성 당시 모든 시험은 미실행이었으며 실제 결과는 §17과 결과/체크리스트를 따른다.

## 12. 위험과 대응

참고 등급/목업 근거를 침해 판정으로 오인하거나 새 scan의 신고를 URL로 합칠 위험이 있다. 참고 문구, null 처리, job:index와 별도 feedback 원장으로 차단한다. 공통 착수/범위 변경 통제는 [roadmap §2~3](feat_plan/phase-roadmap.md)을 따른다.

## 13. rollback/복구

feedback 신규 write를 제한하고 신고 이력·불변 jobs.output을 보존한다. 추가 원장 호환 확인 후 stage4 PR을 revert하거나 forward-fix한다. 공통 PR revert·DB down 금지·같은 정지점 DB+uploads 백업/빈 환경 복구는 [roadmap §5](feat_plan/phase-roadmap.md)을 따른다.

## 14. 결과 증거와 다음 Phase 인수인계

미래 산출물은 `md/phase15-test-checklist.md`(구현 후 시험 전),`md/phase15-result.md`/`md/phase15-result.html`(실제 시험 후),`md/evidence/phase15/`다. 명령/exit code·고유 시험 수·최초 실패/재시험·Phase별 고유 증거를 남긴다. 개인정보 제거·동일 MD/단일 HTML·완료 리뷰 규칙은 [roadmap §3](feat_plan/phase-roadmap.md)을 따른다. 이 지시는 계획 작성 단계에만 적용했으며 실제 검증 결과/체크리스트를 이번 coder 인계에서 생성했다.

factors/ID/feedback계약·migration/멱등/권한증거·참고문구/아이콘UX·공급자503/미평가목록을 Phase16/17에 넘긴다. 후속착수에는이plan과미래체크리스트/MD/HTML/완료review를전달하고미해결 차단을감추지않는다.

## 15. 변경 이력

| 날짜 | 변경 | 근거/상태 |
| --- | --- | --- |
| 2026-10-01 | 승인통합 stage4를Phase15 실행계획으로분할 | 사용자후속요청·규칙§6.2/§13;DRAFT/reviewer계획검토전,구현/시험미실행·predecessor gate BLOCKED |
| 2026-10-01 | Phase 리뷰 Round1 PM1/PM2·Minor6 반영 | REVISED / 재검토 대기; 실행 BLOCKED·착수 결정 미승인, 기술 범위/외부 게이트 분리 |
| 2026-10-01 | [Phase Round2 계획 승인 반영](feat_plan/phase-review-round-2.md) | APPROVED·Major 0; 계획 승인은 착수 승인 아님, 실행 BLOCKED·예외 현재 미승인 유지 |

## 16. 실제 착수 기록 (2026-10-01)

사용자 직접 “12~17진행”, “전부권장안” 위임 및 이번 Phase15 지시, live task_2765022c33ec / ctx_5c05f62d28d0에 따라 phase12-plan §16의 roadmap B 독립 로컬 기술 승인승계를 적용한다. §3/7의 미승인/BLOCKED는 계획 작성 당시 기록이며 현재 승인을 대체하지 않는다. Phase14 local COMPLETED/288unique PASS/9closed와 실제 두 세션 clear 확인을 사용자·root가 완료했다. Phase11 전체 IN_PROGRESS/외부 BLOCKED 유지. 실행 담당 coder; root 보고·조정, reviewer 독립 검토→same coder fix→local closure는 이후 절차다. 실제 대상 /mnt/f/claps-product; Phase16/clear 자동 진행 금지. 전용 DB claps_test_phase15(55437), own web3251/격리 uploads/mail/sandbox/release 사용; 기존 포트/DB/fixture 보존. 원본 T28~T30 범위 확장0, commit/push/PR/deploy/실공급자/운영ja0.

## 17. 최초 구현·검증·독립 검토 인계 (역사 기록)

최초 인계 당시 실행 IN_PROGRESS / REVIEW_READY. T28~T30 원본 계획 전체 범위 구현, 상세 source/SHA/파일은 [source trace](evidence/phase15/source-trace.md), [결과 MD](phase15-result.md)/[동일 HTML](phase15-result.html), [실제 체크리스트](phase15-test-checklist.md), [handoff](phase15-handoff.md) 참조. 새migration0012/optional bounded factors/실제append-only feedback/신고·철회/세팩/모바일 카드·상세icon 구현. 원본 범위 확장0. 응답 유실·빠른재클릭도 action 상태가 전환되기 전 같은idempotencyKey를 유지한다. 직접200% UI검수에 따라 모바일p2/desktopp3, URL만break-all·기타break-words로 조정했다.

고유자동suite 307 PASS(unit64/integration168/i18n9/productionE2E65/demo1), 신규19(4/10/5). 별도migration5경로+fixedoldAuth/실제두재시작은 별도 meaningful검증 PASS이며suite수중복추가0. 최초FAIL/재시험/최종빌드별범위는 결과의 실제출처를 따른다. 독립 reviewer APPROVED/Phase COMPLETED 주장0; reviewer검토→samecoderfix→localclosure→root관리clear는 이후 예정이다. Phase16/clear 자동착수0, Phase11전체IN_PROGRESS/외부BLOCKED 유지.


## 18. Samecoder review fixclosure — EXECUTED

2026-10-01 새 live task_77e6f02cf8a5 / ctx_67c2216408be. 원본 [review CR C0/M1/m1/n5](phase15-review.md)는 불변 보존했다. 사용자 1review→samecoder fixclosure 위임을 root가 새TASK에 적용해, blocking+선택nit 수정/PASS/조건인계 시 localCOMPLETED를 허가했다. 직접 사용자 인용 날조0/독립 APPROVED 주장0. §17의 REVIEW_READY/307은 최초 인계의 역사 기록이며 현재 결과는 localCOMPLETED/314고유PASS다.

M1 baseSequence 결속키와 실제두탭A/B+response/reload race+다른reason, m1 안전prefix/localDB guard와 명시 unusedclones/mapping, n1 소수1자리/rawgrade유지, n2 label전환·aria-pressed 제거/live 상태, n4 authfirst/strictquery/HEAD405Allowprivate-no-store/boundedJSONCSRF를 EXECUTED로 반영했다. CLOSED5/기술필수미해결0; n3규모/rate 및 n5운영role은 **미구현·미충족인 nonblocking Phase17조건인계2**로 남기며 코드수정 claim0. [조건 담당·재개 위치](evidence/phase15/fixes/phase17-conditions.md).

고유314PASS(unit67/integration168/i18n9/production69/demo1), fix신규7/Phase15신규26. full첫68PASS1FAIL→raw Buffer HTTP복구1PASS, 최종3pack build 관련9/demo1/실제2restart PASS. 반복PASS추가0/최종build전체69실행claim0. 실행/최초실패/환경/원본보존/빌드별범위는 [결과](phase15-result.md)/[동일HTML](phase15-result.html)/[체크리스트](phase15-test-checklist.md)/[수정표](phase15-review-fixes.md)/[handoff](phase15-handoff.md) 및 [ledger](evidence/phase15/fixes/execution.jsonl). 0012/기존SQL/meta/seed/refs/0~14 및 원본reviewevidence 불변. 새ownfixDB55437/ports3271~3273/internaldeps/4519 offlinebuilder/networknone, ja false/enGBSHAcleanup/ownprocexit. Phase12exit139 미확정 유지. Phase11전체IN_PROGRESS/외부BLOCKED; Phase16/clear는root만/coder실행0.
