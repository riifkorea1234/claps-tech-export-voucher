# feature/backend 기능 통합계획

상태: **APPROVED / Round2 계획 승인, N1~N5 최종보완 — 구현 미착수**. 작성일: 2026-10-01. 이 산출물은 실행계획이며 구현·통합·검증 완료 또는 출시 승인을 뜻하지 않는다. Round 1 지적은 Round 2에서 해소·계획 승인되었고 비차단 N1~N5도 최종 보완했다. 독립 reviewer의 검토 결과는 별도 review 문서에 기록하고, 이 세 파일의 수정 소유권은 planner에 둔다.

## 문서 인덱스

- [실행계획](integration-plan.md): 전략, 기능별 서버 갭, 데이터/권한 계약, 단계별 수용기준, 검증·복구·미결정.
- [브랜치 분석](branch-analysis.md): 실제 계보, 커밋/경로 근거, 변경 중첩과 충돌 해결 기준.
- [Phase 실행 로드맵](phase-roadmap.md): Phase12~17 분할·착수/검토/인계 게이트·34행 매핑, APPROVED / Phase Round2 계획 승인·실행 BLOCKED.
- [Phase12 통합 준비·locale/profile](../phase12-plan.md)
- [Phase13 증빙 서버](../phase13-plan.md)
- [Phase14 증빙 UI](../phase14-plan.md)
- [Phase15 monitoring 근거·오탐](../phase15-plan.md)
- [Phase16 일본어 감수 패키지](../phase16-plan.md)
- [Phase17 회귀·복구·활성화 조건](../phase17-plan.md)
- [Phase 리뷰 Round 1](phase-review-round-1.md): PM1/PM2·Minor6 반영, Round2에서 모두 해소·계획 승인. 통합계획의 기존 APPROVED와 Phase 착수 결정은 별도이며 현재 예외 승인 없음·실행 BLOCKED.

| Phase 리뷰 항목 | 반영 위치/내용 |
| --- | --- |
| PM1 | roadmap §2.1, Phase12~17 §3·§7: A/B 결정안·B 권장 이유/위험/기간·기술 완료 연쇄·재개 위치 |
| PM2 | roadmap §4~5, Phase17 §7·§11: 기술 필수/외부 게이트 분리·최종 통합 권한 조건 |
| m1 / m2 | Phase12: T22 유지 검증·ja 초안 담당/방식/별도 기간 |
| m3 / m4 | Phase14/17 새 migration 해당 없음; Phase12/17 시험팩 안전 정리·별도 demo 명령 |
| m5 / m6 | 공통 반복 축소·고유 기준 가독성; Phase11 외부 보류는 Phase17 기술 완료 선행조건 아님 |

Phase 수정 기록: `run_804982d10359 / task_2d50f1f65c37 / ctx_d3697a0ba572`. 상세 대응은 [roadmap §8](phase-roadmap.md)에 기록했다.

- [Phase 리뷰 Round 2](phase-review-round-2.md): **APPROVED / Blocker 0·Major 0**, PM1/PM2·m1~m6 해소. 계획 승인은 착수 승인이 아니며 A/B 결정·예외 현재 미승인, 실행 BLOCKED 유지.

Phase 최종 상태 정리: `run_804982d10359 / task_20545c95887e / ctx_ef8a7c19130e`. 비차단 R1 가독성은 착수 전 정리, R2 담당 실명/일정은 착수 전 결정하며 현재 미정이다. 상세 승인 기록은 [roadmap §9](phase-roadmap.md)에 있다.

- [Round 1 리뷰](review-round-1.md): CHANGES_REQUESTED, Major 5·Minor 6 해소.
- [Round 2 리뷰](review-round-2.md): APPROVED, Major 0·비차단 Minor N1~N5 최종 반영.
- 기존 기준: [전체 개발계획](../development-plan.md), [Phase 8 결과](../phase8-result.md), [Phase 10 결과](../phase10-result.md), [Phase 11 결과](../phase11-result.md), [DB 계약](../../db/README.md), [HANDOFF](../../HANDOFF.md).

## 고정 조사 스냅샷

소스 저장소 `/mnt/f/claps-product`; `git -C`로 조사했다. fetch는 선행 완료된 상태이며 이 작업에서 fetch·checkout·merge·cherry-pick·commit·push·PR을 실행하지 않았다. 최초 `git status --short`는 빈 출력, HEAD는 feature/backend와 origin/feature/backend에 일치했다.

| 참조 | 고정 SHA |
| --- | --- |
| feature/backend / origin/feature/backend | b4749eb851c6cfef28f207adfca5f3f1ee942f66 |
| origin/main / 공통 merge-base | 7f488bb9d4aa0cc6319f617e7934751e91fd9c51 |
| origin/feat/#1-locale-en-ja | f033027924adda2bc437b0ad86e62a5d4bd304e2 |
| origin/feat/#2-evidence | b3b6b6639b19118f3a63074bac37f2d9b479b1a7 |
| origin/feat/#3-rationale-review | dcf5b1f8e6fcd4e2dd90dbb0eff22431b39e3467 |
| origin/feat/#4-review-package | 84f6be15dc96882b6e9dee77010074d4a38c9b39 |

실제 `merge-base --is-ancestor`로 #1 ⊂ #2 ⊂ #3 ⊂ #4를 확인했다. backend와 각 기능 tip은 서로 ancestor가 아니다. #4는 main 대비 정확히 71개 변경 경로이며 backend의 main 대비 452개 경로와 48개가 중첩한다. 이는 텍스트 충돌 확정 개수가 아니라 병행 변경 위험 경로 수다.

**선정 전략: backend를 기준으로 #4의 누적 기능을 기능별 선택적 포팅.** #1~#4를 각각 전체 merge하거나 #4 파일을 일괄 덮어쓰지 않는다. backend의 API/DB/인증/worker/관리자 기능을 유지하면서 UI·문구와 새 영속 기능을 이식한다. 기록상 원본 SHA와 이식 항목을 남겨 향후 중복 반영을 막는다.

## 검토 상태와 인수 조건

| 검토 항목 | 현재 상태 | 검토자가 확인할 증거 |
| --- | --- | --- |
| 계보·누적 범위 | 조사·ref 재확인 완료 / 계획 승인 | branch-analysis의 명령과 SHA |
| backend 보존·충돌 대응 | 실사용 분류 정정 / 계획 승인 | 48개 중첩 경로 및 server/client 구조 |
| schema·API·worker·영속성 | 기본값 확정 제안 / 미구현 | integration-plan의 제안 계약·원자성 |
| 일본어 범위·감수·소셜 인증 | 기술 기본값 반영 / 외부 활성화 조건 별도 | 언어팩 전체성·직접 URL 정책·OAuth 보류 |
| 자동/브라우저/복구 검증 | 계획만 작성 / 미실행 | 명령 및 단계 수용기준 |

초안 및 수정 조사에서 AGENTS.md를 읽었고 설치된 Next 16.3.3의 `node_modules/next/dist/docs/01-app/` 아래 `01-getting-started/05-server-and-client-components.md`, `15-route-handlers.md`, `03-api-reference/06-cli/next.md`, `02-guides/testing/{playwright,vitest}.md`, 추가 `01-getting-started/13-fonts.md`를 확인했다. `next typegen && tsc --noEmit`, production build/start 후 E2E, async Server Component의 E2E 검증을 반영한다. 코드·migration·앱 테스트는 이 문서 작업에서 실행하지 않았다.

문서 외 파일 수정은 허용하지 않는다. reviewer는 자신의 review 문서만 작성하며, 승인/지적이 생기면 coordinator가 planner에게 수정 항목을 전달한다. 출시에 필요한 기존 공급자·품질·보존·운영 결정은 이 계획으로 자동 해결되지 않는다.

문서 검증에서 로컬 링크·세 파일의 계획 승인 표기와 비merge 34행의 실제 commit 집합/순서를 확인한다. 수정 시 6개 origin ref와 HEAD는 표의 SHA 그대로이며 `git status --short`는 `?? md/feat_plan/`만 표시했다. reviewer 문서는 읽기만 했고 앱 테스트는 미실행이다. 문서 검사는 통합 기능의 수용시험을 대체하지 않는다.

## Round 1 리뷰 대응표

입력: [review-round-1.md](review-round-1.md)의 **CHANGES_REQUESTED (Major 5 / Minor 6)**. 전 항목을 반영했으며 reviewer 문서는 변경하지 않았다. 아래 수정은 Round 2에서 독립 reviewer가 해소를 확인했다. 계획 승인은 구현 완료를 뜻하지 않는다.

| 항목 | 수정 위치 | 반영/근거 |
| --- | --- | --- |
| M1 | branch-analysis §3, integration-plan §1 | store API client·mock 타입/상수·importer0 레거시를 파일별로 분리; origin/feature/backend git grep 근거와 채택측 기록 |
| M2 | branch-analysis §5, integration-plan §5 | 실제 비merge 34행 T01~T34, full SHA·판정/사유·대상·단계·테스트 ID; footer·폰트·table/empty-state·코드화·badge/접기를 포함 |
| M3 | integration-plan §2.1~2.4/§3/§7 | namespace/ID/멱등/참고 임계/locale gate/동기 snapshot/성명/정규화/prompt/삭제 읽기 기본값과 이유·변경 영향; 외부 승인 조건을 별도 표로 분리 |
| M4 | integration-plan §2.1/§4/§5 | 세 팩 동등성+en 활성 유지 L01, 6곳 하드코딩 처리 L02/L06, ja 비활성 seed→단계5 완료→단계6 검수→관리자 활성 단일 게이트 |
| M5 | integration-plan §1.1/§6, branch-analysis §5 | backend 기준 작업브랜치·단계PR·원자 커밋/trailer·drift·단계 revert/DB forward-fix·원격 브랜치 보존 |
| m1 | integration-plan §5 | E2E TEST_DATABASE_URL, migration/seed 선행 순서·별도 demo seed/test 조건과 ja fallback |
| m2 | integration-plan §2.1/§5 | Inter/Noto Sans JP 기능 유지, next/font/local 기본·Google build 네트워크 조건·glyph/subset/용량 L03 |
| m3 | integration-plan §4 | 단계0~6을 Phase12 substage로 매핑, plan/test-checklist/result MD+HTML 규칙 및 Phase11 승인 독립 범위 근거 |
| m4 | integration-plan §2.4/§3/§6 | snapshot은 동기 DB 발급으로 새 job kind 없음; 기존 export 이미지 ZIP 유지·jobs_kind CHECK 불변·확장시 migration/구 worker 게이트 |
| m5 | integration-plan §2.2/§3 | owner의 보관/삭제 metadata·기발급 snapshot 읽기 허용, 파일/신규 write/발급 차단; 별도 read guard·E01/R02 |
| m6 | branch-analysis §3, integration-plan §2.1 | locale-switcher와 원본 i18n 신규파일 이식 금지, index.tsx barrel 생성 금지, messages/provider로 변환 |

수정 작업 소유권은 이 3개 문서뿐이며 후속 Phase12 파일·소스·migration·PR은 이번 작업에서 만들지 않았다. ref drift 없이 선택적 포팅 전략과 증빙/오탐/ja 감수 목표를 유지했다.

Round 1 수정 자체 검증: T01~T34의 full SHA/순서를 실제 git 비merge 로그와 대조하여 34/34 일치, 모든 테스트 ID 정의·로컬 링크·재검토 상태·trailing whitespace 검사 통과. 6개 origin ref와 HEAD 불변 및 tracked 코드 diff 없음 확인; 앱/DB 테스트는 미실행이다.

## Round 2 승인 및 최종보완

[Round 2](review-round-2.md)는 문서 계획 APPROVED, Blocker/Major 0이며 N1~N5는 비차단 지적이다. 지금 전부 최소 편집으로 반영했고 기술 범위를 확장하지 않았다. 실행·migration·테스트·ja/OAuth/공급자·법무·출시 승인은 포함되지 않는다.

| 항목 | 수정 위치 | 최종 반영 |
| --- | --- | --- |
| N1 | integration-plan §3 | feedback 원장의 idempotencyKey + requestHash 표기 통일 |
| N2 | integration-plan §2.3 | path resultId는 itemIndex 0~49, output 범위 검사 후 서버 jobId:index 조합 |
| N3 | integration-plan §4 | 단계1 users migration 빈/0008 복제 DB·구 코드 revert 호환 수용기준, DB 검증 선행 명확화 |
| N4 | branch-analysis §2 #1 | account-store 임시 저장 설명을 #1 f033027 문맥으로 한정 |
| N5 | integration-plan §2 | OAuth 외부 활성화 게이트·PDF/문서 ZIP 확장 범위로 용어 통일 |

## Orca 작업 기록

Run: `run_66a94f83874a`. Coordinator terminal: `term_797ef407-fb91-4e9e-93df-6c414a260020`; planner terminal: `term_477c041a-2f47-4094-92e8-13b23823e800`. 역할은 planner가 계획3개 편집, reviewer가 별도 review 문서 검토, coordinator가 dispatch/결과 인수다.

| 역할/작업 | Task ID | Dispatch ID | 산출물/상태 |
| --- | --- | --- | --- |
| planner 초안 | task_1915b20f1345 | ctx_22665e4e7bcd | 계획3개 초안, worker_done 보고 |
| reviewer Round 1 | task_db3df427528b | 리뷰 원문에 미기재 | review-round-1.md CHANGES_REQUESTED |
| planner Round 1 수정 | task_4b869f764bb2 | ctx_51af5f2cff37 | M1~M5/m1~m6 반영, worker_done 보고 |
| reviewer Round 2 | task_677fbeedf5ed | 리뷰 원문에 미기재 | review-round-2.md APPROVED |
| planner 최종 정리 | task_0eb5897d4598 | ctx_f37239c8fecc | N1~N5·승인상태/링크/기록 최종보완, 현재 dispatch로 worker_done 보고 |

최종 문서 확인 범위는 현재 refs·34개 SHA 추적행·로컬 링크·계획3개 외 변경 없음이다. 전체 재조사와 앱/DB 테스트·구현은 수행하지 않았다. reviewer 원문과 코드·Git 상태는 보존했다.
