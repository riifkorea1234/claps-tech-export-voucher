# 통합계획 독립 검토 — Round 1

- 검토 대상: `md/feat_plan/README.md`, `integration-plan.md`, `branch-analysis.md` (planner 초안, 2026-10-01)
- 검토자: reviewer (Orca task_db3df427528b), 작성일 2026-10-01
- 검토 방법: `git -C /mnt/f/claps-product`로 refs·계보·diff·양측 소스를 직접 조회하고 설치된 `node_modules/next/dist/docs/01-app/`(Next 16.3.3)를 대조했다. 코드·plan 3개 파일 수정, merge·cherry-pick·commit·push·PR, 앱 테스트 실행은 하지 않았다.

## 판정: **CHANGES_REQUESTED**

Blocker 0건, Major 5건, Minor 6건. 계보·SHA·diff 수치와 backend 구현 현황은 대부분 정확하고, "backend 기준 선택적 포팅" 전략도 타당하다. 다만 (1) backend에서 **실제로 쓰이는 API client 파일을 폐기 대상 구형 store로 잘못 분류**했고, (2) 네 브랜치 사용자 기능의 **커밋 단위 포함 여부 추적표가 없어** 누락이 확인되며, (3) 실행 전에 정할 수 있는 정책 다수가 "결정 필요"로 남아 있고, (4) 언어팩 동등성 불변식과 ko/en 하드코딩 지점이 빠졌으며, (5) Git 수준 작업 단위·rollback 절차가 없다. Major가 남아 있으므로 승인하지 않는다.

---

## 1. 독립 확인 결과 (계획과 일치)

| 항목 | 확인 내용 | 결과 |
| --- | --- | --- |
| 고정 SHA 6개 | `rev-parse` 결과 README 표와 동일 (b4749eb / 7f488bb / f033027 / b3b6b66 / dcf5b1f / 84f6be1) | 일치 |
| 누적 관계 | `merge-base --is-ancestor` #1→#2, #2→#3, #3→#4, #1→#4 모두 0. backend↔각 tip merge-base 모두 7f488bb | 일치 |
| backend 고유 커밋 | `c4d46f1`, `b4749eb` 2개 | 일치 |
| diff 수치 | main...#1 62파일 3811/1014, #1..#2 17 / 1183/2, #2..#3 7 / 311/13, #3..#4 9 / 824/18, main...#4 71 / 6108/1026, main...backend 452 | 일치 |
| 중첩 경로 | #4∩backend 48, #4 단독 23. 48경로는 backend에서 모두 `M` | 일치 |
| backend 구현 근거 | `productionHandlers`=export+matching만(`lib/server/adapters/registry.ts:6`), `profileSchema` name/org/role strict(`lib/server/auth/policy.ts:6`), ZIP 이름 `png|jpg|webp`만(`lib/server/exports/zip.ts:9`), monitoring 결과 10출처/50결과·similarity nullable(`lib/contracts/monitoring-result.ts:13-14`), `activateInitialLocales` ko/en만(`lib/i18n/activate.ts:25`), migration 0000~0008, `useLanguage`/`useT`(`lib/i18n/provider.tsx:94,99`), `hasStoredFileReferences`(`lib/server/assets/lifecycle.ts:18`), `AdminAccess`(`lib/server/admin/access.ts:18`), MAX_METADATA_BYTES 64KiB(`lib/contracts/common.ts:3`) | 일치 |
| 검증 명령 | package.json의 lint/typecheck(`next typegen && tsc --noEmit`)/test:unit/i18n/integration/e2e/db:*/worker:health 존재, Node 22.22.0·pnpm 10.34.5, compose 포트 55433, playwright에 webServer 없음 | 일치 |
| Next 관련 판단 | 서버 page wrapper + client page-content 분리, route handler 신설, async Server Component는 E2E로 확인한다는 방침은 설치 docs(05-server-and-client-components, 15-route-handlers, testing)와 모순 없음 | 타당 |

전략 자체(네 브랜치 전체 merge·`theirs` 일괄 선택 금지, #4 누적 tip 기준 기능별 포팅, 서버 원장·권한·transaction 우선)는 승인 가능한 방향이다.

---

## 2. Major (수정 필수)

### M1. backend의 실사용 API client 파일을 "구형 store"로 잘못 분류

- **문서 위치**: `branch-analysis.md` §3 표 마지막 행(`lib/{account-store,assets-store,monitoring-store,projects-store}.ts`, `lib/mock/{...}.ts` — "구형 파일을 수정해도 런타임 활성 기능이 되지 않음; production import 복원 금지"), `integration-plan.md` §1 마지막 문장.
- **소스 증거** (origin/feature/backend):
  - `lib/account-store.ts`는 `/api/me`, `/api/auth/sign-out`을 호출하는 인증 client이며 `components/layout/app-header.tsx:2,7`, `app-sidebar.tsx:2,11`, `components/domain/auth-flow-form.tsx:2,6`, `my-page-dialog.tsx`, `profile-setup-form.tsx:8`, `components/admin/console.tsx:7`에서 import된다.
  - `lib/projects-store.ts`, `lib/assets-store.ts`, `lib/session-assets-store.ts`는 `lib/api/workspace`로 `/api/projects`, `/api/asset-sessions`, `/api/assets`를 호출한다(`app/(app)/projects/[id]/page-content.tsx:8-9`, `components/domain/asset-workspace-body.tsx:5-6`, `server-session-list.tsx:8`).
  - `lib/mock/projects.ts`의 `PROJECT_STATUSES`/`ProjectStatus`/`ProjectCover`, `lib/mock/partners.ts`의 `Factor`/`Partner`, `lib/mock/assets.ts`의 `AssetSession`, `lib/mock/project-detail.ts`의 `ProjectSession`, `lib/mock/guide-analysis.ts`는 런타임 컴포넌트가 import한다.
  - 반면 `lib/monitoring-store.ts`는 backend에서도 localStorage 구현이고 런타임 importer가 없다(진짜 레거시).
- **위험**: 충돌 해결자가 "구형이므로 무시"로 처리하면 #4 쪽 localStorage 버전(`lib/account-store.ts` 등)이 선택되거나, 반대로 #1의 i18n 변경이 필요한 타입·상수 파일이 방치되어 인증·프로젝트 CRUD 회귀가 발생한다.
- **수정 요구**: §3 표의 해당 행을 파일별로 분리해 (a) backend API client로 재사용 중(account/projects/assets/session-assets-store) → backend 버전 고정, #4 변경은 채택 안 함, (b) 런타임 타입·상수 제공 mock(`mock/projects`, `partners`, `assets`, `project-detail`, `guide-analysis`) → backend 버전 기준, #1의 코드화·라벨 키만 이식, (c) 실제 레거시(`monitoring-store`, `mock/monitoring`, `mock/verify` 등 importer 없음) → 이식 금지, 로 분류하고 각 판정의 근거로 `git grep` importer 결과를 남긴다. §1 "구형 localStorage store" 문장도 같은 분류로 교체한다.
- **수용 기준**: 48경로 표의 모든 store/mock 행에 분류(a/b/c)·backend importer 증거·채택 측(backend/#4/수동 병합)이 표시되어 있음.

### M2. 네 브랜치 사용자 기능의 커밋 단위 포함 추적표 부재 — 실제 누락 확인

- **문서 위치**: `integration-plan.md` §2 표·§4 단계0("이식 추적표"를 구현자에게 미룸), `branch-analysis.md` §2.
- **소스 증거**: `git rev-list --no-merges origin/main..origin/feat/#4-review-package` = 34개 커밋. 계획 본문에 대응 처리가 없거나 불명확한 사용자 가시 기능:
  - `aca3bcc` 랜딩 푸터 언어 전환 버튼 → backend에는 `components/layout/language-switcher.tsx`가 이미 있음. `locale-switcher.tsx`를 폐기하고 어디(랜딩 푸터 포함)에 language-switcher를 배치할지 미기재.
  - #1 `app/layout.tsx`의 `next/font/google` **Inter + Noto_Sans_JP** 로딩과 `app/globals.css`의 `--font-locale`, `:root[data-locale="ja"]` font-weight 재정의 → "CSS 토큰"으로만 뭉뚱그려짐. 일본어 글꼴은 ja UI 품질의 핵심 기능이다.
  - `components/ui/table.tsx`(`--row-head-h`, `--pad-cell`), `components/domain/empty-state.tsx`(`whitespace-pre-line`) — #4 단독 23경로에 있으나 계획 어디에도 처리 없음(locale 밀도 토큰 의존).
  - `ef81994` 날짜 그룹, `2b3b63a` 프로젝트 상태 코드, `b7dce4e` 판정/규칙 코드, `eb2119b` 탐지 플랫폼 코드, `82ccdd1`/`e7f6232` 파트너 추천 근거 라벨·정렬 기준 코드화, `2a2be80` 진행 단계 코드화 → backend에 이미 코드화된 부분과의 대응 여부 미기재.
  - `2fdf48b`의 "생성 화면 기록 표시"(작업공간 evidence badge), `590b9a7` 연속 사건 접기 → §2.2에 UI 연결이 일반론으로만 있음.
  - `c87a267` 프로젝트 가이드 저장 → backend `brand_guides`(projectId/version/file, `db/schema.ts` brand_guides)로 **이미 대체됨**을 명시해야 중복 구현을 막는다.
  - 폐기 대상 명시 필요: `0cb0705`(f033027에서 제거됨; 계획에 있음), `366b1be` localStorage 선반영 스크립트 hydration 수정, `9192482` use client 추가, `b4b4a28` 카드 여백 → 이식/폐기/이미 충족 판정.
- **수정 요구**: branch-analysis에 **34개 비-merge 커밋 전부**를 행으로 하는 추적표를 추가한다. 열: 원본 SHA / 브랜치 / 사용자 기능 요약 / 판정(이식·backend로 이미 충족·서버 신규 구현 후 이식·폐기) / 대상 backend 경로 / 이식 단계(1~5) / 검증 항목(테스트 또는 E2E 시나리오 ID). "폐기"는 사유 필수.
- **수용 기준**: 34행 누락 없음(명령 재현 가능), 모든 행이 단계와 수용시험에 연결, 폐기 행은 사용자 기능 손실이 없거나 제품 결정으로 승인된 것임을 표시.

### M3. 실행 전에 정할 수 있는 정책이 기본 결정 없이 남아 있음

- **문서 위치**: `integration-plan.md` §2.1(namespace "먼저 표로 결정", normalize 범위, 성명 저장 위치), §2.3(결과 ID 두 방식 병기, "version 또는 idempotencyKey", 80/90 "평가 후 결정"), §2.4(비ja 직접 URL "정책을 결정", POST 발급 "선택 범위 확정 후"), §3 profile "nullable 또는 versioned JSON", §7 표.
- **판단**: 아래는 운영 자격증명이나 공급자 없이 지금 결정할 수 있고 schema/API를 좌우하므로, 계획에 **기본 결정 + 이유**가 있어야 단계1·2를 착수할 수 있다. 제품/법무 승인이 필요한 것은 "기본값으로 구현, 승인 게이트로 활성화"로 표현하면 된다.
- **수정 요구 (reviewer 권고 기본값, planner가 다른 값을 택하면 이유 기재)**:
  1. **messages namespace**: `evidence`, `review` 신규 namespace 추가(core `namespaces`·`uiNamespaces`·test:i18n 동시 갱신) vs `assets` 편입 중 택1.
  2. **monitoring 결과 ID**: 조회 시 `jobId + item index`(또는 index+url hash) 기반 결정적 ID. 이유: `jobs.output`은 불변이고 `jobs_schema_version = 1` CHECK(`db/schema.ts:79`)와 64KiB 한도 때문에 output 버전 변경은 migration·호환 비용이 크다.
  3. **feedback 멱등성**: 기존 `scanRequest`/`matchRequestSchema`와 같은 `idempotencyKey` 패턴(`lib/contracts/monitoring.ts:7`) 채택.
  4. **80/90 임계**: 운영 판정값 승인 전까지 high/review 판정 배지를 표시하지 않고 근거 수치·"판단 불가"만 표시(또는 "참고용" 문구로 표시) 중 택1, 기본값 명시.
  5. **감수 패키지 locale 게이트와 직접 URL**: 예) 기능 자체는 locale과 무관하게 인가된 소유자에게 제공하고 출력 언어만 ja 고정, 진입 링크는 ja UI에서만 노출 — 또는 비ja에서 안내 화면. 택1.
  6. **발급 snapshot(POST)**: 이번 범위 포함/제외 기본값. 제외 시 단계5 수용기준에서 발급 경쟁 항목을 조건부로 표시.
  7. **일본어 성명 저장**: `users`에 nullable `family_name`/`given_name`/`family_name_kana`/`given_name_kana` 컬럼(기존 `name` 유지) vs versioned JSON 택1, ja 로케일에서 필수 여부 기본값.
  8. **normalize-input 적용 필드**: 이름·조직·검색어 등 허용목록으로 고정.
  9. **증빙 원장의 prompt 저장**: 원장에 prompt 원문을 복제하지 않고 `job_id` 참조만 저장(민감정보 최소화) 등 기본값.
  10. **자산 삭제 사건**: backend는 자산을 `deleted_at` soft delete(`lib/server/projects/service.ts:153`)하므로 `asset.deleted` 사건 kind 추가 여부와 삭제 자산 증명서 조회 정책.
- **수용 기준**: §7 표의 "결정 필요" 중 운영 자격증명·공급자·법무 승인과 무관한 항목이 모두 "기본 결정/이유/변경 시 영향"을 가짐. 남는 것은 조건부 게이트(M3 대상 외: OAuth secret, 공급자 계약, 보존기간 법무, 원어민 검수)뿐.

### M4. 언어팩 동등성 불변식과 ja 활성화 순서, ko/en 하드코딩 지점 누락

- **문서 위치**: `integration-plan.md` §2.1, §4 단계1·3·4·5, §6.
- **소스 증거**:
  - `lib/i18n/packs.ts` `deployedLocales()`는 각 locale 팩의 **키 개수·키 집합·변수가 ko와 완전히 같아야** 배포 locale로 인정한다. `availableLocales()`는 DB `enabled && deployed`(`lib/i18n/server.ts`). 따라서 단계3~5에서 ko에 키를 추가하면서 en/ja를 같은 변경에 넣지 않으면 **en(운영 활성)과 ja가 조용히 선택 불가**가 된다.
  - 코드 하드코딩: `lib/server/errors/http.ts:17`(requestContext locale ko/en), `lib/contracts/errors.ts:3`(`ErrorLocale = "ko" | "en"`, `errorMessages={ko,en}`), `lib/api/client.ts:12`·`lib/account-store.ts:9`(클라이언트 네트워크 오류 fallback ko/en), `lib/server/demo/seed.ts:25`(데모 콘텐츠 ko/en), `lib/server/db/seed.ts:8-9`(locale 행 ko/en만, ja 행 없음), `lib/i18n/activate.ts:25`.
- **수정 요구**:
  1. "모든 단계의 신규 키는 ko/en/ja 세 팩에 같은 변경으로 추가, test:i18n이 게이트" 불변식을 §4 공통 규칙과 각 단계 수용기준에 추가.
  2. 위 하드코딩 6곳을 단계1 작업 항목으로 명시하고 ja 처리 방식(예: `ErrorLocale`을 배포 팩 기반으로 일반화, 클라이언트 fallback은 `<html lang>` 기반 3언어) 결정.
  3. ja locale 행 생성 방법의 기본값(seed에 `enabled:false` ja 행 추가 + 관리자 활성화 등)과 `activateInitialLocales`를 건드리지 않는 이유 명시.
  4. **ja 활성화 시점**을 단계와 연결: 예) ja 팩은 단계1부터 비활성으로 배포하되 활성화는 단계5 완료 + 원어민 검수 후. 감수 패키지(#4)가 ja 전용 기능이므로 활성화 순서가 기능 가용성과 맞아야 한다.
  5. 데모 콘텐츠·`test:demo`(`playwright.demo.config.ts`)에서 ja의 처리(미제공 시 fallback 확인) 명시.
- **수용 기준**: 단계별 "3팩 키 동등 + en 활성 유지" 검증 항목 존재, 하드코딩 6곳 각각의 처리·테스트 존재, ja 활성화 게이트 조건이 단일 위치에 명시.

### M5. Git 수준 작업 단위·포팅 기록·코드 rollback 절차 부재

- **문서 위치**: `README.md` "기록상 원본 SHA와 이식 항목을 남겨", `integration-plan.md` §1, §6(배포 rollback만 있음).
- **문제**: 통합 대상 브랜치가 `origin/feature/backend`인데 작업 브랜치 명명, 단계별 PR/커밋 단위, 포팅 출처 기록 형식, 단계 실패 시 코드 revert 단위, 원격 feat 브랜치의 이후 처리(추가 커밋 발생 시 대응, 통합 완료 표시)가 없다. 선택적 포팅은 Git 계보에 흔적이 남지 않으므로 기록 형식이 정해지지 않으면 "향후 중복 반영 방지" 목표를 검증할 수 없다.
- **수정 요구 (기본값 제시)**:
  1. `feature/backend`에서 분기한 통합 브랜치(예: `integrate/feat-1-4`) 또는 단계별 브랜치, 단계=PR 1개, 단계 내부는 revert 가능한 원자 커밋.
  2. 각 커밋 메시지에 `Ported-from: <sha>[, <sha>]` trailer와 M2 추적표 행 ID 기록. `-s ours` 기록용 merge 사용 여부 기본값(권고: 사용하지 않음, 추적표로 대체 — 또는 사용 시 이유).
  3. 착수 시 refs drift 게이트: 고정 SHA와 `git rev-parse` 불일치 시 추적표 재산정 후 진행.
  4. 코드 rollback: 단계 PR 단위 `git revert`, DB migration이 포함된 단계는 §6의 forward-fix 원칙과 연결(코드 revert 시 추가 테이블 잔존 호환성).
  5. 통합 완료 후 원격 feat/#1~#4 브랜치 처리(보존/보관 태그, 신규 커밋 금지 안내)는 coordinator 결정 항목으로 명시.
- **수용 기준**: 작업 브랜치·PR 단위·trailer 형식·drift 게이트·revert 단위가 문서에 정의되고, 추적표(M2)와 커밋이 1:N으로 대조 가능.

---

## 3. Minor (반영 권장)

| ID | 위치 | 증거 | 수정 요구 |
| --- | --- | --- | --- |
| m1 | integration-plan §5 명령 | `tests/e2e/admin.spec.ts:16`, `phase10.spec.ts:8`, `jobs.spec.ts:7`은 playwright 프로세스의 `TEST_DATABASE_URL`(경로 `/claps_test`)을 요구, 없으면 `ISOLATED_DB_REQUIRED` | `test:e2e` 명령에 `TEST_DATABASE_URL` 추가, E2E 전 테스트 DB에 `db:migrate`/`db:seed` 적용 순서 명시, `test:demo`·`db:seed:demo` 회귀 포함 |
| m2 | §5 환경조건 | #1 layout의 `next/font/google`(Inter, Noto_Sans_JP)은 build 시 Google Fonts 다운로드 필요 (`docs/01-app/01-getting-started/13-fonts.md`) | 폐쇄망 CI build 가능 여부 또는 `next/font/local` 대안, ja 글꼴 subset/용량 확인을 검증 환경에 추가 |
| m3 | §4 단계 구성 | `md/phase-development-process-rules.md` §2~3: 각 Phase는 plan/test-checklist/result(md+html) 필수 | 단계0~6을 프로젝트 Phase 규칙 산출물과 매핑(파일명 규칙 포함) |
| m4 | §3 evidence_events | 신규 job kind 도입 시 `jobs_kind` CHECK(`db/schema.ts:78`) 변경 migration 필요 | 감수 발급을 export kind 재사용할지 새 kind인지 결정과 CHECK 변경·구 worker 호환을 §3/§6에 명시 |
| m5 | §2.2, §3 | 보관 세션(`archived_at`)·삭제 자산의 증빙/증명서 **읽기** 정책 미정(쓰기 차단만 기재) | 보관/삭제 부모의 조회 허용 여부 기본값 명시 |
| m6 | branch-analysis §3 | #1 `locale-switcher.tsx`·`lib/i18n/{config,index,ko,en,ja}` 신규 파일은 backend `lib/i18n/` 디렉터리에 `index.tsx` barrel을 새로 만들어 `@/lib/i18n` import 해석을 바꿀 수 있음 | 해당 신규 파일은 "이식 금지, 사전 키만 messages로 변환"으로 명시하고 `lib/i18n/index.tsx` 생성 금지 규칙 추가 |

---

## 4. 재검토(Round 2) 승인 조건

1. M1~M5 각 수정 요구가 문서에 반영되고 수용 기준 항목이 충족됨.
2. M2 추적표가 `git rev-list --no-merges origin/main..84f6be1` 34행과 1:1 대조 가능.
3. §7 미결정 표에는 외부 조건(OAuth 자격증명·공급자 계약/품질·법무 보존기간·원어민 검수·운영 RPO/RTO)만 조건부 게이트로 남고, 나머지는 기본 결정·이유를 가짐.
4. 고정 SHA 재확인 결과가 변하지 않았거나, 변했다면 재산정 결과가 반영됨.
5. Minor는 반영 또는 "미반영 사유"를 기재.

## 5. 재현 명령 (읽기 전용)

```bash
G="git -C /mnt/f/claps-product"
$G rev-list --no-merges --count origin/main..'origin/feat/#4-review-package'   # 34
$G grep -nE "from ['\"]@/lib/(account-store|projects-store|assets-store|session-assets-store|mock/)" origin/feature/backend -- app components
$G show origin/feature/backend:lib/i18n/packs.ts            # deployedLocales 동등성 검사
$G grep -nE '\["ko", ?"en"\]|"ko" \| "en"' origin/feature/backend -- lib
$G show origin/feature/backend:lib/server/db/seed.ts        # ja 행 없음
$G diff origin/main...'origin/feat/#4-review-package' -- app/layout.tsx components/ui/table.tsx components/domain/empty-state.tsx
```
