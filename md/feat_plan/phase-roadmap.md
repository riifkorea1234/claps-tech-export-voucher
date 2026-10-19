# 기능 통합 Phase 실행 로드맵

상태: **APPROVED / Phase Round2 계획 승인 — 실행 BLOCKED·구현 미착수**. 작성일 2026-10-01. 이번 사용자 요청은 계획 분할·작성·검토이며 구현 예외 승인이나 코드 실행 지시가 아니다.

## 1. 기준·분할 이유·순서

[승인 통합계획](integration-plan.md)과 [34커밋 근거](branch-analysis.md), [Round2 계획 승인](review-round-2.md)의 기술 기본값·범위는 유지한다. 해당 문서의 Phase12 substage0~6 제안을 이번 후속 사용자 요청에 따라 독립 완료/인수인계 가능한 **연속 Phase12~17**로 분할한다. 기존 승인 문서와 Phase0~11·[진행 규칙](../phase-development-process-rules.md)은 수정하지 않는다. 분할·승인은 문서에 한정한다.

| 기존 stage | 새 Phase/계획 | 주요 산출·인계 | 예상 기간(1인 추정) |
| --- | --- | --- | --- |
| 0+1 | [12 통합 준비·locale/profile](../phase12-plan.md) | drift/범위 검토, ja 비활성 팩·성명 migration·언어 UI 기반 | 7~11일(개발4~6+ja 초안3~5) |
| 2 | [13 증빙 서버](../phase13-plan.md) | 원자적 사건 원장·읽기 API·certificate 집계 | 3~5일 |
| 3 | [14 증빙 UI](../phase14-plan.md) | badge·타임라인/접기·증명서/인쇄 | 2~3일 |
| 4 | [15 monitoring 근거·오탐](../phase15-plan.md) | 근거/null·참고80/90·신고/철회 영속 | 3~4일 |
| 5 | [16 일본어 감수 패키지](../phase16-plan.md) | 수동체크·readiness·불변 동기 snapshot·ja 인쇄 | 3~5일 |
| 6 | [17 회귀·복구·활성화 게이트](../phase17-plan.md) | 전체 회귀·DB+파일 복구·ja 검수/활성화 조건·인수인계 | 3~5일 |

Phase12 ja 초안은 구현 담당자가 원본 ja 문구를 재사용하고 새 backend/evidence/review 키는 ko/en과 용어표를 기준으로 보조 도구를 활용해 작성한다. 제품 담당자가 초안 용어/placeholder를 검토하고 reviewer는 키/변수 동등성을 검사한다(실명 담당은 착수 전 지정). 원어민 승인 검수는 별도 외부 게이트다. 개발4~6일과 ja 초안3~5일을 분리해 Phase12 합계7~11일로 재산정했다.

기간은 구현 인력1명 기준 최초 추정이며 리뷰·외부계정·승인·환경 대기 제외, 착수 시 재산정한다. 현재 모든 Phase 계획은 APPROVED / Phase Round2 계획 승인이며 실행은 BLOCKED다. 후속 plan 선작성은 다음 구현 착수를 뜻하지 않는다.

## 2. Phase11 미완료 및 착수 게이트

[Phase11 plan](../phase11-plan.md)·[체크리스트](../phase11-test-checklist.md)·[결과 MD](../phase11-result.md)·[HTML](../phase11-result.html)을 대조했다. 결과는 **IN_PROGRESS — 독립 로컬 범위 구현/검증 완료, 실제 공급자/운영 출시 BLOCKED**다. 고유 자동196 PASS, 파일34개 checksum 복구는 이전 로컬 증거이며 이번 통합 PASS가 아니다. 프로젝트/세션은 이전 복구 표본0건이어서 신규 evidence/snapshot의 복구 증거로 사용할 수 없다.

| 이월 | 현재 근거/영향 | Phase12~17에서 유지할 제한 |
| --- | --- | --- |
| 실제 PDF/규칙 게시/생성·검증·검색 | Phase7/8/10 보류, Phase11 T-07/T-08/T-11 BLOCKED | 주입 fixture만 격리 검증; production 미연결503, 목업 성공 금지 |
| 합의 성능/품질/비용·사업 데이터 | T-16 및 Phase9 사업 검수 대기 | 참고 유사도/규칙 추천은 침해·사업 품질 승인 아님 |
| runtime guide-analysis 고정 시연 | P11-T01 mock0 BLOCKED | 실사용 타입/API client 보존; 시연을 공급자 결과로 승격 금지 |
| 번역/실메일/TLS/관리자 공개·RPO/RTO/보존 | Phase11 남은 출시 조건 | 원어민·외부 자격증명·법무·운영 게이트 별도, 영구삭제/실전송 비활성 |

**기본 착수 조건:** 규칙 §5.2에 따라 predecessor 결과 COMPLETED, 필수 PASS, 미해결 차단 없음, migration/데이터/API/설정 인계 및 현 plan reviewer 승인·공유를 확인한 뒤에만 READY/구현한다. 현재 Phase12는 Phase11 미완료로 BLOCKED이고 Phase13~17도 바로 앞 Phase 미구현으로 실행 대기다. feat_plan APPROVED 또는 새 plan reviewer 승인은 이 게이트를 대체하지 않는다.

### 2.1 사용자에게 요청할 착수 결정안 (현재 미결정)

**결정 질문:** Phase11 전체 완료까지 기다릴지(A), Phase12~17의 격리 로컬 기술 범위를 명시적 예외로 순차 실행할지(B)를 권한 있는 사용자가 선택해야 한다. [Phase11 plan §16](../phase11-plan.md)은 Phase10 IN_PROGRESS 상태에서 사용자 진행 요청으로 독립 로컬 범위를 수행한 선례다. 이번 요청은 계획 작성뿐이므로 그 선례가 현재 예외 승인을 만들지는 않는다.

| 선택지 | 허용/게이트 | 기간·영향·위험 |
| --- | --- | --- |
| A: Phase11 COMPLETED까지 대기 | 규칙 §5.2 기본 조건 그대로; 전체 필수 PASS·인계·현재 계획 리뷰 승인 후 Phase12 시작 | 대기 기간 미정. 실공급자/운영 품질 증거를 먼저 확보하지만 독립 기능도 공급자 계약/출시 목표에 따라 무기한 지연 가능 |
| B: 명시적 독립 로컬 범위 예외 (권장) | 사용자가 Phase12~17의 기술 범위·순차 게이트·결과 상태·금지 범위·유효 기간을 승인한 뒤 격리 로컬 구현/시험만 수행 | 1명 기준 기술 작업21~33일 추정, 외부/리뷰/환경 대기 제외. 실공급자 품질을 확인하지 않은 채 계약이 쌓이는 위험과 나중 재시험/포팅 수정·코드 revert 비용이 있음 |

**B 권장 이유:** 공급자와 무관한 서버 영속/권한/locale·증빙·오탐·감수 기능을 검증할 수 있고, 승인 통합계획 §7처럼 기술 완료와 외부 출시 조건을 분리할 수 있다. 위험은 strict DTO·미연결503·격리 주입 테스트·Phase별 원자 PR/revert와 공급자 도입 시 추가 회귀로 관리한다. 신규 공급자 실연동/과금·운영 배포·운영 ja 활성화·외부 메일/전송·feature/backend 최종 통합은 B에 포함하지 않는다. 작업브랜치 관리·커밋·원격 push/단계 PR 권한도 사용자의 결정 기록에 대상/허용범위를 별도 명시해야 하며 자동 허용하지 않는다.

**B 선택 시 제안하는 연쇄와 결과 상태:** 승인된 기술 범위의 Phase 필수 시험 모두 PASS + 규칙 §9~10의 체크리스트/동일 MD·단일 HTML/완료 리뷰·인계 게이트 충족 → 해당 결과에 `범위: 명시 승인된 독립 로컬 기술 범위 / 상태: COMPLETED`를 기록 → 바로 앞 Phase 기술 COMPLETED·완료 리뷰·인계와 동일 예외의 다음 Phase 포함 여부를 확인한 뒤 순차 착수한다. Phase11 전체는 계속 IN_PROGRESS이고 공급자/운영 등 외부 항목은 별도 `외부 게이트: BLOCKED/대기`로 모든 결과에 인계한다. 기존 외부 필수 조건을 N/A로 바꾸거나 Phase11 전체 완료로 표시하지 않는다. Phase12~17의 기술 범위 밖에 둔 외부 항목 분류는 승인 통합계획 §7 근거와 사용자 예외 승인 기록으로 명시한다.

**승인 기록에 필요한 값:** 선택 A/B, 승인자·날짜, Phase12~17 중 허용된 번호/기술범위, 금지 작업, 코드/Git 작업 권한, 결과 상태/다음 단계 조건, 유효 기간(승인일~Phase17 기술 인계; 범위 변경·ref drift·권한 변경 시 재승인), 남은 외부 책임자와 재개 조건. coordinator가 결정 요청과 답변을 보관한다. planner/reviewer는 승인자가 아니다.

**현재 상태와 재개 위치:** A/B 결정·예외 승인은 아직 없다. 모든 Phase 실행 BLOCKED 유지, 코드/DB/앱 시험 미실행. 결정과 승인된 계획·범위/권한 기록이 확인된 뒤 **Phase12 §8의 1단계**(refs·상태·34행·기준 회귀 준비)부터 재개한다. 이후 Phase13~17은 각각 predecessor 기술 완료/인계 위치에서 시작한다.

## 3. 계획·실행·완료·인계 프로토콜

planner plan 작성 → reviewer 계획리뷰 → 지적 수정/재리뷰 → 승인된 기술 범위의 predecessor/착수 게이트 확인(외부 활성화 조건은 별도 인계) → 구현 → `phaseN-test-checklist.md` 작성/실제 시험 → 실패 수정·관련 회귀 재시험 → `phaseN-result.md` + 단일 `phaseN-result.html` → reviewer 완료게이트 판정 → 다음 Phase 인계.

계획 상태와 실행 상태를 분리한다. 초안 DRAFT/수정 REVISED·재검토 대기, 환경/이전 단계 미완료 BLOCKED, 게이트 충족 시 READY, 구현중 IN_PROGRESS, 구현·시험 후 EXECUTED, 규칙§10 충족 시 COMPLETED. 명시적으로 승인된 기술 범위의 필수 FAIL/BLOCKED/PENDING가 하나라도 있으면 해당 Phase 완료와 다음 구현 금지다. 외부 게이트는 기술 필수 목록과 분리해 상태를 보고하며 기존 외부 조건을 N/A로 숨기지 않는다. 테스트0개/필수skip을 PASS로 집계하지 않는다. 비적용은 명시 사유·위험·이후 책임 Phase를 적으며 외부 필수조건의 우회 수단으로 사용하지 않는다.

planner는 계획, 구현자는 해당 Phase 범위 코드·검증·결과, reviewer는 독립 review, coordinator는 dispatch·결정/인계 소유다(인력 미배정, 시작 전 지정). 계획 검토와 완료 검토를 별도 기록하고 완료 review에서 계획 대비 차이·필수 결과·동일 MD/HTML·다음 차단을 확인한다. 이번 작업은 plan만 만들고 체크리스트/result/HTML을 생성하지 않는다. 각 plan에 미래 산출물명을 적었다.

규칙§6.2의17 필수사항은 각 plan의 §1 번호/상태/일정, §2 목표, §3 입력/이월, §4 현재상태, §5~7 범위/제외/결정, §8 순서/책임, §9 예상파일/API/DB, §10 시험/환경, §11 정량완료, §12 위험, §13 복구, §14 증거/다음인계, §15 변경이력으로 대응한다. 구현 차이는 plan과 결과에 기록하고 MD를 원본으로 HTML에는 같은 사실/수치/실패/이월을 담는다. HTML은 외부 CDN/런타임 JS 없는 단일파일·반응형·print CSS, 개인정보/secret 제거를 검증한다.

## 4. 공통 기술·검증·ja 순서

계약 세부는 [통합계획 §2~3](integration-plan.md) 그대로다. backend API client·server page/Promise params·소유권/추가인증/worker fencing·불변 jobs.output을 보존한다. 원본 localStorage 증빙/오탐/체크는 공식 기록으로 수입하지 않는다. evidence/review namespace, owner 격리(조직 tenant 아님), append-only 사건+transaction, prompt job참조, 보관/삭제 metadata 읽기·파일/write 차단을 유지한다.

전 Phase 문구 변경에는 **L01 ko/en/ja 키집합·개수·변수 동등 + deployedLocales 세 팩 인정 + en available 유지**를 적용한다. namespace를 추가하는 Phase12에 세 팩을 함께 준비하고 후속 기능 키도 세 팩 같은 변경으로 넣는다. 운영 ja 순서는 Phase12 비활성 DB행/완전 팩 → Phase13~16 기능/키 반영 → Phase16 기술 완료 → Phase17 전체 기술 회귀·격리 관리자 활성/비활성 smoke·원어민 검수 요청자료 준비 → Phase17 기술 완료 → 별도 외부 게이트 충족 시 기존 관리자 추가인증/감사/version 절차로 운영 활성화다. 원어민 승인 결과·운영 활성화 권한은 기술 완료의 선행조건이 아니며 [Phase17 §7](../phase17-plan.md)의 소유자/조건/재개 표로 인계한다. 그 전 ja E2E는 격리 DB fixture 활성화만 가능하다. OAuth UI 포팅과 실제 OAuth credential 활성화, sandbox PASS와 production 공급자/법무/운영 승인은 별개다.

공통 환경: Node22.22.0/pnpm10.34.5/Next16.3.3, 설치 lockfile·로컬 Next docs, PostgreSQL17 전용 claps_test, Chromium. web/worker의 DATABASE_URL은 격리 DB, APP_ORIGIN은 E2E_BASE_URL과 일치, shared private UPLOADS_DIR·sandbox MAIL_ADAPTER/MAIL_SANDBOX_DIR·host E2E_MAIL_DIR를 준비한다. integration/E2E 프로세스에는 TEST_DATABASE_URL을 반드시 전달한다. 운영DB·실제계정·과금/발송·볼륨삭제는 금지한다.

각 plan §10의 명령은 향후 게이트 충족 뒤 실행할 것이며 지금 미실행이다. lint/typecheck/build·단위·i18n·통합/production E2E의 고유 성공/실패/skip·exit code와 최초실패/재시험을 기록한다. playwright에는 webServer가 없어 production build 후 별도 web/worker를 기동한다. 전체 E2E의 Phase11 suite는 `scripts/phase11-locale.mjs`로 en-GB 시험팩을 **격리 빌드 전에** 생성하고, 추가 namespace까지 동등한 시험팩을 생성하는지 검증한다. 기존 en-GB 덮어쓰기 금지, 종료 시 이번 생성물/합성 fixture만 정리하며 운영 팩으로 사용하지 않는다. 실제 worker 사용 시 E2E_EXTERNAL_WORKER=1로 helper 경쟁을 막는다. async server component는 E2E, 글꼴은 next/font/local로 폐쇄망/glyph/subset/용량을 검증한다.

추가 migration은 db/schema.ts+새 SQL/meta/journal 동시 생성(기존0000~0008 변경금지)→빈 DB 및 0008 데이터 복제 DB 검사→구 코드 호환 smoke→후속 web/worker 갱신 순서다. **Phase12 users 성명 migration이 최초**이며 Phase13/15/16 각 신규 원장/체크의 migration도 동일 게이트다. seed는 ko/en/ja absent 행만, ja enabled:false/fallback ko, 기존version/게시/선호 보존; i18n:activate는 ko/en 기본 동작 유지. [DB](../../db/README.md)·[실행서](../../scripts/README.md)의 advisory lock·NO ACTION·64KiB·정지시점 백업 계약을 따른다.

## 5. Git·인계 단위와 Phase 매핑

고정 SHA는 [승인 README](README.md) 표 그대로이며 착수마다 6개 origin ref/HEAD를 재확인한다. drift이면 계보/diff/34행을 재산정해 재리뷰한다. 현재는 refs 불변, backend b4749eb 기준 선택적 포팅, `-s ours` 기록용 merge·전체덮어쓰기 금지다.

`integrate/feat-1-4`에 기존 stage-{1..6} PR을 순차 반영한다: stage1=Phase12, stage2=13, stage3=14, stage4=15, stage5=16, stage6=17. stage0은 Phase12 사전 문서 게이트다. 각 Phase 하나의 PR, 내부 원자 커밋의 Ported-from(full SHA), Plan-trace(T ID), Integration-stage(stage 번호)는 유지하고 Phase번호는 PR/결과에 기록한다. 최종 `integrate/feat-1-4` → `feature/backend` PR의 조건은 **Phase17 승인된 기술 범위 COMPLETED + reviewer 완료 검토 + 실제 사용자의 대상 브랜치 통합 권한 + coordinator 인계/권한 게이트 확인**이다. B의 로컬 예외 승인이나 계획 리뷰 승인만으로 이 최종 PR을 허용하지 않는다. 현재 실제 통합 권한은 없으며 이번 작업에서 PR을 만들지 않는다. 운영 배포와 운영 ja 활성화는 PR과 별도 외부 승인이다.

실패는 Phase/PR 단위 revert(merge mainline 확인 후 -m1 또는 squash SHA), 의존 반영시 역순 revert/forward fix다. migration은 잔존schema 구 코드 호환 확인 후 코드만 되돌리고 DB down/journal 되감기 금지. DB+uploads는 같은 writer 정지 시점에 백업해 별도 빈 환경에만 복원한다. 원격 feat 브랜치/SHA는 보존하고 정리/태그는 coordinator 결정이다.

## 6. T01~T34 → Phase/테스트 포함표

원본 full SHA·판정·경로는 [branch-analysis §5](branch-analysis.md)를 단일 원장으로 사용한다. 아래는 실행 단위 매핑이며 SHA를 재작성하지 않는다. 기존 L/E/M/R/A ID를 변경하지 않고 기능 손실/추가범위 없이 모든34행을 포함한다.

| Trace | Phase | 테스트 ID |
| --- | --- | --- |
| T01 | 12 | L01/L03/L05 |
| T02 | 12 | L01/L05 |
| T03 | 12 | L01/L04 |
| T04 | 12 | L01/L04 |
| T05 | 12 | L01/L04 |
| T06 | 12 | L03/L04 |
| T07 | 12 | L01/L04 |
| T08 | 12 | L01/L04 |
| T09 | 12 | L01/L04 |
| T10 | 12 | L01/A01 |
| T11 | 12 | L01/L03 |
| T12 | 12 | L04/L05 |
| T13 | 12 | L03/L05 |
| T14 | 12 | L01/L05 |
| T15 | 12 | L01/L02 |
| T16 | 12 | L01/L05 |
| T17 | 12 | L01/L05 |
| T18 | 12 | L02/A01 |
| T19 | 13 | E01 |
| T20 | 13 | E01 |
| T21 | 14 | E01/E02 |
| T22 | 12 | L05 |
| T23 | 14 | E02/L05 |
| T24 | 14 | E01/E02 |
| T25 | 14 | E02 |
| T26 | 13,14 | E01/E02 |
| T27 | 12 | L02/A01 |
| T28 | 15 | M01/M02 |
| T29 | 15 | M02/L03 |
| T30 | 15 | M02 |
| T31 | 16 | R01/R02 |
| T32 | 16 | R01/L01 |
| T33 | 12 | A01/L03 |
| T34 | 12 | A01/L03 |

Phase17 회귀에서는 전체34행과 L01~L06/E01~E02/M01~M02/R01~R02/A01를 재확인한다. T18은 제거된 임시 오류 조건의 미복원, T22/T27 등 기존 충족은 유지 검증이 완료 조건이다.

## 7. 변경 이력과 검토 포인트

2026-10-01: 사용자 후속 계획 분할 요청에 따라 stage0~6 → Phase12~17 문서 분할, 기술 범위 불변. 승인된 Phase12 substage안은 구성 제안이며 이전 Phase 미완료 예외 승인이 아님을 명시했다. reviewer는 규칙17사항, Phase11 게이트,34행/테스트 대응, migration 선검증, ja 순서, 미실행/외부조건 구분을 검토한다.

Orca planner: run_804982d10359 / task_15e5b23fecee / ctx_e49f09d52d3b. 초안은 계획 검토 전 상태로 coordinator에게 인계했고 reviewer 지적은 소유 plan에서 수정했다.

## 8. Phase 리뷰 Round1 대응

입력: [phase-review-round-1.md](phase-review-round-1.md), CHANGES_REQUESTED(PM1/PM2·Minor6). 아래 수정은 [Phase Round2](phase-review-round-2.md)에서 모두 해소·계획 승인되었다. 착수 결정·예외 승인은 아직 없다.

| 항목 | 반영 위치 | 대응 |
| --- | --- | --- |
| PM1 | roadmap §2.1 / 모든 plan §3·§7 | A/B·B 권장/이유·기간/위험·권한/유효기간·기술 완료 연쇄·Phase11 상태 유지·재개 위치 |
| PM2 | roadmap §4~5 / Phase17 §7·§8·§10~11 | 기술 필수와 외부 책임/조건/재개 표 분리, 최종 backend PR의 별도 사용자 권한/완료 리뷰 게이트 |
| m1 | Phase12 §5·§11 | T22 기존 충족 유지·inline locale script 미도입/hydration 경고0 |
| m2 | roadmap §1 / Phase12 §1·§7 | ja 초안 작성주체/방식·개발4~6+초안3~5=7~11일, 원어민 승인 대기 별도 |
| m3 | Phase14·17 §9 | 새 migration 해당 없음, 기존 schema 소비/회귀만 검사 |
| m4 | Phase12·17 §10 | build 전 en-GB 생성·자신 생성물 checksum 확인 후 안전 정리·별도 demo 환경/명령 |
| m5 | 모든 plan §6·§10~14 | 공통 반복을 roadmap으로 모으고 Phase별 고유 수용/위험/복구를 읽기 쉽게 표기 |
| m6 | Phase17 §3 | Phase11 외부 보류는 인계 항목이며 Phase17 기술 완료 선행조건 아님 |

수정 Orca: run_804982d10359 / task_2d50f1f65c37 / ctx_d3697a0ba572. 당시 계획은 REVISED / 재검토 대기, 실행 BLOCKED; 기존 승인 원문·Phase0~11·규칙·리뷰와 코드/refs는 유지한다.

수정 문서 확인: 로컬 링크·T01~T34 34행·각 plan 15절의 규칙17요건 대응·후속 명령 bash 구문·재검토/차단 표기를 확인했다. 보호 문서 57개 해시와 HEAD/6개 origin ref는 불변이며 tracked 코드 diff는 없다. Phase12~17 체크리스트/결과/HTML은 생성하지 않았고 앱·DB 시험은 미실행이다.

## 9. Phase Round2 승인 및 최종 상태

[Phase Round2 리뷰](phase-review-round-2.md)는 **APPROVED / Blocker 0·Major 0**, PM1/PM2·m1~m6 해소다. 계획8개는 승인 상태를 반영했다. **계획 승인은 착수 승인이 아니다.** 현재 A/B 결정·독립 로컬 예외·코드/Git/push/PR·최종 통합·운영 ja 권한은 승인되지 않았으며 모든 Phase 실행 BLOCKED와 Phase11 IN_PROGRESS를 유지한다. 기술 범위·계약·게이트는 변경하지 않았다.

비차단 R1의 일부 압축 문장 가독성은 해당 Phase 착수 전 정리하고, R2의 실명 담당/일정은 착수 전 coordinator가 사용자 결정 기록과 함께 확정한다. 현재 실명이나 승인을 만들어 기록하지 않는다.

최종 상태 정리 Orca: `run_804982d10359 / task_20545c95887e / ctx_ef8a7c19130e`. 상태·리뷰 링크·이력만 갱신하고 로컬 링크를 확인했다. 전체 재조사·구현·앱/DB 시험·Git 변경은 하지 않았다.
