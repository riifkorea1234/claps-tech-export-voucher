# Phase 6 테스트 체크리스트

상태: COMPLETED — 필수 5 PASS, 자동 고유 142 PASS/0 FAIL/0 skip. 실행일: 2026-09-23 Asia/Seoul.
환경: Node 22.22.0 / pnpm 10.34.5 / Next 16.3.3 / PostgreSQL 17.11. 격리 Compose `claps-phase6-tests`, localhost:3106 web, Chromium. 실제 공급자·운영 메일·운영 콘텐츠 사용 없음.

## 필수 검증

| ID | 필수 | 분류·대상 | 실행 절차 | 기대 결과 | 실제 결과 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| P6-T01 | 필수 | 7개 메뉴·접근성·언어 | admin.spec.ts, 기존 i18n/workspace 회귀 | 모바일/키보드·목록/상세·화면 언어와 콘텐츠 언어 분리·입력 보존 | 최종 관리자 Chromium4 PASS | PASS |
| P6-T02 | 필수 | 권한·추가 인증·감사·CRUD·jobs | admin.test.ts, admin.spec.ts | 일반 회원 거절·15분/현재세션·정지·재시도·감사 원자성 | 서버 관리자16 PASS, HTTP 최종 관리자 Chromium4 PASS | PASS |
| P6-T03 | 필수 | locale | admin.test.ts 및 기존 i18n.test.ts | 미배포 활성화·ko 비활성·순환 거절·파일팩 교집합 | 모두 거절, 등록/준비 상태 정상 | PASS |
| P6-T04 | 필수 | 게시·revision·캐시·seed | admin.test.ts 및 catalog HTTP | 초안 비노출·게시 실패 보존·원문 변경 표시·60초 내 갱신·seed 보존 | 서버 검증 PASS, HTTP 최종 관리자 Chromium4 PASS | PASS |
| P6-T05 | 필수 | JSON preview/import/export | admin.test.ts 및 admin.spec.ts | 무변경 preview·원자적 import·no-op 재적재·동시충돌·악성/큰/금지 필드 거절 | 서버 검증 PASS, 브라우저 최종 관리자 Chromium4 PASS | PASS |
| 기본 | 필수 | lint/typecheck/build·회귀 | 아래 명령 | 오류 0, 기존 동작 보존 | 111 서버 PASS, 기존 Chromium27 PASS, build/typecheck exit0, lint 0 errors/6 기존 warnings | PASS |

## 실행 명령과 결과

격리 DB URL은 체크리스트에서 `<isolated-test-db>`로 표기한다. 실제 명령에는 compose.test.yaml의 합성 계정을 사용했으며 운영 connection string은 사용하지 않았다.

- `docker compose -p claps-phase6-tests -f compose.test.yaml up -d --wait`: exit 0.
- 최초 호스트 관리자 suite: `TEST_DATABASE_URL=<isolated-test-db> corepack pnpm exec vitest run --project integration tests/integration/admin.test.ts`: exit1, 1 file/13 tests, 12 PASS/1 FAIL/0 skip. 대시보드 SQL의 day 별칭 문법 오류. usage_date로 수정.
- 호스트 unit/i18n: 9 files/34 PASS/0 FAIL/0 skip, exit0. 이후 추가 언어팩 회귀 1개는 최종 결과에 포함.
- 호스트 전체 integration은 느린 파일 접근으로 실행을 중지하고 Docker에서 재실행했다. 중지한 실행은 PASS로 집계하지 않는다.
- 최초 web build: exit1, textarea 컴포넌트 모듈 누락. 기존 UI 스타일에 맞는 textarea wrapper를 추가했다. TypeScript에서 sharp Metadata 타입도 수정했다.
- `docker run --rm --network claps-phase6-tests_default -e TEST_DATABASE_URL=<isolated-test-db> claps-phase6-test pnpm exec vitest run --project unit --project i18n --project integration`: exit0, 15 files/107 PASS/0 FAIL/0 skip, 26.15초.
- 최종 추가 회귀를 포함한 같은 명령의 `claps-phase6-test-final`: exit0, **15 files/111 PASS/0 FAIL/0 skip**, 21.01초. 단위28+i18n7+통합76. 통합 관리자16, 기존 통합60.
- `docker run --rm claps-phase6-test-final sh -c 'pnpm typecheck && pnpm lint'`: exit0. next typegen 및 tsc --noEmit 통과. lint 오류0, 기존 경고6, 신규 경고0.
- `docker build --target web -t claps-phase6-web-final .`: exit0. Next production compile/TypeScript/route 생성 통과. 빌드에 runtime DB/인증 secret을 제공하지 않았다.
- `docker run ... claps-phase6-test sh -c 'pnpm db:migrate && pnpm db:seed && pnpm i18n:activate'`: exit0. 0004/0005 적용 및 재실행 확인. DB 통합 suite의 migration/seed 회귀도 통과.
- 최초 관리자 Chromium: 1 file/4 tests, 1 PASS/3 FAIL/0 skip, exit1. 공통 UI loader가 admin namespace를 제외하여 문구를 찾지 못함. loader와 언어팩 regression 수정.
- 2차 전체 Chromium: 6 files/31 tests, 29 PASS/2 FAIL/0 skip, exit1, 3.3분. 일반 회귀27 모두 PASS, 관리자2 PASS/2 FAIL. Next route announcer가 전역 alert selector에 포함된 문제를 main으로 제한하고 실제 table 로드도 기다리도록 변경. select에 명시적인 접근성 이름을 추가.
- 마지막 관리자 Chromium: `E2E_BASE_URL=http://127.0.0.1:3106 E2E_MAIL_DIR=/tmp/claps-phase6-mail TEST_DATABASE_URL=<isolated-test-db> corepack pnpm exec playwright test tests/e2e/admin.spec.ts`: exit0, **1 file/4 PASS/0 FAIL/0 skip**, 38.1초. 최신 production 이미지에서 일반 회원/Origin/strict DTO, 7개 메뉴·390px 키보드·만료, 생성/초안/게시·언어 유지, 실제 JSON UI preview/import/export·잘못된 이미지/큰 body·비공개 경계를 확인했다.
- `git diff --check`: exit0.

## 적용 제외와 한계

| 분류 | 상태 | 사유·후속 검증 |
| --- | --- | --- |
| 실제 운영 계정·MFA·외부 메일 | NOT_APPLICABLE | 승인된 개발용 비밀번호 재확인만 구현, 운영 공개 전 별도 게이트 |
| 실제 파트너 원본·번역 검수 | NOT_APPLICABLE | D-08/D-10 운영 자료 미제공. 합성 fixture만 게시, 실제 카탈로그/검수는 운영 게시 전 |
| 가이드 추출·판정 규칙/버전 게시 | NOT_APPLICABLE | Phase 7, Phase 6는 목록과 표시 번역 계약만 |
| 실제 생성·추천·탐지 공급자 품질/과금 | NOT_APPLICABLE | Phase 7~10. synthetic job 안전 재시도와 구분 |
| 영구 삭제·파일/감사 보존 만료 | NOT_APPLICABLE | 기존 정책대로 비활성. 파일 ledger·참조 보존만 확인 |
| 대규모 부하·운영 TLS·백업복원 | NOT_APPLICABLE | Phase 11. 목록/필터·동시 수정 검증을 운영 부하 시험으로 주장하지 않음 |

브라우저 자동화는 실제 HTTP와 키보드·반응형 검증이며 사람의 수동 사용성 평가를 대체했다고 주장하지 않는다. 화면 증거는 합성 데이터만 포함한다. 최종 고유 수치는 **21 files/142 PASS/0 FAIL/0 skip**: 단위28+i18n7+통합76+Chromium31(기존27+최종 관리자4). 중간 실행의 중복 성공은 합산하지 않는다. [결과 보고서](phase6-result.md)와 [HTML 보고서](phase6-result.html)를 따른다.

## 화면 확인과 최종 게이트

[모바일 관리자](evidence/phase6/admin-mobile.png)·[콘텐츠 번역 편집](evidence/phase6/translation-editor.png)을 캡처 후 직접 열어 확인했다. 390px 본문 가로 넘침 없음, 모바일 메뉴는 가로 스크롤, 원문/초안 구분과 ko UI/en 편집 언어 유지 확인. 수동 직접 클릭 별도 시험은 수행하지 않았으며 키보드/폼/언어/게시 흐름은 Chromium 자동화 증거다.

문서 검증은 별도 3개 검사로 제품 테스트142와 중복 합산하지 않는다. 필수 P6-T01~05 PASS와 정적/빌드/회귀 통과로 승인된 개발 범위 완료 게이트를 충족했다. 운영 공개와 실제 공급자/콘텐츠 검수 게이트는 미완료가 아니라 본 Phase의 명시적 제외 범위다.

최종 정리: 격리 업무/계정/번역/감사/ticket 레코드0건, 합성 rate-limit66행·sandbox 메일25개·이미지10개 정리. 실패 trace0개. web/DB 중지, DB named volume·migration·이미지 보존. 문서 검증 `python3 md/evidence/phase6/verify-docs.py --render`: exit0, 3 PASS(링크31·HTML표5/링크7·본문/수치 동일).
