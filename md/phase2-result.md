# Phase 2 결과 보고서 — ko/en 파일 언어팩·공통 언어 선택

## 1. 판정

| 항목 | 결과 |
| --- | --- |
| 상태 | COMPLETED |
| 작업일 | 2026-09-23, Asia/Seoul |
| 담당 | Codex 단독 수행 |
| 선행 조건 | Phase 1 COMPLETED, 필수 4 PASS 확인 |
| 언어팩 | ko/en 각각 518개 key, 11 namespace, 총 22 JSON |
| 자동 기능 테스트 | 11 files / 52 tests / 52 passed / 0 failed / 0 skipped |
| 구성 | 단위 21 + i18n 6 + PostgreSQL 통합 13 + Chromium E2E 12 |
| Docker smoke | 4 checks / 4 PASS |
| lint | 0 errors / 20 기존 warnings |
| 필수 검증 | 4 PASS / 0 FAIL / 0 BLOCKED / 0 PENDING |

기존 랜딩·인증·앱 화면의 고정 문구를 ko/en 파일로 연결했다. 언어 변경은 URL, 입력, 필터, 스타일 선택, 기존 생성 결과를 유지한다. 회원 선호 DB 연동·관리자 콘텐츠 게시·실제 인증/공급자 호출은 후속 Phase 범위다. 이 완료 판정은 로컬 구현·검증에 대한 것이며 공개 배포나 전문 번역 검수를 의미하지 않는다.

## 2. 실제 구현

- `messages/{ko,en}`에 계획의 10개 namespace와 Phase 1 errors를 유지했다. admin/email은 기능을 구현하는 Phase에서 채울 빈 계약 파일이다. UI·랜딩 문구를 DB에 저장하지 않으며 업무 원문을 UI 언어팩에 넣지 않았다.
- 파일 registry는 배포 디렉터리를 탐색하고 전체 key/변수의 완성도를 확인한다. 언어 선택에는 활성 DB 등록 언어와 완성된 파일팩의 교집합만 노출한다. fallback 경로는 미등록 대상과 순환을 거절한다.
- 최초 언어는 cookie → 회원 선호 연결점 → 브라우저 Accept-Language → ko 순서다. en-US는 en으로 매칭하고 미지원 브라우저 언어는 ko로 처리한다. SSR의 html lang/dir, metadata, OG 이미지와 클라이언트에 같은 언어를 전달한다.
- 공통 LanguageSwitcher를 랜딩 CTA 왼쪽, 인증·앱 헤더 오른쪽, 새 프로젝트 모달에 연결했다. PC/모바일·키보드 동작과 저장 실패 안내/재시도를 제공한다. 모바일 사이드바를 접어도 메뉴와 선택기에 접근할 수 있다.
- POST /api/locale은 검증된 same-origin JSON 요청만 처리하고 HttpOnly/SameSite=Lax 쿠키를 저장한다. HTTPS origin에서는 Secure를 설정한다. APP_ORIGIN으로 프록시의 공개 origin을 명시한다. 임의 언어·잘못된 Origin은 거절한다.
- 프로젝트 상태·직무·스타일·세션 단계·검증 판정·파트너 정렬/factor·날짜 그룹·플랫폼은 고정 code와 표시명을 분리했다. 기존 localStorage enum 값은 읽을 때 정상화하고 사용자 이름·IP·프롬프트·업무 원문은 보존한다. 날짜·상대 시간·숫자·복수형은 표시 locale에 맞춘다.
- 내부 publishedContent 서비스는 권한 확인이 끝난 업무 리소스의 게시본 → fallback 게시본 → 원문을 조회한다. 초안을 반환하지 않으며 requestedLocale/resolvedLocale/fallbackUsed를 제공한다. 공개 임의 리소스 endpoint는 추가하지 않았다.
- seed는 계속 멱등적으로 기존 설정을 보존한다. i18n:activate 명령이 파일팩 검증 후 untouched version=1의 ko/en만 초기 활성화하고 version을 올린다. 반복 실행은 운영자 version을 덮어쓰지 않는다. 기본 ko 보호를 검사한다.

## 3. 계획 대비 차이와 결정

| 항목 | 실제 반영·이유 |
| --- | --- |
| namespace 수 | 계획의 10개에 Phase 1 errors를 유지해 11개. admin/email은 후속 기능 전까지 비어 있음 |
| 스크린샷 내부 한국어 | landing-verify/preview-monitoring 2장을 언어팩 기반 HTML ProductPreview로 대체. 원본 이미지와 업무 사진은 보존 |
| 파트너 fixture | 업체명·설명·추천 원문은 유지하고 고정 factor/기준 label만 code로 분리 |
| namespace 로딩 | loader는 선택 로딩 지원. 공통 client shell에는 기존 화면에 필요한 8개 UI namespace만 전달; admin/email/errors 제외 |
| 초기 활성화 | 일반 seed와 명시적 bootstrap을 분리해 재실행으로 운영 설정이 바뀌지 않도록 함 |
| 입력 중 언어 변경 | 모달에도 같은 선택기를 배치하고 React key에 번역 표시명을 사용하지 않도록 보완 |
| 검증 실행 환경 | 호스트 WSL 파일시스템 지연 때문에 Docker test target 활용. 브라우저는 최종 production 이미지에 접속 |
| D-10 | 검수자 확정은 공개 배포 전 게이트로 유지. 이번에는 로컬 구현·합성 fixture 검증만 수행 |

## 4. 생성·변경 파일

| 영역 | 파일·범위 |
| --- | --- |
| 공통 i18n | lib/i18n/core.ts, server.ts, provider.tsx, legacy.ts, format.ts, content.ts, activate.ts |
| API | app/api/locales/route.ts, app/api/locale/route.ts |
| 파일팩 | messages/ko 및 messages/en의 common/navigation/landing/auth/projects/partners/assets/monitoring/admin/email; 기존 errors 유지 |
| 화면 | app/layout.tsx·page.tsx·opengraph-image.tsx·로그인·기존 앱 페이지, components/domain 및 layout의 고정 문구·code 표시 |
| 공통 UI | components/layout/language-switcher.tsx, components/domain/product-preview.tsx, dialog/sheet 닫기 접근성 문구 |
| 저장소/표시 | lib/nav.ts, account/projects/assets/monitoring-store.ts, lib/mock의 프로젝트·검증·파트너 code 및 미사용 포맷 함수 정리 |
| 설정/실행 | next.config.ts 파일 추적, package.json i18n:activate, scripts/activate-locales.ts, compose.yaml APP_ORIGIN, .env.example |
| 검증 | tests/unit/i18n.test.ts, tests/i18n/packs.test.ts, tests/integration/i18n.test.ts, tests/e2e/i18n.spec.ts; 기존 DB seed fixture의 상태 명시 |
| 문서 | Phase 2 계획·문구 목록·체크리스트·결과 MD/HTML·화면 증거, README/scripts 안내, Phase 3 인수인계 |
| DB schema/파일 삭제/커밋 | 새 migration 없음, 기존 파일 삭제 없음, 커밋·브랜치 변경 없음 |

작업 시작 시 이미 존재한 Phase 1의 미커밋/미추적 파일과 사용자 문서를 보존했다. 기존 전체 작업 트리를 초기화하지 않았다.

## 5. 검증 결과와 증거

실제 명령·종료 코드·초기 실패와 재검증은 [테스트 체크리스트](phase2-test-checklist.md)에 있다. 문구·이미지 검수 목록은 [문구 조사](phase2-copy-inventory.md)에서 확인할 수 있다.

| 검사 | 최종 결과 |
| --- | --- |
| 단위 | 5 files / 21 PASS: 기존 계약·환경·HTTP·인증 schema 및 언어 우선순위/순환/legacy/복수형/날짜 |
| i18n | 2 files / 6 PASS: 22파일 key/변수, 정적 호출, 동적 enum, namespace 선택 로딩, 미추출 UI 문구 |
| PostgreSQL 통합 | 2 files / 13 PASS: 기존 기반 10 + 초기 활성화/운영 설정 보존/공개 교집합/게시 fallback 3 |
| Chromium | 2 files / 12 PASS: API/SSR·화면 전환·입력/검색/선택/출력 보존·오류 재시도·390/1280px·키보드 |
| lint/typecheck/build | 모두 exit 0; 기존 lint 경고 20건 유지 |
| Docker | 4/4 PASS: web/worker 22파일 hash 동일, ko/en OG 출력, restart/health/cookie 유지, fixture 정리 |
| Compose/공백 | config --quiet 및 git diff --check 성공 |
| 시각 확인 | 영어 PC 로그인·모바일 랜딩·파트너 직접 확인, 선택기/메뉴 가시성 확인 |

화면 증거: [영어 로그인](evidence/phase2/login-en.png), [모바일 랜딩](evidence/phase2/landing-en-mobile.png), [모바일 파트너](evidence/phase2/partners-en-mobile.png). 파트너 업무 원문의 한국어는 번역 누락된 고정 UI로 취급하지 않으며 실제 게시 번역은 후속 데이터 연동 범위다.

초기 타입/빌드 문제와 테스트 locator 오류는 수정 후 최종 소스로 재검증했다. 미실행 테스트를 통과로 기록하지 않았고 실패한 초기 실행을 최종 52개 성공에 합산하지 않았다.

## 6. 완료 게이트

| 조건 | 판정 |
| --- | --- |
| 기존 필수 고정 UI·랜딩 ko/en 연결 | 충족, 예외 업무 원문을 경로/값으로 문서화·검사 |
| 랜딩/인증/앱의 PC·모바일 공통 선택기 | 충족 |
| SSR·쿠키·지역 언어·fallback·입력 보존 | 충족 |
| 게시본 fallback 및 동일 Docker 파일팩 | 충족 |
| 필수 검증·정적 검사 | 충족, 필수 4 PASS 및 자동 52 PASS |
| 계획 차이·체크리스트·결과 MD/HTML·인수인계 | 충족, 로컬 링크 38개·HTML 링크 8개 및 본문/구조 정합성 확인 |
| Phase 3를 막는 기반 미해결 항목 | 없음 |

## 7. 미완료·위험·후속 인수인계

- **Phase 3**: requestLanguage의 회원 preference 자리에 검증된 세션의 users.preferences.locale을 연결한다. 첫 로그인 저장·다른 계정 전환 동기화·PATCH /api/me/preferences는 아직 없다. auth 파일과 빈 email 파일에 실제 인증/메일 문구를 추가해야 한다.
- **Phase 6**: 관리자 언어 활성화/변경·감사와 업무 콘텐츠 편집/게시/권한 검사에서 registry 및 publishedContent 서비스를 연결한다. bootstrap은 관리자 기능의 대체물이 아니다. 업무 원문과 번역의 resourceType/schema·소유권을 유지한다.
- **Phase 5~10**: 생성/검증/탐지 출력 locale은 job 생성 시 고정한다. 이번 UI 전환은 기존 결과를 보존하며 실제 공급자를 호출하지 않는다.
- **D-10/공개 배포**: 전문 ko/en 검수자와 운영 콘텐츠는 아직 확정되지 않았다. 공개 배포·출시 전에 별도 검수해야 한다. 현재 목업 파트너/추천/검증 결과는 업무 원문 상태다.
- 기존 lint 경고 20건과 브라우저 localStorage 기반 업무 저장은 Phase 1에서 인수한 후속 연동 항목이다. 이번 작업으로 실제 서버 인증·업무 저장이 완성된 것은 아니다.
- 언어가 URL에 포함되지 않으므로 요청 cookie/Accept-Language 기반 SSR이다. 파일팩은 배포 이미지와 함께 관리하며 locale registry는 DB에서 읽는다. APP_ORIGIN을 실제 브라우저 공개 origin에 맞춰야 한다.
- 운영 롤백은 이전 코드와 messages 이미지를 함께 복원하고 새 파일팩이 없는 언어를 선택기에서 제외한다. 사용자 원문·게시 데이터·운영 설정을 초기화하지 않는다.

문서 검증: Markdown 로컬 링크 38개와 HTML 로컬 링크 8개 정상, MD/HTML 본문 동일, 표 5개·HTML 태그 구조·반응형/인쇄 CSS 및 상태/수치 정합성 확인.

검증용 web/worker/DB를 중지했고 합성 DB 볼륨과 빌드 이미지는 보존했다. worker와 DB는 exit 0, web은 SIGTERM 종료 143을 확인했다.

재개 자료는 [Phase 2 계획](phase2-plan.md), [Phase 3 계획](phase3-plan.md), [실행 안내](../scripts/README.md)다. 실제 운영 배포는 수행하지 않았다.
