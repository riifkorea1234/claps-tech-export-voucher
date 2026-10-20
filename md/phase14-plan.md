# Phase 14 상세 개발 플랜 — 증빙 UI·타임라인·증명서

## 1. 기본 정보

| 항목 | 값 |
| --- | --- |
| 번호/제목 | 14 / 증빙 UI·타임라인·증명서 |
| 계획 상태 | **EXECUTED — Phase Round2 승인 계획 실행 완료** |
| 실행 상태 | **COMPLETED — 로컬 기술 범위 / 독립 CR 후 coder 9건 수정·재검증 종료** |
| 작성일 | 2026-10-01 |
| 예상 기간 | 2~3 작업일,1명 순차 구현 최초 추정·검토/환경/외부 승인 대기 제외 |
| 담당 | 기존 Codex coder 구현,기존 Claude reviewer 독립 리뷰,root coordinator 보고/인계 |
| source trace | [roadmap §6](feat_plan/phase-roadmap.md)의 해당 Phase 행;원본 full SHA는 branch-analysis T01~T34 |
| Git 단위 | stage3 PR=Phase14,integrate/feat-1-4 기준;포팅 trailer/drift/revert는 roadmap §5 |

## 2. 배경과 목표

서버 증빙을 생성화면 표시·이력/접기·증명서·인쇄에서 이해하고 재확인할 수 있게 한다. 승인된 기능 범위만 실행 단위로 분할하며 [통합계획](feat_plan/integration-plan.md) 기술 기본값을 유지한다.

## 3. 입력 자료와 이전 Phase 인수인계

[전체계획](development-plan.md),[진행규칙](phase-development-process-rules.md),[승인 feat_plan](feat_plan/README.md),[통합계약](feat_plan/integration-plan.md),[커밋근거](feat_plan/branch-analysis.md),[로드맵](feat_plan/phase-roadmap.md),[이전 Phase13 plan](phase13-plan.md),[HANDOFF](../HANDOFF.md),[DB](../db/README.md),[실행서](../scripts/README.md)를 입력으로 삼는다.

Phase13 완료 원장/API/certificate DTO·접근정책·legacy 처리와 Phase12 L01/폰트가 선행이다. Phase13 로컬 기술 COMPLETED/275 PASS/9 finding 해결 및 인계를 root가 확인했고 두 기존 세션 /clear 확인 후 live dispatch로 착수한다.

착수 시 `phase13-test-checklist.md`/`phase13-result.md`/`phase13-result.html`의 상태·이월·완료 리뷰를 확인한다. 기본은 predecessor COMPLETED + 기술 필수 PASS + 인계 완료다. 실제 predecessor 기술 완료·검증·인계 게이트는 충족되었다. [roadmap §2.1의 A/B 결정안](feat_plan/phase-roadmap.md)을 권한 있는 사용자가 선택해야 하며 **phase12-plan §16 사용자 B 승인이 Phase17 기술 인계까지 유효하다**. B가 명시 승인되면 해당 기술 범위의 COMPLETED·보고/완료 리뷰·인계를 후속 Phase 조건으로 사용하고 Phase11 전체 IN_PROGRESS/외부 BLOCKED는 별도로 유지한다. 계획 승인만으로 착수하지 않는다.

## 4. 현재 상태 조사

고정 backend `b4749eb851c6cfef28f207adfca5f3f1ee942f66`;#4 tip `84f6be15dc96882b6e9dee77010074d4a38c9b39`. refs/공통 기반/누적계보는 승인 README와 같다. 기존 분석을 재사용하며 실제 착수에 refs drift/status를 다시 확인한다.

원본 #2의 badge/timeline/certificate/인쇄는 localStorage에 의존한다. backend page wrapper/API client를 기준으로 Phase13 서버조회에 다시 연결해야 한다. 착수 baseline을 확보했다. 구현 및 시험 결과는 Phase14 고유 산출물에 기록하며 외부 미준비 조건은 BLOCKED 유지다.

## 5. 구현 범위

T21/T23/T24/T25 및 T26 UI 대응:생성badge 기록중/오류,타임라인cursor·연속사건접기/펼치기,asset별증명서,evidence 인쇄·final화면 링크. 기능 대응/검증 책임은 roadmap의34행 표와 일치하며 해당 이식/기존충족/폐기 판정을 바꾸지 않는다.

## 6. 제외 범위

공통 제외 범위는 [roadmap §4](feat_plan/phase-roadmap.md)와 승인 통합계획 §7을 따른다. 이 Phase의 기술 작업은 실제 공급자/OAuth 연결, 운영 배포/ja 활성화, 외부 전송, 서버 PDF/문서 ZIP, 영구 삭제를 포함하지 않는다. 기술 범위와 외부 게이트를 구분하며 실제 구현은 이번 live dispatch의 로컬 기술 범위다.

## 7. 결정·가정·질문

read API만 사용하고 localStorage addEntry 호출 이식금지;pass/warn/reject/unknown/stale 및미기록표시 유지;서버page/Promise params+client component 경계;공개print에prompt자동노출0. 상세 계약과 승인 이유·변경영향은 통합계획 §2~3/§7을 참조한다. 추가 기술 대안을 임의 선택해 범위를 확장하지 않는다.

착수 결정은 [roadmap §2.1](feat_plan/phase-roadmap.md)의 A(Phase11 완료 대기)/B(명시 승인된 독립 로컬 기술 범위)와 이유·기간/위험·연쇄·재개 위치를 따른다. 이번 live TASK가 Phase14 로컬 기술 구현·검증·REVIEW_READY 인계를 승인했다. 담당/격리 환경을 지정하고 권한 있는 사용자 결정 기록을 확보한 뒤 해당 Phase §8부터 재개한다. 외부 활성화 승인은 통합계획 §7에 따라 별도로 인계한다.

## 8. 작업 분해와 실행 순서

아래 순서는 착수 게이트 충족 뒤 수행한다. 구현자는 파일/API/DB 작업과 해당테스트를 소유하고 reviewer는 계획/완료판정을 독립검토한다. coordinator가 의존성·dispatch/결정 기록을 관리한다.

1. Phase13 DTO/읽기권한·새로고침/보관상태 표시를 확인한다.
2. 신규domain badge/timeline/certificate client를 연결하고 page wrapper/content·final링크를 이식한다.
3. 연속 접기/펼치기·다른batch·실패/누락·보관metadata·인쇄출처를 검사한다.
4. E01 영향회귀·E02/L01·390px/200%/keyboard·서버재시작영속을 확인한다.

작업마다 포팅 SHA/T행·변경 파일·수용 시험·차이/이월을 기록한다. 체크리스트 실제시험→실패수정/재시험→같은사실의MD/HTML→reviewer완료게이트→다음 인계 순서를 생략하지 않는다.

## 9. 예상 파일/API/DB/화면 영향

신규: domain/evidence-badge.tsx·evidence-timeline.tsx·asset-certificate.tsx, app/(app)/assets/[id]/evidence/page.tsx·page-content.tsx. 변경: asset-workspace-body 및 verify/final page-content·messages3팩·lib/api/evidence·UI/E2E tests. 삭제0;원본 store/index barrel 이식0.

Phase13 GET evidence/certificate를 소비한다.새DB/seed/APIwrite/workerkind 없음;UIgrouping은원장삭제/갱신을하지않는다. 인프라는 기존 단일host web/worker/PostgreSQL/private shared uploads를 유지한다. **새 migration 해당 없음**: 이 Phase는 새 테이블/컬럼을 만들지 않고 선행 schema를 소비한다. 기존 migration 적용·구 코드 호환 회귀는 수행하되 새 SQL/meta/journal 생성은 하지 않는다. 운영seed/기존선호·게시본 보호는 공통규칙이다.

## 10. 테스트 계획

필수 feature ID: **L01/L05/E01/E02**. 의미는 통합계획 §5와 이 plan §11을 따른다. 단위·통합(권한/원자성/멱등)·production E2E·수동 UI 검증을 Phase 고유 항목에 적용한다. L01의 세 팩 동등성과 en 유지가 공통 필수다. 외부 공급자/원어민 승인 결과는 기술 시험 PASS와 구분한다.

환경은 [roadmap §4](feat_plan/phase-roadmap.md)의 Node22.22.0/pnpm10.34.5/Next16.3.3·전용 claps_test·sandbox 메일·private shared uploads·Chromium이다. APP_ORIGIN과 E2E_BASE_URL을 맞추고 web/worker에 같은 DB/파일을 주입한다. 실제 격리검증은 아래 §16 환경과 execution ledger를 따른다. 기존 55433 예시는 실제 Linux 격리환경 명령으로 대체했다.

```bash
cd /tmp/claps-phase14-sandbox
export PATH=/home/arcreation/.nvm/versions/node/v22.22.0/bin:$PATH
# private /tmp/claps-phase14-test.env: isolated55437 / claps_test_phase14
# 실제명령/exit는 evidence/phase14/execution.jsonl 참조; 기존DB 쓰기 금지
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test:unit
corepack pnpm test:i18n
# 별도 TEST_DATABASE_URL 환경, DATABASE_URL 미주입 상태로 integration
corepack pnpm test:integration
# network-none builder → 새 immutable standalone release (symlinks=True)
# production web+worker/E2E, 실제restart, 별도demo는 durable probe/ledger 사용
```

전체 E2E의 시험팩/worker 경쟁 방지와 합성 자료 정리는 [roadmap §4](feat_plan/phase-roadmap.md)를 따른다. 기존 테스트 PASS로 이번 Phase를 대신하지 않는다. 구현 전 설치 Next docs의 해당 server/client·route handler·typegen·testing·fonts 가이드를 확인한다.

## 11. 완료 조건

- 생성 badge, 연속 사건 접기/펼치기, asset별 증명서, 인쇄의 4개 흐름을 통과한다.
- 새로고침/재시작 후 서버 이력을 유지하며 batch 혼합과 미기록/실패의 성공 표시는 0건이다.
- 보관 metadata 읽기·파일 차단, 키보드·390px/200%·hydration과 L01/L05/E01/E02를 통과한다. 원본 localStorage writer 이식은 0건이다.

공통 정량/보고 게이트는 [roadmap §3](feat_plan/phase-roadmap.md)을 적용한다. **승인된 기술 범위**의 필수 FAIL/BLOCKED/PENDING/skip 또는 테스트 0개 통과는 허용하지 않는다. 실제 체크리스트·동일 MD/HTML·완료 리뷰·인계를 갖춘 경우만 해당 범위 COMPLETED로 판정한다. 착수 시점 시험은 미실행이며 실제 결과를 별도 기록한다.

## 12. 위험과 대응

브라우저 임시 기록을 공식 증명서로 표시하거나 권리 효력을 단정할 위험이 있다. 서버 DTO만 표시하고 legacy·미기록·검증 범위를 명시하며 prompt를 자동 출력하지 않는다. 공통 착수/범위 변경 통제는 [roadmap §2~3](feat_plan/phase-roadmap.md)을 따른다.

## 13. rollback/복구

stage3 UI PR을 revert하되 Phase13 원장/API와 서버 이력을 보존한다. 새 migration이 없어 DB 되돌림은 없다. 공통 PR revert·DB down 금지·같은 정지점 DB+uploads 백업/빈 환경 복구는 [roadmap §5](feat_plan/phase-roadmap.md)을 따른다.

## 14. 결과 증거와 다음 Phase 인수인계

미래 산출물은 `md/phase14-test-checklist.md`(구현 후 시험 전),`md/phase14-result.md`/`md/phase14-result.html`(실제 시험 후),`md/evidence/phase14/`다. 명령/exit code·고유 시험 수·최초 실패/재시험·Phase별 고유 증거를 남긴다. 개인정보 제거·동일 MD/단일 HTML·완료 리뷰 규칙은 [roadmap §3](feat_plan/phase-roadmap.md)을 따른다. 구현 후 시험 전 체크리스트를 생성하며 실제 실행 후 결과를 작성한다.

검증된badge/timeline/증명서/인쇄·접기/접근/legacy표시·E02/회귀증거와 ja키를 Phase15 및 Phase16 소비자료로 인계한다. 후속착수에는이plan과미래체크리스트/MD/HTML/완료review를전달하고미해결 차단을감추지않는다.

## 15. 변경 이력

| 날짜 | 변경 | 근거/상태 |
| --- | --- | --- |
| 2026-10-01 | 승인통합 stage3를Phase14 실행계획으로분할 | 사용자후속요청·규칙§6.2/§13;DRAFT/reviewer계획검토전,구현/시험미실행·predecessor gate BLOCKED |
| 2026-10-01 | Phase 리뷰 Round1 PM1/PM2·Minor6 반영 | REVISED / 재검토 대기; 실행 BLOCKED·착수 결정 미승인, 기술 범위/외부 게이트 분리 |
| 2026-10-01 | [Phase Round2 계획 승인 반영](feat_plan/phase-review-round-2.md) | APPROVED·Major 0; 계획 승인은 착수 승인 아님, 실행 BLOCKED·예외 현재 미승인 유지 |

## 16. 실제 Phase14 착수 (2026-10-01)

Live task_f260dbfd9222 / ctx_68ef2d0c4c30, 기존 coder/reviewer 유지. Phase13 COMPLETED/275 PASS/9건 해결·인계 및 두 세션 clear는 root 확인, B 승인 계승. Phase11 전체 IN_PROGRESS/외부 출시 BLOCKED 유지. Phase14 구현·검증·REVIEW_READY까지만 권한이며 독립 리뷰/수정/phase 종료·Phase15/clear/commit/push/PR은 root 소유다.

서버 strict GET DTO→badge(조회중/실제오류/성공·coverage)→cursor timeline(같은 session/job/asset/actor·순번인접 연속만 접기)→asset별 certificate 및 session evidence/print→의미있는시험/증거 순서. timeline history와 selection coverage 별도 표시, verify.run summary는 job 참조/ruleCount이며 full 원문은 기존 jobs.output/asset.verification이다. prompt 자동출력 없음.

Node22.22.0/pnpm10.34.5/Next16.3.3 Linux 내부 물리 deps, isolated55437 새 claps_test_phase14 및 별도 demo DB; 사용자3193/55433/55436·이전DB 불변. network-none 고정 builder image 및 새 immutable release, public/messages 평탄 복사와 전체hash 대조. 새 schema/migration/seed/write API 없음.

## 17. 실제 구현·검증 및 REVIEW_READY 인계

고유287 PASS/신규12/필수skip0/최종FAIL0. badge/timeline/certificate/print4흐름과3팩·390px200%·권한·65사건cursor/접기print·선행schema호환·offline3팩·실제runtime2cycle·별도demo·정확hash복구/보존을완료했다. 구현과원본의보수적group경계차이,metadataIDindex 및최초실패는 결과/source-trace/ledger에기록했다. 현재실행상태 REVIEW_READY / IN_PROGRESS이며 독립기존Claude review·후속같은coder수정·phase종료/clear/다음dispatch는root소유다. §15 이전BLOCKED/미승인문구는계획작성당시역사이며실제착수권한/상태는§16~17을따른다.

## 18. 독립 리뷰 후 권장9건 수정·로컬 종료 (2026-10-01)

Live task_d9e29a850342 / ctx_4eff7aaed2ee, 사용자 직접 원문 "12~17진행", "coder→reviewer→coder종료", "전부권장안"의 위임을 근거로 root가 후속 TASK에서 9건 수정·재검증 및 로컬 종료를 지시했다. 원본phase14-review는C0/M1/m2/n6 CHANGES_REQUESTED 불변이며 새독립APPROVED판정0. §16~17은최초구현당시역사, 특히T25보수적경계/NULLjob접기증거는M1에의해기각되어현재완료근거가아니다. 최종samekind/actorType/순번인접시각묶음과별개job/asset수·개별참조/print머리, actualJobService.insert64건검증으로계약충족한다. certificate exactbatch는기존서버DTO불변이다.

M1(a)+(b)/m1/m2/n1~n6 전부CLOSED·이월0, [종료표](phase14-review-fixes.md)·[최종결과](phase14-result.md)·[인계](phase14-handoff.md). 이번final재검증286PASS(60/158/9/59), 전체고유288(역사Phase11 1/demo1포함), 신규13, 최종필수FAIL0/미검증0/.skip0/0suite0. 이번새DBintegration158단일실행/final3팩59PASS, reviewer이전158/58과역사build범위구분·중복가산0. 출력/3언어200%직접검수/원본817및후속baseline/refs/원장GET서비스DB불변/jafalse/ownstop확인. 첫후속lint실패수정과실제명령exit/복구전체SHA도ledger보존.

위 사용자 위임을 근거로 한 root 후속 TASK에 따라 계획EXECUTED/Phase14로컬COMPLETED. Phase11전체IN_PROGRESS/외부BLOCKED및B승인Phase17기술인계까지만유효, Phase12exit139미확정. Phase15/clear는root소유, commit/push/PR/실공급자/운영ja/과금/실송신/배포0.
