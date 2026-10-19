# 통합계획 독립 검토 — Round 2

- 검토 대상: `md/feat_plan/README.md`, `integration-plan.md`, `branch-analysis.md` 수정본(REVISED) 및 [review-round-1.md](review-round-1.md)
- 검토자: reviewer (Orca task_677fbeedf5ed), 작성일 2026-10-01
- 방법: `git -C /mnt/f/claps-product`로 refs·비merge 커밋·backend 소스를 다시 조회해 M1~M5/m1~m6 반영을 항목별로 독립 대조했다. 코드·plan 3개·이전 리뷰 수정, merge·commit·push·PR, 앱/DB 테스트 실행은 하지 않았다.

## 판정: **APPROVED (문서 계획 승인)**

Round 1의 Major 5건과 Minor 6건이 모두 해소되었고, 새 Blocker·Major는 없다. 새로 발견한 Minor 5건(N1~N5)은 구현 단계0(Phase12 plan 작성) 안에서 반영하면 되며 계획 승인을 막지 않는다.

**승인 범위 한정:** 이 판정은 **통합 실행계획 문서만** 승인한다. 코드 이식, migration, 테스트 PASS, ja 운영 활성화, OAuth·공급자·법무·출시 승인은 하나도 완료되지 않았다. 계획 §7의 외부 게이트와 Phase8/10/11의 기존 보류 항목도 그대로 남는다.

---

## 1. 스냅샷 재확인

- `rev-parse`: origin/feature/backend `b4749eb851c6…`, origin/feat/#4 `84f6be15dc96…`. README 고정값과 같으며 drift가 없다.
- `git status --short`는 `?? md/feat_plan/`만 표시한다. tracked 코드 변경은 없다.

## 2. Round 1 지적 대응 검증표

| ID | 요구 | 수정 위치 | 독립 검증 결과 | 판정 |
| --- | --- | --- | --- | --- |
| M1 | store/mock 파일을 실사용 기준으로 분류 | branch-analysis §3 표, integration-plan §1 | `git grep`으로 importer 행 번호를 대조했다. account-store(app-header:2,7 / app-sidebar:2,11 / auth-flow-form:2,6 / my-page-dialog:2,25 / profile-setup-form:8 / admin/console:7), projects-store(page-content:8,51), assets-store(9, asset-workspace-body:5, server-session-list:8), session-assets-store(asset-workspace-body:6), mock 타입 5종 모두 일치한다. `monitoring-store`, `mock/monitoring`, `mock/verify`는 importer 0건(레거시)으로 맞다. 분류는 (a) backend 채택, (b) backend 기준 수동 병합, (c) 이식 금지로 명확하다 | 해소 |
| M2 | 34개 비-merge 커밋 추적표 | branch-analysis §5 T01~T34 | `rev-list --no-merges origin/main..84f6be1`의 전체 SHA 집합이 표와 **34/34 일치하고 중복이 없다**. 브랜치 귀속도 맞다(#1 19, #2 8, #3 3, #4 4). 판정·경로·단계·테스트 ID가 모두 채워져 있고, 표가 참조하는 backend 경로 9개가 실재함을 확인했다. Round 1에서 누락으로 지적한 기능이 모두 포함되었다: footer 전환 T14, Inter/Noto Sans JP 글꼴 T01, table/empty-state 토큰, 코드화 T03~T09, badge T24, 접기 T25, c87a267 기존 충족 T26. 폐기는 임시 오류 조건(T18)뿐이며 사용자 기능 과잉 제외는 없다 | 해소 |
| M3 | 결정 가능한 정책의 기본값과 이유 | integration-plan §2.1~2.4, §3, §7 | 다음 기본값과 이유, 변경 시 영향이 모두 기재되었다: namespace(evidence/review), 결과 ID `jobId:itemIndex`(`jobs_schema_version=1` CHECK와 64KiB 근거), idempotencyKey(`scanRequest` 패턴), 80/90 참고용 등급, owner 인가 + ja 고정 출력 + ja UI 링크, 동기 snapshot 발급 포함, nullable 성명 4컬럼(ja 성/이름 필수, kana 선택), 정규화 허용목록, prompt는 job 참조만, `asset.deleted` 및 보관/삭제 metadata 읽기. 외부 조건은 §7 게이트 표로 분리되었다 | 해소 |
| M4 | 3팩 동등성, 하드코딩 6곳, ja 활성화 순서 | integration-plan §2.1 하드코딩 표, §4 L01, §5 | 6개 지점(http.ts, contracts/errors.ts, api/client.ts, account-store.ts, demo/seed.ts, db/seed.ts)별 처리와 검증 ID가 있다. 모든 단계 PR에 세 팩 키·변수 동등성과 en available 유지(L01)를 게이트로 둔다. ja 활성화 순서는 단일 경로로 정해졌다: 비활성 ja 행 seed → 단계5 → 단계6 검수 → 관리자 활성화. `activateInitialLocales`는 불변이다. 이는 `deployedLocales()`의 키 개수·집합·변수 동등 조건(`lib/i18n/packs.ts`)과 `availableLocales`의 `enabled && deployed` 조건과 정합한다 | 해소 |
| M5 | Git 작업 단위·기록·rollback | integration-plan §1.1, §6 | 다음이 정의되었다: `integrate/feat-1-4` 브랜치와 stage별 PR, `Ported-from`/`Plan-trace`/`Integration-stage` trailer, `-s ours`를 쓰지 않는 이유, 6개 ref drift 게이트(재산정 후 재리뷰), PR 단위 revert(`-m 1` 또는 squash SHA), migration 단계의 forward-fix, 원격 feat 브랜치 보존과 coordinator 결정 | 해소 |
| m1 | E2E DB 환경 | §5 | `test:e2e`에 `TEST_DATABASE_URL`이 추가되었고, migrate/seed 선행 순서가 명시되었다. demo 회귀는 `.env.seed.local`과 `claps_demo`를 따로 쓰며, `scripts/README.md:196-210`, `playwright.demo.config.ts`(`DEMO_BASE_URL`), `demo-preview-bootstrap.mjs:5`와 일치한다 | 해소 |
| m2 | next/font 빌드 환경 | §2.1, L03 | 기본은 `next/font/local`로 폐쇄망 빌드를 지원하고, Google 사용 시 조건을 명시했다. glyph/subset/용량 검증이 포함되며 글꼴 기능은 유지된다 | 해소 |
| m3 | Phase 산출물 규칙 | §4 | Phase12 substage 0~6과 plan/test-checklist/result MD·HTML의 대응이 있다. 기존 phase 문서를 덮어쓰지 않는다 | 해소 |
| m4 | jobs_kind CHECK | §2.4, §3, §6 | 동기 DB 발급이라 새 kind가 없고 CHECK도 바뀌지 않는다. 향후 확장 시의 게이트가 명시되었다 | 해소 |
| m5 | 보관/삭제 읽기 정책 | §2.2, §3, E01/R02 | owner에게 metadata와 기발급본 읽기를 허용하고, 파일·write·발급은 차단한다. `requireOwned` 가드(`lib/server/authorization/guards.ts:34`)를 약화하지 않고 별도 read guard를 둔다 | 해소 |
| m6 | i18n barrel 금지 | branch-analysis §3 "신규 파일 이식 금지 경계", §2.1 | `lib/i18n/index.tsx` 생성 금지, locale-switcher 미이식, `language-switcher.tsx`(backend에 실재) 사용이 명시되었다 | 해소 |

## 3. 새 지적 (Minor, 승인 차단 아님)

| ID | 위치 | 내용 | 요구 (단계0 Phase12 plan에서 반영) |
| --- | --- | --- | --- |
| N1 | integration-plan §3 표의 `monitoring_feedback_events` 행 | "version/idem key"라고 적혀 있어, §2.3과 §7에서 확정한 idempotencyKey 단일 기본값과 어긋난다 | idempotencyKey + requestHash 표기로 통일한다 |
| N2 | §2.3 결과 ID와 API 경로 | ID는 `jobId:itemIndex`인데 경로 `/scans/:jobId/results/:resultId`에 jobId가 중복된다. `:`의 URL 인코딩 규칙도 없다 | 경로 `resultId`는 itemIndex(0~49 정수)로 하고 서버가 `jobId:itemIndex`로 조합한다. 또는 전체 ID를 쓰되 path jobId 일치 검증과 인코딩 규칙을 명시한다 |
| N3 | §4 단계1 | T12(users 성명 4컬럼)와 db/seed.ts의 ja 행 추가가 단계1에 들어 있어 단계1에 migration이 생긴다. 그런데 단계1 수용기준에는 빈 DB/기존 DB migration 검증과 코드 revert 호환이 없고, "DB 계약 우선은 단계2"라는 서술과도 어긋난다 | 단계1 수용기준에 migration(빈/0008 복제 DB)과 revert 시 구 코드 호환을 추가한다. 또는 profile 컬럼을 단계2 migration으로 옮긴다 |
| N4 | branch-analysis §2 #1 항목 (`241f620` 설명) | "`lib/account-store.ts` 등은 브라우저 임시 저장이다"는 #1 SHA 기준으로는 맞다. 하지만 §3의 M1 분류(backend 실사용 API client)와 문맥상 충돌해 보인다 | "(#1 f033027 버전 기준)"이라고 한정 문구를 붙인다 |
| N5 | §2 기능 표의 locale/감수 행 | "OAuth는 별도 미결정", "서버 PDF/문서 ZIP은 후속 선택"이라는 초안 문구가 남아 있다. 의미는 §7(외부 게이트, 확장 범위)과 같지만 표현이 다르다 | §7의 용어(외부 활성화 게이트 / 확장 범위)로 통일한다 |

참고(지적 아님): ja 저장 시 `name` 동기화를 "성+공백+이름"으로 정했는데, 일본어 표기 관행(공백 없음 또는 전각 공백)은 원어민 검수 게이트(§7)에서 확인하면 된다.

## 4. 사용자 기능 범위 판단

- #1 locale: 19커밋 전부가 이식 또는 backend 기존 충족으로 대응된다. 폐기는 T18 임시 코드뿐이다. ja 전체 팩, 글꼴, 필수 배지, 성명, 오류 3요소, 접근성, footer 전환, 소셜/LINE UI가 모두 범위 안에 있다. OAuth 실인증만 외부 게이트다.
- #2 evidence: 원장, 타임라인, 접기, 증명서, 인쇄, 생성 badge, 가이드 기준 버전이 서버 영속으로 강화되어 유지된다.
- #3 rationale: 근거, 80/90 확인 필요(참고용), 오탐 신고와 철회, 상세 아이콘, 카드 UX가 유지된다.
- #4 review-package: ja 링크, 자동/수동 체크, 조치 안내, print가 유지된다. 서버 snapshot은 원본보다 강화된 것이다. 원본에 없던 서버 PDF와 외부 전송만 확장 범위로 두었다.
- 과잉 제외나 사용자 기능 삭제는 발견되지 않았다.

## 5. 구현 착수 조건 (계획 승인 이후)

1. 착수 시 README의 6개 ref와 HEAD를 재확인한다(§1.1 drift 게이트).
2. N1~N5를 Phase12 plan(단계0)에 반영한다.
3. 각 단계 PR은 L01과 해당 테스트 ID의 실제 실행 증거를 가진다. 이 리뷰는 어떤 테스트 PASS도 대신하지 않는다.
