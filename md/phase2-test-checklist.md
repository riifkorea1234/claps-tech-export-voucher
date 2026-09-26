# Phase 2 테스트 체크리스트

## 1. 환경과 최종 결과

- 실행일: 2026-09-23, Asia/Seoul. Node 22.22.0, corepack pnpm 10.34.5, Next 16.3.3, PostgreSQL 17.11, Chromium/Playwright 1.63.0.
- WSL 저장소의 파일 접근 지연을 피하기 위해 Phase 1과 같은 Docker test target에서 lint/typecheck/단위/통합 검사를 실행했다. E2E는 호스트 Chromium에서 최종 production web 이미지의 loopback 3102 포트에 접속했다.
- 자동 기능 검사: **11 files / 52 tests / 52 passed / 0 failed / 0 skipped**. 단위 21, i18n 6, PostgreSQL 통합 13, E2E 12.
- Docker smoke: **4 checks / 4 PASS**. 자동 기능 test 수와 별도다.
- lint: **0 errors / 20 warnings**. Phase 1의 기존 hydration 18건·unused-disable 2건이 유지됐다. 새 오류/경고 없음.
- ko/en 각각 518개 key, 11 namespace, 총 JSON 22개. admin/email은 아직 해당 기능이 없어 빈 계약 파일이다.

## 2. 격리와 데이터

`compose.test.yaml`의 별도 `claps-phase2-tests` project/볼륨과 `claps_test` DB를 사용했다. 기존 Phase 1 및 다른 프로젝트의 컨테이너/볼륨은 변경하지 않았다. 합성 업무 fixture는 transaction rollback했고 최종 users=0, localized_contents=0이다. 초기 ko/en만 enabled=true/version=2로 남겼다. 브라우저는 테스트별 새 context와 합성 localStorage 데이터를 사용했다. 실제 계정·메일·과금·외부 공급자 호출 없음.

## 3. 필수 검증

| ID | 필수 | 대상 | 명령/절차 | 기대 결과 | 실제 결과 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| P2-T01 | 필수 | 문구·key·변수·이미지 | pnpm test:i18n; AST·이미지 조사 | key/변수 누락 0, 업무 원문 혼입 0 | i18n 6 PASS; 정적 t 호출·동적 enum·허용된 업무 fixture 외 한국어 누락 0 | PASS |
| P2-T02 | 필수 | locale 우선순위·fallback·SSR | pnpm test:unit; test:integration; SSR E2E | cookie/선호/브라우저/기본·등록/순환 검사·초기 렌더 일치 | unit 21, integration 13 PASS; en-US→en, unknown→ko, q=0 제외, SSR cookie 우선, hydration 오류 0 | PASS |
| P2-T03 | 필수 | 전환·입력/선택 보존·PC/모바일 | pnpm test:e2e | URL/폼/필터/출력 보존, 신규 job 호출 0 | E2E 12 PASS; 390/1280px, 키보드, 로그인/복구/프로필/프로젝트 모달/검색/스타일/기존 생성물/정렬 검증 | PASS |
| P2-T04 | 필수 | DB 게시본·활성화·Docker | test:integration; web/worker rebuild/restart/hash | 초안 미노출, 제공 locale 명시, 동일 파일팩, 운영 설정 보존 | 게시/초안/원문 fallback 및 일회 활성화 검증; Docker 4 PASS, 22파일 hash 동일 | PASS |
| 기본 | 필수 | lint/typecheck/build | pnpm lint; typecheck; exec tsc --noEmit; build | 신규 오류 없음 | 모든 명령 exit 0, 기존 lint 20 warnings | PASS |

## 4. 실제 명령과 종료 코드

표의 pnpm은 프로젝트 고정 버전이다. 호스트에서는 corepack pnpm, 이미지에서는 pnpm으로 실행했다.

| 명령/절차 | 종료 코드 | 결과 |
| --- | --- | --- |
| docker compose -p claps-phase2-tests -f compose.test.yaml up -d --wait | 0 | 별도 빈 DB/볼륨 healthy |
| docker build --target web/worker/test -t claps-phase2-{target} . | 각 0 | 최종 소스의 production build 및 각 target 성공 |
| Docker test: pnpm lint | 0 | 0 errors / 20 기존 warnings |
| Docker test: pnpm typecheck && pnpm exec tsc --noEmit | 0 | Next typegen 및 직접 tsc 성공 |
| Docker test: pnpm exec vitest run --project unit --project i18n | 0 | 7 files / 27 PASS = unit 21 + i18n 6 |
| 별도 TEST_DATABASE_URL, Docker test: pnpm test:integration | 0 | 2 files / 13 PASS; migration·seed·fixture rollback 포함 |
| Docker test: pnpm i18n:activate | 0 | 초기 ko/en만 활성화; 별도 통합 검사에서 재실행·운영 수정값 보존 |
| E2E_BASE_URL=http://127.0.0.1:3102 corepack pnpm test:e2e | 0 | 2 files / 12 PASS, 최종 실행 32.2초 |
| web/worker 파일 hash 비교 스크립트 | 0 | 22개 JSON의 SHA-256 동일 |
| localized OG→컨테이너 restart→health/SSR/DB 확인 스크립트 | 0 | 아래 smoke 2~4 PASS |
| Chromium 화면 캡처 | 0 | desktop login, mobile landing/partners 캡처 후 직접 확인 |
| 합성 환경변수로 docker compose config --quiet | 0 | APP_ORIGIN 포함 Compose 구성 유효 |
| git diff --check | 0 | 공백 오류 없음 |

0개 테스트나 skip suite를 PASS로 취급하지 않았다. 최종 결과는 초기 실패를 수정한 후 다시 실행한 수치다.

## 5. Docker·화면 증거

| Check | 실제 절차 | 결과 |
| --- | --- | --- |
| 1 | web/worker 컨테이너 내부 messages의 파일명 및 SHA-256 비교 | ko/en 22개 동일 |
| 2 | /opengraph-image에 ko/en 쿠키로 요청 | 모두 200/image/png, 출력 binary가 서로 다름; 이미지 내부 문구도 locale 적용 |
| 3 | web/worker 재시작 후 health·worker-health와 SSR login 재조회 | 정상 복구, ko 브라우저 헤더보다 en 쿠키 우선, 활성 locale ko/en 유지 |
| 4 | 최종 합성 DB 행 수·locale version 조회 | users=0, localized_contents=0, ko/en enabled=true/version=2 |

직접 확인한 이미지·범위는 [문구/이미지 목록](phase2-copy-inventory.md)에 있다. 실제 UI 캡처: [영어 로그인](evidence/phase2/login-en.png), [영어 모바일 랜딩](evidence/phase2/landing-en-mobile.png), [영어 모바일 파트너](evidence/phase2/partners-en-mobile.png). 파트너 업체명·세계관·추천 원문은 업무 fixture라 원문을 유지하며, 고정 기준명/메뉴는 영어로 전환한다. 전문 번역 검수나 실서비스 품질 검증을 수행한 것으로 주장하지 않는다.

## 6. 최초 실패·수정·재검증

| 최초 결과 | 원인 | 수정·최종 결과 |
| --- | --- | --- |
| 첫 타입 검사 4 errors | await parameter initializer 및 code/display 변환이 session/verdict prop에도 적용 | await를 본문으로 이동, props에는 원본 code/객체 전달. 최종 tsc PASS |
| 후속 타입/lint 파싱 오류 | 미사용 sessionSubtitle 제거 범위를 잘못 선택 | 원본 타입/fixture 복원 후 미사용 함수만 제거. 최종 PASS |
| 초기 build의 DB 타입 오류 | 기본 DB 인자에 inferred $client 필수 타입이 붙어 transaction fixture를 거절 | NodePgDatabase 타입을 명시. 통합/tsc/build PASS |
| 초기 build의 /_not-found 설정 오류 | 동적 cookies를 읽기 전에 DB 접근해 prerender에서 runtime 설정 요구 | request-time cookies/headers를 먼저 읽도록 수정. 빌드에 DB secret 없이 PASS |
| 첫 Chromium 7 PASS / 3 FAIL | Next route announcer와 alert locator 중복, 검색창 accessible name 누락, 스타일 CSS 기대값 오류 | 오류 안내 locator 한정, 실제 검색창 이름 사용, aria-pressed로 의미 검증. 모두 PASS |
| 다음 Chromium 10 PASS / 1 FAIL | 새 프로필 테스트의 idPrefix를 profile로 가정, 실제 setup | 실제 필드 id로 수정. 최종 전체 12 PASS |
| 시각 검토 보완 | 파트너 고정 기준명이 목업 원문에 결합, 날짜 그룹 key에 번역 사용 | code/표시명 분리, 그룹 key 고정 및 이전 그룹 호환. 영향받는 build/정적/i18n/E2E 재검증 PASS |

빠른 테스트 페이지 이동 중 Next가 destination stream closed early를 기록한 경우가 있었다. 브라우저 pageerror/hydration 오류는 최종 0이며 정상 요청과 서버 health는 통과했다.

## 7. 적용하지 않는 범주와 인수인계

| 범주 | 상태 | 사유·후속 Phase |
| --- | --- | --- |
| 회원 DB 선호·실인증·실메일·관리자 권한 | NOT_APPLICABLE | Phase 3. preference 우선순위 함수만 준비 |
| 실제 관리자 언어 관리/감사·콘텐츠 게시 흐름 | NOT_APPLICABLE | Phase 6. 이번에는 bootstrap 및 게시/초안 fixture만 검증 |
| 실제 공급자 품질·성능 부하·과금 | NOT_APPLICABLE | Phase 5~10. 언어 변경이 기존 job을 새로 호출하지 않는지만 검증 |
| 운영 TLS/백업/실배포·전문 번역 검수 | NOT_APPLICABLE | D-04/D-10 및 Phase 11 게이트. 로컬 검증만 수행 |
| 신규 schema migration/파괴적 rollback | NOT_APPLICABLE | schema 변경 없음. 기존 migration 재실행은 통합 테스트로 검사 |

## 8. 완료 판정

필수 4 PASS / 0 FAIL / 0 BLOCKED / 0 PENDING. 기본 정적/build 검사도 PASS. [결과 MD](phase2-result.md)와 [결과 HTML](phase2-result.html)에 최종 판정과 Phase 3 인수인계를 기록한다. 문서 검사 3/3 PASS: 로컬 Markdown 링크 38개·HTML 링크 8개 정상, MD/HTML 본문·완료 수치 동일, HTML 표 5개·태그 구조·반응형/인쇄 CSS 확인.

최종 정리: 검증용 Phase 2 web/worker/DB를 중지했다. worker/DB exit 0, web SIGTERM exit 143. 합성 볼륨·빌드 이미지 보존, 다른 프로젝트 컨테이너 변경 없음.
