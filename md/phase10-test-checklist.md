# Phase 10 독립 범위 검증 체크리스트

상태: 승인 독립 범위 PASS; 전체 Phase IN_PROGRESS(실제 공급자 보류). 사용자 승인 범위: 공급자 없는 서버 기록·원본·이력·관리자. 실제 검색 품질은 별도 BLOCKED. 모든 데이터는 격리 claps_test의 합성 계정/이미지이며 외부 호출 없음.

| ID | 검증 | 상태 |
| --- | --- | --- |
| P10-T01 | 원본 checksum/에셋 소유권·20건 페이지·UTC·검색·보관/복구·version | PASS — 아래 실행 증거 |
| P10-T02 | HTTPS 링크 검증·결과 상태/중복 계약 | PASS — 아래 실행 증거 |
| P10-T02 외부 수집 | DNS/redirect SSRF·외부 이미지 크기 | NOT_APPLICABLE — 이번 범위는 외부 fetch 없음; 실제 공급자 단계 필수 |
| P10-T03 | 0건/부분/실패 이력·멱등성·최근 성공·늦은 완료·사용량 | PASS — 아래 실행 증거 |
| P10-T04 | 브라우저 원본/이름/보관/복구·미연결503·관리자 감사·ko/en/mobile | PASS — 아래 실행 증거 |
| P10-T05 독립 복구 | worker lease 만료·응답 불명·보관/탈퇴 가드 | PASS — 아래 실행 증거 |
| P10-T05 실제 검색 | 실제 공급자 커버리지·품질/비용/지연 평가 | BLOCKED — 사용자 선택으로 공급자 미연결 |
| 기본/회귀 | unit/i18n/integration/lint/typecheck/production build | PASS — 아래 실행 증거 |

실행 중 발견: 첫 targeted 검사 17개 중 6 PASS/11 FAIL. 테스트 계정 app_role을 member로 수정하고 번역팩 outcome 중첩 객체를 기존 평면 키 구조로 수정했다. 첫 Docker build는 테스트 key 매개변수의 UUID template 추론 오류로 exit 1; string을 명시했다. 실패를 통과로 집계하지 않는다. 재검증 결과는 실행 후 기록한다.

## 최종 실행 결과 (2026-09-24)

| 검사 | 명령/환경 | 최종 결과 |
| --- | --- | --- |
| 단위/i18n | host Node22.22.0, `corepack pnpm exec vitest run --project unit --project i18n` | 12 files / 46 PASS / 0 FAIL/skip, exit0, 28.31초 |
| 전체 통합 회귀 | 격리 TEST_DATABASE_URL, `corepack pnpm test:integration` | 초기 9 files / 110 PASS / 1 FAIL, exit1, 245.91초. 실패는 신규 에셋 fixture의 generation_job_id 누락 |
| 신규 통합 재검증 | `corepack pnpm exec vitest run --project integration tests/integration/phase10.test.ts` | 최종 1 file / 9 PASS / 0 FAIL/skip, exit0, 24.54초. 전체 회귀와 합쳐 고유 111 PASS |
| 브라우저 | 격리 production web 127.0.0.1:3190 + sandbox 메일 + Chromium, `corepack pnpm exec playwright test tests/e2e/phase10.spec.ts` | 1 file / 1 PASS / 0 FAIL/skip, exit0, 25.4초(테스트6.2초) |
| production 빌드 | `docker build --target web -t claps-phase10-web .` 내부 `pnpm build` | exit0, TypeScript/route 생성 포함 |
| host typecheck | `corepack pnpm typecheck` | exit0 |
| migration | 통합 beforeAll의 migrateDatabase, 0007 적용 | PASS, 격리 DB에만 적용 |
| seed | 격리 DATABASE_URL, `corepack pnpm db:seed` | exit0, db_seed_complete |

고유 자동 테스트 총 **158 PASS**: 단위39+i18n7+통합111+브라우저1, 22 files. 반복 실행을 중복 합산하지 않는다. Phase 10 전용은 단위3+통합9+브라우저1이다.

추가 실패 기록: 신규 에셋 fixture에 generation job을 추가한 첫 재검증은 8 PASS/1 FAIL(request_hash 형식 오류)이었다. fixture hash를 64자리 hex로 보완하고 최종 9개를 다시 통과했다. 생성 job FK 순서에 맞춰 합성 데이터 정리 순서도 수정했다. 실제 검색 공급자를 호출하거나 운영 DB를 수정하지 않았다.

최종 검증 내용:

- P10-T01 PASS: 업로드 원본 바이트 일치, 타인 원본/ticket/에셋 차단, ticket 일회성/만료, 위조 이미지 거절, 이름 변경/version 경쟁, 보관/복구, 검색 특수문자 리터럴, 22건→20+2 페이지, 연도 경계 UTC 정렬.
- P10-T02 독립 범위 PASS: HTTPS 링크 정규화, IP/로컬/인증정보/불허 scheme/port 거절, 정규화 후 중복과 불일치 결과 거절. DNS/redirect 요청은 수행하지 않으며 SSRF fetch 안전성을 주장하지 않는다.
- P10-T03 PASS: 주입 fixture handler가 원본을 읽어 empty/partial/results를 반환, failed 이력 분리, 멱등/진행 중 충돌, 최신 성공 보존, 오래된 완료 요약 역행 차단, 시간당 제한. 운영 registry에는 fixture 미등록.
- P10-T04 PASS: production HTTP 503/CSRF403/타계정404·파일 checksum, 브라우저 생성/이름/새로고침/보관/복구, 관리자 추가 인증·감사·보관/복구, fixture 등록 환경의 관리자 재실행/감사, ko/en·390px 가로 넘침 없음. [모바일 캡처](evidence/phase10/monitoring-mobile.png)를 직접 확인했다.
- P10-T05 독립 범위 PASS: queued 보관 취소, running 늦은 완료 차단, 탈퇴 상태 접근 차단, lease 만료와 dispatch 이후 PROVIDER_UNKNOWN/자동 재시도 금지. 프로세스 강제 종료는 기존 jobs 회귀가 담당하며 신규 테스트는 만료 lease를 주입한다.
- 실제 공급자 평가 BLOCKED 유지: 원본 외부 전달/보존·검색 커버리지·DNS/redirect/외부 썸네일 수집·비용/지연/품질 합의와 검증은 미실행.

기본 정적 최종 결과와 문서/정리 기록은 아래에 추가한다.

최종 정적 검사: Docker test 이미지의 `pnpm typecheck && pnpm lint` exit0. lint 오류0, 기존 경고2(apple-icon/opengraph-image unused directive), 신규 경고0. 이미지 private 인증 경로는 public optimizer를 거치지 않도록 명시했다. host 신규 파일 대상 lint도 exit0.

최종 정리: 격리 DB users/monitoring_records/jobs/storage_tickets 모두0건 확인. 이번 production web 컨테이너 제거, 테스트 DB 중지, 임시 sandbox 메일/업로드 디렉터리 정리. DB volume·migration·빌드 이미지는 보존했다.

문서 검증: 로컬 링크·단일 HTML 구조·MD/HTML 렌더 본문 일치 3항목 PASS, `git diff --check` PASS.
