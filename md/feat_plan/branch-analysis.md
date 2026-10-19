# 브랜치별 근거와 충돌 분석

상태: **APPROVED / Round2 계획 승인, N1~N5 최종보완 — 구현 미착수**. SHA와 조사 시점은 [README](README.md)를 따른다. 아래 구현 상태는 해당 SHA의 소스를 읽은 결과이며 현재 통합되었다는 뜻이 아니다.

[Round 1 검토](review-round-1.md) → [Round 2 APPROVED](review-round-2.md). 승인은 계획 문서에 한정하며 코드 실행·테스트 PASS·운영 활성화·출시 승인과 별개다. N1~N5 최종보완과 Orca 작업 기록은 [README](README.md)에 기록했다.

## 1. 실제 계보

```text
7f488bb main ── c4d46f1 ── b4749eb backend
     └─ #1 개발 ── f033027 ─┐
          #2 개발 ────────── b3b6b66 (merge) ── #3 dcf5b1f ── #4 84f6be1
```

#2는 #1의 마지막 수정 f033027을 b3b6b66에서 merge했다. 따라서 날짜·브랜치 이름으로 누적을 추정한 것이 아니라 도달 가능성을 확인한 결과다.

| ancestor A → 대상 B | 종료 코드 | 해석 |
| --- | --- | --- |
| main → backend 및 #1/#2/#3/#4 각각 | 0 | 공통 기반 포함 |
| #1 → #2, #1 → #3, #1 → #4 | 각각 0 | #1 tip 전체 포함 |
| #2 → #3, #2 → #4 | 각각 0 | #2 tip 전체 포함 |
| #3 → #4 | 0 | #3 tip 전체 포함 |
| backend → 각 기능 tip, 각 기능 tip → backend | 각각 1 | 양쪽 분기, backend에 기능 tip 미통합 |

backend와 각 tip의 `git merge-base`는 모두 `7f488bb9d4aa0cc6319f617e7934751e91fd9c51`. 기능 pair의 merge-base는 앞 단계 tip이다. backend의 main 이후 로그는 `c4d46f1 feat: implement backend workflows and validated demo content`, `b4749eb feat: simplify admin navigation and improve CRUD workflows` 두 커밋이다.

| diff 기준 | 파일 수 | 삽입/삭제 | 용도 |
| --- | ---: | --- | --- |
| main...#1 | 62 | 3811 / 1014 | locale 전체 도입 |
| #1..#2 | 17 | 1183 / 2 | 증빙 고유 증가분 |
| #2..#3 | 7 | 311 / 13 | 근거·오탐 고유 증가분 |
| #3..#4 | 9 | 824 / 18 | 감수 패키지·LINE 수정 |
| main...#4 | 71 | 6108 / 1026 | 네 기능 누적, 단순 합계 금지 |
| main...backend | 452 | 별도 대규모 backend 구현 | 보존 기준 |

## 2. 기능별 소스 증거

### #1 locale / f033027

- `a4e6653`: `lib/i18n/{config.ts,index.tsx,ko.ts,en.ts,ja.ts}`, `components/layout/locale-switcher.tsx`의 ko/en/ja 전환, CSS locale 토큰. `index.tsx`는 localStorage를 읽고 서버 snapshot은 항상 ko다.
- `241f620`: `lib/format-date.ts`, `lib/normalize-input.ts`, `components/domain/profile-fields.tsx`의 ISO 날짜·일본어 성명 입력. `lib/account-store.ts` 등은 **#1 f033027 버전 기준** 브라우저 임시 저장이다(backend b4749eb는 §3의 실사용 API client 분류를 따른다).
- `185f597`, `1912692`, `126c0cd`, `9c4a369`: 포커스/alt/200% 확대, 必須/任意 표시, 일본어 동사·오류 대상/사유/조치 문구.
- `b5607ab` 및 #4의 `9d0f157`, `84f6be1`: `components/domain/social-login-buttons.tsx`의 언어별 소셜 버튼과 `public/line-logo-white.png`. 버튼 제공과 실제 OAuth 구현은 별개다.
- `0cb0705` 임시 이메일 오류 코드는 `f033027`에서 제거되므로 제거된 최종 상태를 기준으로 한다. 임시 커밋만 선택해서 가져오지 않는다.
- backend b4749eb의 `app/layout.tsx`, `lib/i18n/{provider,server,packs,activate}.ts[x]`, `messages/{ko,en}/*.json`, `/api/locale`, `/api/locales`는 이미 서버 언어 판별·cookie/계정 선호·완전한 파일팩·DB 활성화·fallback 체계다. `activate.ts`는 ko/en 초기행만 활성화한다. 일본어와 새 문구는 현재 messages 체계로 새로 이식한다.
- backend `lib/server/auth/policy.ts`의 profileSchema는 name/org/role만 받는다. 성명 분리/읽는 법 필드 영속화는 새 계약이며 기존 strict schema에 브라우저 필드를 그대로 보내면 실패한다.

### #2 evidence / b3b6b66

- `6cbed1c`의 `lib/evidence-store.ts`: EvidenceKind 7종(`session.created`, `generate.run`, `asset.adopted`, `asset.unadopted`, `verify.run`, `final.added`, `final.removed`), GenerateConditions, VerifySummary, AssetCertificate. localStorage `claps:evidence:<sessionId>`; 저장 오류 무시·clearEntries 제공. 서버 증빙 원장으로 사용할 수 없다.
- `5187ad4`: `components/domain/asset-workspace-body.tsx`에서 생성·채택 시 addEntry, verify/final 페이지의 사건 기록. 클릭시점 기록은 worker 완료시점 증거와 다르다.
- `d07302f`, `590b9a7`: `components/domain/evidence-timeline.tsx`의 타임라인 및 연속 사건 접기.
- `2fdf48b`: `components/domain/{asset-certificate,evidence-badge}.tsx`, `app/(app)/assets/[id]/evidence/page.tsx` 출력 화면, final 화면 링크/증명서. 경로의 `[id]`는 세션 ID이므로 새 API에서 개별 asset ID와 혼동하지 않는다.
- `c87a267`: `lib/mock/projects.ts`/프로젝트 화면의 guideName. 파일명은 가이드 revision/checksum 증거를 대체하지 않는다.
- backend `db/schema.ts`: asset_sessions, assets.generation_job_id/verification_job_id/finalized_guide_id, brand_guides.version/file, jobs.input/output가 이미 영속한다. `lib/server/{verifications/handler,finalizations/service}.ts`가 실제 검증 snapshot·가이드 version·job 결과 비교·낡은 검증 금지를 제공한다. 인간 채택/취소 반복의 append-only 원장·증명서 API는 새로 필요하다.

### #3 rationale / dcf5b1f

- `274652f`: `lib/monitoring-store.ts`에 factors(character/color/composition/logo), reportedFalse, scanVerdictOf(90 이상 high, 80 이상 review, 나머지 low) 도입. `components/domain/scan-factor-bars.tsx`, 상세 페이지에 근거·확인 필요·오탐 toggle. 상세 페이지의 factors는 하드코딩된 목업 값이다.
- `b4b4a28`, `dcf5b1f`: 카드 오탐 버튼 삭제, 상세 패널의 작은 아이콘 버튼·aria-pressed 유지. 최종 UX를 이식한다.
- backend `lib/contracts/monitoring-result.ts`는 results/empty/partial, 출처별 성공/실패, URL/source/similarity(nullable)/discoveredAt을 검증하며 10출처·50결과 한도다. factors·안정된 item ID·신고 원장은 없다. `lib/server/monitoring/{service,handler}.ts`와 `/api/monitoring-records/...`는 원본 저장·실행 jobs·최근 성공 보존을 이미 구현한다.
- [Phase10 결과](../phase10-result.md)는 실제 공급자 미연결 503, localStorage 이력의 실제 탐지 이력 자동 승격 금지, 서버 외부 썸네일 fetch 미구현을 명시한다. 테스트 adapter의 성공을 운영 공급자 구현으로 표기하지 않는다.

### #4 review-package / 84f6be1

- `c503012`: `app/(app)/assets/[id]/review-package/page.tsx`(488줄), `lib/review-package-store.ts`, verify/final의 `locale === "ja"` 링크.
- 자동 항목: 최종본 존재·검증·이력; 수동: copyrightNotice/thirdPartyAssets/recipientConfirmed. 저장은 세션별 localStorage `claps:review-checks:`이며 actor/version/snapshot이 없다.
- `e0d4077`: 자동 항목을 클릭 불가로 구분하고 채우는 경로 안내. 페이지는 `window.print()` 출력이며 서버 PDF/ZIP 생성·판권사 전송·심사 승인 workflow를 구현한 것은 아니다. 일본어 링크 조건이 직접 URL 권한을 보장하지 않는다.
- backend `lib/contracts/exports.ts`/`lib/server/exports/{service,handler,guards,zip}.ts`의 export job·최종본 가드·24시간 download capability는 재사용 가능. 현 ZIP은 이미지 확장자만 허용하므로 문서 manifest/PDF를 곧바로 추가할 수 없다. 감수 snapshot·수동 체크 서버 API와 문서 출력 확장은 신규다.

## 3. 중첩 파일과 해결 기준

main 기준 양쪽 변경 집합의 교집합은 48경로다. merge를 실행하지 않았으므로 아래는 **충돌 후보 및 의미 충돌**이다. 선택적 포팅에서도 동일 기준으로 리뷰한다.

| 후보 경로 | 해결 기준 |
| --- | --- |
| `app/(app)/assets/{page.tsx,[id]/page.tsx,[id]/verify/page.tsx,[id]/final/page.tsx}` | backend requirePage 서버 wrapper/Promise params 유지; 기능 JSX는 page-content 또는 domain component로 이동; 서버 asset API·verification/finalization 가드 유지 |
| `app/(app)/monitoring/{page.tsx,[id]/page.tsx}` | backend monitoring-workspace와 scans/jobs API 유지; 목업 결과·timer를 가져오지 않고 근거/신고 UI만 실제 DTO에 연결 |
| `app/(app)/projects/{page.tsx,[id]/page.tsx,[id]/sessions/page.tsx}`, `app/(app)/partners/{page.tsx,criteria/page.tsx}` | 실제 CRUD·검색·버전·localized_contents 유지; 원본 locale 라벨/배지·날짜 표시만 변환 |
| `app/{layout.tsx,page.tsx,login/page.tsx,forgot-password/page.tsx}` | 서버 LanguageProvider/metadata/인증 유지; 기능 LocaleProvider/localStorage 초기화 스크립트로 대체 금지 |
| `components/domain/{asset-result-card,asset-row,asset-workspace-body,confirm-delete-dialog,factor-bars,forgot-password-form,image-lightbox,login-email-form,monitoring-info,my-page-dialog,new-project-dialog,pagination,partner-card,profile-fields,profile-setup-form,search-bar,session-row-shell,session-row,status-badge,tilt-monitor-preview,workspace-topbar}.tsx` | 실제 이벤트·pending/error·API 동작을 보존하며 번역/레이아웃만 항목별 병합; evidence-store 호출을 그대로 삽입하지 않음 |
| `components/layout/{app-header,app-sidebar,auth-shell}.tsx`, `lib/nav.ts` | backend 관리자 동선(b4749eb)·인증 로그아웃·서버 locale 전환 유지 |
| `lib/account-store.ts` | (a) 실사용 인증 API client, backend 채택; #4 localStorage 버전 제외. importer: app-header.tsx:2,7 / app-sidebar.tsx:2,11 / auth-flow-form.tsx:2,6 / my-page-dialog.tsx:2,25 / profile-setup-form.tsx:8 / admin/console.tsx:7. ja 오류 fallback·새 profile DTO만 수동 병합 |
| `lib/projects-store.ts` | (a) 실사용 프로젝트 API client, backend 채택; importer: projects/[id]/page-content.tsx:8, projects/page-content.tsx:51. #4 localStorage 대신 lib/api/workspace 유지 |
| `lib/assets-store.ts` | (a) 실사용 세션 API client, backend 채택; importer: projects/[id]/page-content.tsx:9, asset-workspace-body.tsx:5, server-session-list.tsx:8. 실제 서버 생성/버전 유지 |
| `lib/session-assets-store.ts` (48경로 밖 연동 보호 대상) | (a) 실사용 에셋 API client, backend 채택; importer: asset-workspace-body.tsx:6. 증빙 UI 이식 중 서버 삭제/채택 API 유지 |
| `lib/mock/projects.ts` | (b) 실사용 상태 상수/타입, backend 기준 수동 병합; importer: projects/[id]/page-content.tsx:10, projects/page-content.tsx:46, cover-thumb.tsx:1, status-badge.tsx:4, session-row-shell.tsx:6. #1 코드/라벨 대응만 이식 |
| `lib/mock/partners.ts` | (b) 실사용 Factor/Partner 타입, backend 기준 수동 병합; importer: factor-bars.tsx:5, partner-card.tsx:6. 실제 partner/matching DTO를 mock 결과로 교체 금지 |
| `lib/mock/project-detail.ts` | (b) 실사용 ProjectSession 타입, backend 기준 수동 병합; importer: session-row.tsx:10. 진행 단계 코드/라벨만 대응 |
| `lib/mock/assets.ts` (48경로 밖) | (b) 실사용 AssetSession 타입, backend 기준 수동 병합; importer: asset-row.tsx:18. 샘플 asset 배열을 실제 데이터로 연결 금지 |
| `lib/mock/guide-analysis.ts` (48경로 밖) | (b) guideAnalysisRules 실사용, backend 기준; importer: guide-analysis-panel.tsx:6. 현재 표시 의미 보존, 공급자 결과로 승격 금지 |
| `lib/monitoring-store.ts` | (c) localStorage 레거시, backend app/components/lib importer 0건; #4 구현 이식 금지, factors/feedback 개념은 실제 API로 신규 구현 |
| `lib/mock/verify.ts`, `lib/mock/monitoring.ts` (후자는 48경로 밖) | (c) backend app/components/lib importer 0건; 목업 판정/탐지 결과 이식 금지. 실제 contracts/metadata·monitoring-result를 사용 |


교집합 외에도 `app/globals.css` locale 토큰/print CSS, 신규 `lib/i18n/index.tsx`와 backend i18n module 해석, 증빙/패키지 신규 페이지의 mock 의존성은 의미 충돌이다. 교집합 밖의 23경로에는 기존 공통 파일도 포함되므로 모두 신규 파일 또는 안전한 단순 추가로 간주하지 않는다. CSS는 backend 화면 390px/200%와 관리자 회귀를 확인하며 namespace 영향범위를 좁힌다.

### 신규 파일 이식 금지 경계

#1의 `components/layout/locale-switcher.tsx`, `lib/i18n/{config.ts,index.tsx,ko.ts,en.ts,ja.ts}`는 통째로 이식하지 않는다. **backend에 lib/i18n/index.tsx barrel을 생성하지 않는다.** 사전 키/문구는 messages로 변환하고 호출은 provider.tsx의 useLanguage/useT를 명시 사용한다. 기존 language-switcher.tsx를 랜딩 footer에 배치한다. --font-locale/ja weight·table 밀도/empty-state 줄바꿈은 이식하되 server LanguageProvider·Promise params·client 경계를 유지한다.

Importer 판정 재현: `git -C /mnt/f/claps-product grep -nE 'from .*lib/(account-store|projects-store|assets-store|session-assets-store|mock/)' origin/feature/backend -- app components` 및 `git ... grep -nE 'monitoring-store|mock/monitoring|mock/verify' origin/feature/backend -- app components lib`(후자는 종료1/0건). 타입 import도 컴파일 의존이므로 사용중으로 분류했다. mock 파일명만으로 폐기 판정하지 않는다.

## 4. 재현 명령 (읽기 전용)

```bash
git -C /mnt/f/claps-product status --short
git -C /mnt/f/claps-product rev-parse HEAD origin/main 'origin/feat/#4-review-package'
git -C /mnt/f/claps-product merge-base origin/feature/backend 'origin/feat/#4-review-package'
git -C /mnt/f/claps-product merge-base --is-ancestor f033027 b3b6b66
git -C /mnt/f/claps-product merge-base --is-ancestor b3b6b66 dcf5b1f
git -C /mnt/f/claps-product merge-base --is-ancestor dcf5b1f 84f6be1
git -C /mnt/f/claps-product log --oneline origin/main..origin/feature/backend
git -C /mnt/f/claps-product diff --stat origin/main...84f6be1
git -C /mnt/f/claps-product diff --name-only origin/main...84f6be1
git -C /mnt/f/claps-product diff f033027 b3b6b66 -- 'components/domain/asset-workspace-body.tsx'
git -C /mnt/f/claps-product show '84f6be1:lib/evidence-store.ts'
git -C /mnt/f/claps-product show '84f6be1:lib/review-package-store.ts'
```

ancestor 종료 코드 0/1은 각각 포함/미포함이며 1을 도구 실패로 해석하지 않는다. commit·파일 근거는 고정 스냅샷에서만 유효하므로 실제 구현 착수 전에 refs 변동·새 작업 트리 변경을 재확인한다.

## 5. 비merge 34커밋 포함 추적표 (Round 1 수정)

`git rev-list --no-merges origin/main..84f6be1`의 실제 집합과 1:1 대조한다. ID는 Ported-from/Plan-trace trailer 및 단계 결과보고서의 기준이며 테스트 ID는 integration-plan §5에서 정의한다. 판정은 주요 변경 기준이고 backend로 이미 충족 행도 ja 문구/표시 이식은 빠뜨리지 않는다. 폐기는 임시 오류 조건에만 적용하며 사용자 기능은 제거하지 않는다. 80/90은 참고용·침해 판정 아님으로 이식하고 소셜은 credential 활성화 게이트와 UI 이식을 분리한다.

| ID | 원본 full SHA | 브랜치 | 사용자 기능 | 판정/근거 및 대상 backend 경로 | 단계 | 테스트 ID |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | a4e66539e7a0e06db9285a7a450ac613cd1730d8 | #1 | 언어 전환·locale 토큰·Inter/Noto Sans JP | **이식**: lib/i18n/provider.tsx, app/layout.tsx, app/globals.css, messages, components/ui/table.tsx, domain/empty-state.tsx | 1 | L01/L03/L05 |
| T02 | 487c284a23c11299eca3fac6e164cb2a36d93fca | #1 | 공통 뼈대·프로필 문구 | **이식**: components/layout, domain/profile-fields.tsx, messages/{ko,en,ja} | 1 | L01/L05 |
| T03 | 2b3b63a637fc903b43010277cec718d20c9daa1f | #1 | 프로젝트 홈 문구·상태 코드 | **backend로 이미 충족**: mock/projects.ts PROJECT_STATUSES·projects/page-content.tsx 기준, ja 라벨만 이식 | 1 | L01/L04 |
| T04 | 2a2be80eb7af6bb7a770cc446c04218135c132e9 | #1 | 프로젝트 상세 진행 단계 코드 | **이식**: projects/[id]/page-content.tsx, mock/project-detail.ts 타입·서버 상태를 locale 라벨로 대응 | 1 | L01/L04 |
| T05 | 82ccdd1f6426c309bba0c4383cff39d303e5a93f | #1 | 파트너 근거·정렬 코드/문구 | **이식**: partners/page-content.tsx, contracts/matching.ts·messages/partners 기존 서버 정렬 유지 | 1 | L01/L04 |
| T06 | e7f6232d56b8bd3b758ef6d36e32f66d58355c10 | #1 | 파트너 mock 사전 분리·라벨 폭 | **이식**: domain/partner-card.tsx·factor-bars.tsx, mock/partners.ts 타입만, 실제 API 데이터 유지 | 1 | L03/L04 |
| T07 | ef819943f7dfbb91029c4efcbc7b939b99083bf6 | #1 | 생성 날짜그룹·스타일 코드 | **이식**: domain/asset-workspace-body.tsx, assets/page-content.tsx·i18n/format.ts, 서버 ISO 유지 | 1 | L01/L04 |
| T08 | b7dce4e27416f96bc4ea0a9dff534232915c5abe | #1 | 검증 판정·규칙 코드/문구 | **backend로 이미 충족**: contracts/metadata.ts·verification.ts 및 domain/asset-verification.tsx, ja 라벨 추가·pass/warn/reject/unknown 보존 | 1 | L01/L04 |
| T09 | eb2119b272faa4facbd0a06dad8b4d4712071c41 | #1 | 탐지 플랫폼 코드/문구 | **이식**: domain/monitoring-workspace.tsx, contracts/monitoring-result.ts source 기반 ja 라벨, 플랫폼 enum 강제 금지 | 1 | L01/L04 |
| T10 | b5607abc4e35942515ca131317b67253847a34e8 | #1 | 로그인 문구·국가별 소셜 버튼 | **이식**: app/login/page.tsx·domain/social-login-buttons.tsx 새 UI, provider 미설정 비활성·이메일 인증 유지 | 1 | L01/A01 |
| T11 | b15b215bd952e154553c45f3831c3b00be188b71 | #1 | 랜딩 문구·부품화 | **이식**: app/page.tsx·messages/landing, backend 랜딩 데이터/언어 로딩 보존 | 1 | L01/L03 |
| T12 | 241f620fa9f502ce15ae2bef1bd18f59c2584231 | #1 | ISO 날짜·일본어 성명 | **서버 신규 구현 후 이식**: db/schema.ts users nullable 컬럼, auth/policy.ts·service.ts, account-store.ts DTO·profile-fields.tsx | 1 | L04/L05 |
| T13 | 185f5978b56ad69c531d4374a38bd714cf5cb7ef | #1 | 포커스·alt·200% 확대 | **이식**: app/globals.css, domain/image-lightbox.tsx 및 사용자/관리자 화면 | 1 | L03/L05 |
| T14 | aca3bcc93ff2d3b364d4d823cf39a8d06d1f0b6c | #1 | 랜딩 footer 언어 전환 | **이식**: app/page.tsx footer에 layout/language-switcher.tsx 배치, locale-switcher 이식 제외 | 1 | L01/L05 |
| T15 | 9c4a3695cc4b26e4502a46a0f43df3f0c2464e4a | #1 | 오류 대상·사유·조치 | **이식**: messages/*/errors.json·auth.json, contracts/errors.ts·server/errors/http.ts·api/client.ts·account-store.ts | 1 | L01/L02 |
| T16 | 126c0cd27814d71ed0142d50a982ee829025abeb | #1 | 일본어 버튼 동사 통일 | **이식**: messages/ja의 모든 대응 키 | 1 | L01/L05 |
| T17 | 1912692516cfc39569ff9ec342aaff16d74d0b07 | #1 | 필수/선택·必須/任意 배지 | **이식**: domain/field-requirement.tsx·profile-fields.tsx·new-project-dialog.tsx·messages | 1 | L01/L05 |
| T18 | 0cb0705534156f3cf677683b12321b3dc669d4ee | #1 | 임시 이메일 오류 조건 | **폐기**: login-email-form.tsx에 삽입 금지: f033027 제거 상태가 사용자 의도, 오류 테스트는 fixture로 대체 | 1 | L02/A01 |
| T19 | 6cbed1cb1ae6892e5f5b54e3cf99760b2db2b6fd | #2 | 증빙 사건·증명서 구조 | **서버 신규 구현 후 이식**: db/schema.ts evidence_events·lib/contracts/evidence.ts·server/evidence 신규; localStorage 미이식 | 2 | E01 |
| T20 | 5187ad431a282dca3656f063405a277aac070d12 | #2 | 생성/채택/검증/최종본 기록 | **서버 신규 구현 후 이식**: server/projects/service.ts·verifications/handler.ts·finalizations/service.ts·worker 성공 apply | 2 | E01 |
| T21 | d07302f58f8fe8f45a4f28878aa63827c70ce746 | #2 | 이력 타임라인 | **서버 신규 구현 후 이식**: domain/evidence-timeline.tsx·session evidence API, page-content에 연결 | 3 | E01/E02 |
| T22 | 366b1be121cd8f1b8586a2cf33a4c92dd4ec1088 | #2 | localStorage 선반영 hydration 수정 | **backend로 이미 충족**: app/layout.tsx 서버 locale/LanguageProvider, 원본 inline script는 폐기하여 경고 회귀 방지 | 1 | L05 |
| T23 | 91924823359b5ab2a942330754e0f27a8e465ef1 | #2 | 훅 컴포넌트 use client | **이식**: domain/evidence-* 신규 client 경계; 기존 server page wrapper 유지 | 3 | E02/L05 |
| T24 | 2fdf48b2b6333dc71074d7f0b9ece23b8acbb8a8 | #2 | 증명서/증빙 출력·생성 badge | **서버 신규 구현 후 이식**: domain/asset-certificate.tsx·evidence-badge.tsx·asset-workspace-body.tsx·assets/[id]/evidence 신규 page/content | 3 | E01/E02 |
| T25 | 590b9a74e1d12641c02d2369676a6dc6a088a32b | #2 | 연속 동일 사건 접기 | **이식**: domain/evidence-timeline.tsx 접기/펼치기, 원장 보존 | 3 | E02 |
| T26 | c87a267368368c7fb3222f01b1e7168d159eae03 | #2 | 프로젝트 가이드 저장·기준버전 | **backend로 이미 충족**: db/schema.ts brand_guides/project active_guide_id·server/projects/service.ts, certificate에서 id/version/checksum 사용 | 2,3 | E01/E02 |
| T27 | f033027924adda2bc437b0ad86e62a5d4bd304e2 | #1 | 임시 오류 조건 제거 | **backend로 이미 충족**: domain/login-email-form.tsx·auth-flow-form.tsx에 임시 조건 없음, 제거 상태 유지 | 1 | L02/A01 |
| T28 | 274652f0731e82edb44ac50ad3ba12ad7887b656 | #3 | 유사도 근거·확인 필요·오탐 | **서버 신규 구현 후 이식**: contracts/monitoring-result.ts·server/monitoring·feedback 원장/API·domain/monitoring-workspace.tsx | 4 | M01/M02 |
| T29 | b4b4a28dac144d1516a724e16584be5fcf181c63 | #3 | 카드 여백 제거·카드 신고 제거 | **이식**: domain/monitoring-workspace.tsx 결과 카드, 신고는 상세만 유지 | 4 | M02/L03 |
| T30 | dcf5b1f8e6fcd4e2dd90dbb0eff22431b39e3467 | #3 | 상세 오탐 아이콘 버튼 | **이식**: domain/monitoring-workspace.tsx 상세 패널·aria-pressed | 4 | M02 |
| T31 | c50301257da9171c64920fe58cacd41a8d4c34f3 | #4 | 일본어 감수 제출 패키지 | **서버 신규 구현 후 이식**: review-checks/snapshot DB·API·assets/[id]/review-package 신규 page/content, verify/final ja 링크 | 5 | R01/R02 |
| T32 | e0d40773dbc7ae8235be7013a25654842aed5131 | #4 | 자동 체크 불가·조치 안내 | **이식**: review-package page-content.tsx 자동 항목 읽기 전용·도움 링크 | 5 | R01/L01 |
| T33 | 9d0f1578d9f971fd7d2b78186d4c63a7cdcbe0ad | #4 | LINE 공식 로고 자산 | **이식**: public/line-logo-white.png·domain/social-login-buttons.tsx, OAuth gate와 분리 | 1 | A01/L03 |
| T34 | 84f6be15dc96882b6e9dee77010074d4a38c9b39 | #4 | LINE 공식 초록 버튼 | **이식**: domain/social-login-buttons.tsx 색/contrast, 미설정 인증 활성화 금지 | 1 | A01/L03 |

기존충족 근거 커밋은 backend c4d46f1/b4749eb이며 각 경로의 실제 코드/상수와 importer를 §2~3에 대조했다. #2 merge b3b6b66은 누적 계보 근거로 §1에 기록하고 비merge 34행에는 넣지 않는다. 원본 commit과 포팅 commit은 1:N으로 매핑하며 행 추가/판정 변경 시 refs drift 및 수용시험을 다시 검토한다.
