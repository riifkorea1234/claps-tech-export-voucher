# Phase 3 결과 보고서 — 서버 인증·프로필·소유권·관리자 가드

## 1. 판정

| 항목 | 결과 |
| --- | --- |
| 상태 | COMPLETED — 사용자 승인 개발 범위 |
| 작업일·담당 | 2026-09-23, Asia/Seoul · Codex 단독 수행 |
| 선행 조건 | Phase 2 COMPLETED, 필수 4 PASS·자동 52 PASS 기록 확인 |
| 사용자 결정 | 비밀번호 8~128자, 나머지 제안 개발용 기준 승인 |
| 자동 테스트 | 14 files / 73 tests / 73 passed / 0 failed / 0 skipped |
| 구성 | 단위 24 + i18n 6 + PostgreSQL 통합 25 + Chromium E2E 18 |
| 필수 검증 | 4 PASS / 0 FAIL / 0 BLOCKED / 0 PENDING |
| Docker/CLI smoke | 4 checks / 4 PASS |
| 정적·빌드 | lint 0 errors / 18 기존 warnings, typecheck/직접 tsc/build exit 0 |
| 언어팩 | ko/en 각각 536 key, 11 namespace, JSON 22개 |

이메일만 입력하거나 URL/localStorage를 바꿔 앱에 들어가던 인증 흐름을 서버 세션으로 전환했다. 가입·이메일 확인·비밀번호 로그인/복구/변경·프로필·언어 선호·로그아웃·탈퇴 접근 차단을 연결했다. 실제 메일 발송·소셜·공개 관리자·영구 삭제는 승인된 범위에 따라 비활성 상태다. 이 판정은 운영 배포 완료를 뜻하지 않는다.

## 2. 주요 구현

- 이메일 lookup은 nextStep만 반환하고 세션을 발급하지 않는다. 공개 가입은 member로만 생성하며 최종 UNIQUE 충돌로 동시 중복 가입과 기존 credential 덮어쓰기를 차단한다.
- 비밀번호는 Better Auth 1.7.5의 hash/verify 구현을 사용한다. 8~128자이며 이메일 확인 전 업무 접근을 거절한다. 비밀번호 변경은 현재 비밀번호를 확인한다.
- 세션 7일, 이메일 확인 24시간, 재설정 1시간을 적용한다. 무작위 256-bit 토큰의 SHA-256 digest만 DB에 저장한다. 세션 쿠키는 HttpOnly/SameSite=Lax이고 HTTPS origin에서는 Secure다. 확인/복구는 POST에서 단회 소비하며 링크 GET은 소비하지 않는다.
- 계정 행 잠금과 transaction으로 로그인·토큰 소비·변경·정지·탈퇴를 직렬화한다. 복구/변경/정지/탈퇴 및 관리자 승격 시 기존 세션을 폐기한다. profile/preferences 변경은 잠금 후 세션을 다시 검사한다.
- 모든 인증·회원 변경 API는 same-origin JSON과 strict DTO를 요구한다. 이름·조직·직무·locale만 허용하고 email/appRole/status 주입을 거절한다. DB 기반 이메일/IP/토큰 요청 제한은 여러 web 프로세스 사이에서도 공유된다.
- 앱 layout뿐 아니라 개별 page에 서버 가드를 적용했다. 기존 client 화면은 같은 디렉터리의 page-content.tsx로 보존했다. profile-setup은 URL 이메일을 무시하고 인증 주체를 사용한다. 소유권 가드는 project/session/job/monitoring/asset/guide를 기준으로 제공하며 실제 파일 서비스는 후속 범위다.
- 계정 store는 `/api/me` 호출로 교체했다. PC·모바일 계정 메뉴에서 수정/비밀번호 변경/로그아웃/탈퇴가 가능하다. 인증 주체가 바뀌면 문서를 새로 열어 이전 계정의 브라우저 라우터 캐시·언어 context를 폐기한다.
- 첫 가입의 현재 locale을 저장하고, 로그인/확인 시 회원 선호로 쿠키를 동기화한다. 최초 SSR 우선순위는 cookie→회원→브라우저→ko다. 언어 저장 실패는 현재 화면을 유지하며 오류를 안내한다. 만료 세션 쿠키는 비회원 언어 변경을 막지 않는다.
- 메일은 명시적 sandbox adapter만 제공한다. ko/en 제목·본문·링크를 공개 경로 밖 0600 JSON에 저장하며 설정이 없으면 발송 요청을 거절한다. 운영 메일 공급자 연결은 없다.
- `pnpm account promote/suspend`는 확인·프로필 완료 계정에만 동작하고 감사 기록을 남긴다. 공개 관리자 endpoint는 admin이어도 거절한다. 소셜 링크는 비활성 버튼·안내로 변경했으며 자동 계정 병합은 없다.
- 탈퇴는 withdrawal_pending 및 세션/토큰 폐기로 처리한다. 데이터·파일·감사·백업을 영구 삭제하지 않으며 후속 정리 계약은 pending_policy다.

## 3. 계획 대비 결정과 차이

| 항목 | 실제 결정·근거 |
| --- | --- |
| 비밀번호 | 제안 12자에서 사용자 요청 최소 8자로 변경, 최대 128자 유지 |
| 메일/관리자/소셜/삭제 | 사용자가 나머지 개발 권장안을 승인. sandbox/CLI/접근 차단을 구현하고 운영 기능은 명시적으로 비활성 |
| 인증 구성 | Better Auth password crypto와 기존 auth schema 위에 명시적 서비스 구현. 토큰 digest 저장·계정 행 잠금·세션 폐기를 동일 transaction으로 제어 |
| DB migration | auth_rate_limits 테이블·expiry index만 추가, 기존 사용자/업무 테이블 파괴적 변경 없음 |
| 페이지 보호 | layout 단독 검사 대신 11개 개별 앱 page를 서버 래퍼로 분리. 기존 UI 내용 보존 |
| locale API | PATCH /api/me/preferences 제공, 기존 POST /api/locale도 로그인 회원 DB에 저장하여 기존 선택기와 입력 보존 계약 유지 |
| 회귀 테스트 | 기존 비인증 i18n fixture를 실제 서버 계정으로 전환. 동작 검증을 제거하거나 skip하지 않음 |
| lint | 기존 예외를 이동한 UI 파일 경로로 옮김. 계정의 localStorage 동기 effect 제거로 기존 경고 20→18 |

Better Auth 기본 handler와 세션 저장 방식이 다르므로 기본 handler를 동시에 노출하면 안 된다. 실제 이메일 adapter 추가 시 공급자 실패/재시도·발송 계약과 운영 설정을 별도로 설계·검증해야 한다.

## 4. 생성·변경 파일

| 영역 | 파일·범위 |
| --- | --- |
| 인증·메일 | lib/server/auth/{policy,service,http,session}.ts, lib/server/mail/sandbox.ts |
| 권한 | lib/server/authorization/guards.ts, app/api/admin/access/route.ts |
| API | app/api/auth/[action]/route.ts, app/api/me/route.ts, app/api/me/preferences/route.ts, app/api/locale/route.ts |
| DB | db/schema.ts, db/migrations/0001_greedy_wilson_fisk.sql 및 meta snapshot/journal |
| 화면 | app/sign-up, sign-in, verify-email, reset-password, change-password, profile-setup/login; 11개 앱 page와 page-content; 앱 layout |
| 클라이언트 | auth-flow-form, login/forgot/profile/my-page 컴포넌트, app-sidebar/header, lib/account-store.ts |
| 언어 | lib/i18n/server.ts, messages/{ko,en}/{auth,email}.json |
| 실행 | scripts/account.ts, package.json, .env.example, compose.yaml, next.config.ts, eslint.config.mjs, .gitignore |
| 테스트 | tests/unit/auth-policy.test.ts, tests/integration/auth.test.ts, tests/e2e/auth.spec.ts, tests/helpers/auth-fixture.ts; 기존 DB/i18n 회귀 fixture |
| 문서·증거 | Phase 3 계획/체크리스트/결과 MD·HTML, development-plan, Phase 4 인수인계, README/HANDOFF/scripts 안내, 화면·검증 요약 |

이전 Phase의 미커밋/미추적 파일을 보존했다. git diff 전체에는 이전 작업도 포함되어 있으므로 이번 변경만의 통계로 사용하지 않았다. 커밋·브랜치 변경·운영 배포는 수행하지 않았다.

## 5. 검증 결과

실제 명령·종료 코드·실패 원인과 수정은 [체크리스트](phase3-test-checklist.md), 실행 요약은 [검증 증거](evidence/phase3/verification.txt)에 있다.

| 분류 | 최종 결과 |
| --- | --- |
| 단위 | 6 files / 24 PASS: 기존 21 + 비밀번호/세션 정책·Origin·sandbox 3 |
| i18n | 2 files / 6 PASS: key/변수·정적 호출·namespace·enum·UI 문구 |
| PostgreSQL | 3 files / 25 PASS: 기존 기반/언어 13 + 인증·동시성·권한·계정 lifecycle 12 |
| Chromium | 3 files / 18 PASS: 인증 6 + 기존 기반/언어 12, 최종 51.6초 |
| 정적·빌드 | lint/typecheck/직접 tsc/production build 모두 exit 0, lint 신규 오류/경고 없음 |
| Docker/CLI | 4/4 PASS: 쿠키·화면, CLI 승격, 컨테이너 교체/세션 유지, CLI 정지/감사 |
| 구성·공백 | compose config --quiet 및 git diff --check 성공 |

[PC 회원가입](evidence/phase3/sign-up-en.png)과 [모바일 계정](evidence/phase3/account-en-mobile.png)을 직접 확인했다. 필수 검증은 모두 PASS이며 초기 실패를 최종 성공 수에 중복 합산하지 않았다.

## 6. 완료 게이트와 다음 Phase

| 조건 | 판정 |
| --- | --- |
| URL/localStorage/직접 소셜 인증 우회 차단 | 충족 |
| 비밀번호 신규/기존 분기·중복/토큰/권한 실패 처리 | 충족 |
| 복구/변경·기존 세션 폐기 | 충족 |
| 프로필/언어 선호·계정 전환·탈퇴/정지 | 충족 |
| 필수 테스트·정적/build·실행 증거 | 충족: 필수 4 PASS, 자동 73 PASS, smoke 4 PASS |
| 계획 차이·MD/HTML·인수인계 | 충족, 아래 마무리 기록에 문서 검증 결과 포함 |
| Phase 4에 필요한 인증 기반 | 인수 가능, Phase 3 개발 범위의 기술 차단 없음 |

Phase 4는 검증된 사용자 id와 소유권 가드로 업무 CRUD·파일 접근을 연결한다. 실제 업무 데이터는 아직 localStorage/mock이며 이번 인증 완료를 업무 저장/파일 보안 연동 완료로 오인하지 않는다. 서버 파일 endpoint는 부모 리소스를 확인한 뒤 DB 저장 경로를 사용해야 한다. worker/정리 작업은 withdrawal_pending 또는 suspended 상태에서 결과를 다시 공개하지 않아야 한다.

## 7. 운영 이월·한계

- 실제 메일 공급자·발신 도메인·실수신자 발송/도달성: 미구현·미검증. sandbox 성공과 구분한다.
- 소셜 OAuth와 공개 관리자 추가 인증: 비활성. 실제 관리자 이메일을 seed하거나 공개 접근을 허용하지 않았다.
- 영구 삭제·개인정보/감사/백업 보존 기간·파일 정리: 별도 결정 전 비활성. 탈퇴 접근 차단은 완료했지만 계정 데이터 삭제 완료는 아니다.
- 운영 프록시 IP 헤더는 반드시 프록시가 덮어쓰는 헤더로 설정한다. 미설정이면 unknown 공통 bucket으로 제한한다. 운영 다중 사용자 용량·부하·TLS 및 만료 auth 기록 정기 정리는 배포 준비 단계에서 검증/설정해야 한다.
- 실제 업무 CRUD/파일·늦은 worker·업무 데이터 계정별 분리는 Phase 4~5 범위다. 현재 브라우저 업무 저장소를 사용자별 서버 저장소로 취급하지 않는다.
- 기존 lint 경고 18건은 업무 화면 hydration 16건과 unused-disable 2건이다. 해당 화면의 서버 연동 단계에서 정리한다.

[Phase 3 계획](phase3-plan.md), [Phase 4 계획](phase4-plan.md), [실행 안내](../scripts/README.md)를 다음 작업의 입력으로 사용한다.


## 8. 마무리 기록

최종 합성 DB의 users/sessions/credentials/tokens/audit가 각각 0건임을 확인했고 합성 rate bucket 117개도 제거했다. sandbox 메일과 브라우저 세션 파일은 삭제했다. 테스트 web은 SIGTERM exit 143, DB는 exit 0으로 중지했다. 합성 DB 볼륨·migration/활성 언어·빌드 이미지는 보존했고 다른 프로젝트 서비스를 변경하지 않았다.

Markdown을 원본으로 HTML을 생성했다. 문서 검사 3/3 PASS: 계획/체크리스트/결과의 Markdown 로컬 링크 24개, HTML 로컬 링크 7개, 표 5개와 태그 구조·반응형/인쇄 CSS, MD/HTML 본문·완료 수치 일치를 검증했다. 외부 CDN·런타임 JavaScript·secret을 포함하지 않는다.
