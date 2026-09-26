# Phase 3 테스트 진행 체크리스트

## 1. 환경과 최종 결과

- 실행일: 2026-09-23, Asia/Seoul. Codex 단독 수행.
- Node 22.22.0 / pnpm 10.34.5 / Next 16.3.3 / Better Auth 1.7.5 / PostgreSQL 17.11 / Chromium·Playwright 1.63.0.
- Docker test target에서 정적·단위·통합 검증, 최종 production web 이미지의 loopback 3103 포트에서 Chromium 검증.
- **14 files / 73 tests / 73 passed / 0 failed / 0 skipped**: unit 24 + i18n 6 + PostgreSQL integration 25 + Chromium E2E 18.
- 필수 **4 PASS / 0 FAIL / 0 BLOCKED / 0 PENDING**. lint **0 errors / 18 기존 warnings**, typecheck/직접 tsc/build exit 0.
- Docker/CLI smoke **4 checks / 4 PASS**. 기능 테스트 수와 별도다.
- ko/en 각각 536 key, 11 namespace, JSON 22개. auth/email의 새 문구 포함.

## 2. 격리와 데이터

새 Compose project `claps-phase3-tests`, 새 `claps_test` DB 볼륨을 사용했다. 다른 프로젝트 컨테이너/볼륨과 운영 DB를 변경하지 않았다. 통합 fixture는 UUID 이메일만, E2E는 p3-e2e- 접두사, CLI smoke는 별도 p3-smoke- 합성 계정만 사용했다. sandbox는 host의 0700 `/tmp/claps-phase3-mail`을 컨테이너 `/tmp/claps-mail`에 bind mount했고 실제 발송은 하지 않았다.

최종 합성 fixture 정리 후 users/sessions/credentials/tokens/audit 각각 0건을 확인했다. 해당 격리 DB의 합성 rate bucket 117개도 제거했다. migration과 활성 ko/en은 보존했다. 브라우저 세션 파일·합성 메일은 테스트 종료 후 제거했다. 운영 계정·secret을 보고서에 포함하지 않는다.

## 3. 필수 검증

| ID | 필수 | 분류/대상 | 명령·절차 | 기대 결과 | 실제 결과 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| P3-T01 | 필수 | 인증·메일·세션 | unit/integration 및 signup/recovery E2E | 8~128자, 동시 중복 방지, hash, 단회·만료 토큰, 현재 비밀번호, 세션 폐기 | 인증 통합 12 PASS, 정책/sandbox 단위 3 PASS, 가입·복구 E2E PASS | PASS |
| P3-T02 | 필수 | 권한·Origin·CLI | 통합 A/B 소유권·역할 주입, E2E CSRF·admin, CLI 실제 실행 | 우회·권한 상승 거절, 공개 관리자 비활성, 감사 기록 | 미인증 401/member·admin 공개 접근 403, 타인 소유권 404, 주입 422, CLI 승격/정지·감사 PASS | PASS |
| P3-T03 | 필수 | 인증 UI·URL/localStorage | Chromium 이메일→가입/로그인→확인→프로필→앱→변경/로그아웃, 찾기→복구 | 인증 주체만 진입/저장, 미준비 소셜 차단 | 신규/기존 분기·8자 가입·복구 후 다른 브라우저 세션 차단·변조 거절 PASS | PASS |
| P3-T04 | 필수 | 계정·언어·차단 | A/B 언어 전환·오류 재시도·모바일 탈퇴·CLI 정지·재시작 | 회원 선호 유지, 실패 안내, 즉시 접근 차단, 정리 계약 보존 | 계정별 선호·DB 저장·만료 쿠키 언어 복구·탈퇴/정지·재시작 PASS | PASS |
| 기본 | 필수 | 정적·기존 회귀 | lint/typecheck/tsc/build 및 전체 suite | 신규 오류 없음, 기존 언어/DB 기능 유지 | 모든 명령 exit 0, 73 PASS, 기존 경고 20→18 | PASS |

## 4. 실제 실행 명령과 종료 코드

각 Docker build/run은 최종 소스 기준으로 성공했다. 호스트의 pnpm은 corepack pnpm이다. 명령의 DB URL은 격리된 합성 DB로만 설정했다.

| 명령·절차 | 종료 코드 | 결과 |
| --- | --- | --- |
| docker compose -p claps-phase3-tests -f compose.test.yaml up -d --wait | 0 | 별도 DB healthy |
| pnpm db:generate | 0 | auth_rate_limits 추가 migration 생성 |
| docker build --target test -t claps-phase3-test . | 0 | 테스트·CLI 이미지 생성 |
| Docker test: pnpm db:migrate / pnpm db:seed / pnpm i18n:activate | 각 0 | 새 migration, 멱등 seed, 초기 ko/en 활성화 |
| Docker test: pnpm typecheck && pnpm exec tsc --noEmit | 0 | Next typegen 및 타입 검사 성공 |
| Docker test: pnpm lint | 0 | 0 errors / 18 기존 warnings |
| Docker test: pnpm exec vitest run --project unit --project i18n --project integration | 0 | 11 files / 55 PASS, 최종 8.43초 |
| docker build --target web -t claps-phase3-web . | 0 | production pnpm build 성공, 런타임 secret 없이 빌드 |
| E2E_BASE_URL·E2E_MAIL_DIR·TEST_DATABASE_URL 지정, corepack pnpm test:e2e | 0 | 3 files / 18 PASS, 최종 51.6초 |
| Docker test: pnpm account promote 및 suspend, 합성 fixture | 각 0 | 세션 폐기·감사·로그인 차단 |
| 세션/재시작/헤더/정리 smoke scripts | 각 0 | 아래 4 checks PASS |
| 합성 환경변수로 docker compose config --quiet | 0 | 신규 mail/origin 설정 포함 구성 유효 |
| git diff --check | 0 | 공백 오류 없음 |

## 5. Docker·수동 검증

| Check | 절차 | 결과 |
| --- | --- | --- |
| 1 | 브라우저 signup/mobile account 캡처, 실제 로그인 쿠키 검사 | HttpOnly, SameSite=Lax, Max-Age=604800 확인; 두 화면 직접 확인 |
| 2 | CLI promote 후 기존 세션, 새 로그인 및 공개 admin 요청 | 기존 세션 401, 재로그인 성공, admin도 공개 endpoint 403 |
| 3 | production 컨테이너 교체 후 저장된 세션/locale·health·토큰 페이지 헤더 | /api/me 200, en 유지, health 200, 확인/복구 페이지 Referrer-Policy=no-referrer |
| 4 | CLI suspend 후 이전 세션/로그인 및 DB 감사·합성 fixture 정리 | 세션/로그인 401, suspended·감사 2건 확인, fixture 정리 성공 |

화면 증거: [영어 회원가입](evidence/phase3/sign-up-en.png), [영어 모바일 계정](evidence/phase3/account-en-mobile.png). 이메일은 합성/표시용 fixture이며 보고용 모바일 이미지에서는 fixture@example.test로 마스킹했다. 브라우저 390/1280px와 키보드·언어 전환은 자동 E2E에서도 확인했다.

## 6. 초기 실패·수정·재검증

| 최초 결과 | 원인 | 수정·최종 결과 |
| --- | --- | --- |
| 호스트 typecheck exit 2 | props 없는 page의 ComponentProps unknown, 조건부 DTO의 password unknown | 무인자 page 래퍼 및 string narrowing, 최종 타입/build PASS |
| 첫 Docker lint 12 errors | 기존 경고 예외가 page.tsx에 한정되어 page-content.tsx 이동 후 적용되지 않음 | 같은 기존 파일의 새 경로로 예외 이동, 새 인증 경고 정리, 최종 오류 0·기존 경고 18 |
| i18n:activate exit 1 | CLI가 세션 조회를 통해 next/navigation 화면 모듈까지 불러옴 | 쿠키 세션 조회 모듈을 분리, CLI 초기 활성화 재실행 PASS |
| 최초 account CLI exit 1 및 종속 smoke 실패 | CommonJS tsx 실행에서 top-level await 사용 | 기존 scripts와 같은 async main 진입점 적용, 실제 promote/suspend와 종속 검증 모두 PASS |
| 최종 코드 검토 보완 | 만료 세션 쿠키가 비회원 locale 저장까지 거절할 수 있음 | 유효 세션만 회원 선호 저장, 만료 쿠키 제거 후 비회원 locale 허용; 회귀 E2E 포함 최종 18 PASS |

초기 27/55/18 성공 실행을 중복 합산하지 않았다. 최종 총계는 고유 테스트 73개다. no tests/skip을 PASS로 처리하지 않았다.

## 7. 적용 제외와 한계

| 범주 | 상태 | 사유·후속 |
| --- | --- | --- |
| 실제 공급자 이메일 발송·도달성 | NOT_APPLICABLE | 사용자 승인 범위는 로컬 sandbox. 운영 공급자·발신 도메인·승인 수신자 준비 후 검증 |
| OAuth callback·계정 연결 | NOT_APPLICABLE | 사용자 승인으로 소셜 비활성. 자동 이메일 병합 없음 |
| 공개 관리자·추가 인증 | NOT_APPLICABLE | CLI 지정과 차단만 제공. 운영 공개 전 추가 인증 구현/검증 필요 |
| 실제 업무 CRUD·파일 다운로드/삭제·늦은 worker | NOT_APPLICABLE | Phase 4~5. 소유권 가드와 withdrawal_pending 계약만 제공 |
| 영구 삭제·익명화·감사/백업 보존 | NOT_APPLICABLE | 보존 기간 별도 결정 전 비활성. 탈퇴 접근 차단만 이번 범위 |
| 운영 TLS·실배포·부하·백업 복구 | NOT_APPLICABLE | Phase 11. 이번 로컬 HTTP에서 HttpOnly/SameSite/수명 확인; HTTPS Secure 설정 분기 존재 |

## 8. 완료 판정

**COMPLETED — 사용자 승인 개발 범위.** 필수 4 PASS, 자동 73 PASS, 정적/build PASS, smoke 4 PASS. [결과 MD](phase3-result.md)와 [결과 HTML](phase3-result.html)에 동일한 수치·판정·운영 이월을 기록한다. 문서 링크/HTML 구조·본문 정합성 검증과 테스트 환경 종료 결과는 결과 보고서의 마무리 기록을 참고한다.

마무리: 문서 검사 3/3 PASS (Markdown 로컬 링크 24개, HTML 링크 7개, 표 5개·태그·본문·수치·반응형/인쇄 CSS 정합). web SIGTERM exit 143, DB exit 0 중지. 합성 메일/세션 파일 제거, DB 볼륨/빌드 이미지 보존.
