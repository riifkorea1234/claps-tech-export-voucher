# Phase 9 검증 체크리스트

상태: 규칙 기반 구현 검증 PASS; 전체 Phase IN_PROGRESS(실제 사업 품질 검수 대기). 2026-09-24, Codex 단독. 규칙 기반 엔진을 사용하며 외부 공급자·메일 실발송 없음. 테스트용 PostgreSQL `claps_test`, 합성 계정·파트너·이미지만 사용한다.

| ID | 필수 | 검사 | 실행 명령/절차 | 기대 | 실제 |
| --- | --- | --- | --- | --- | --- |
| P9-T01 | 예 | 저장·복원·파일/권한 | phase9 integration, criteria E2E | revision 충돌·타인 파일·만료·위조 거절 | PASS — 아래 실행 증거 |
| P9-T02 | 예 | 공개·게시 번역·연락처 | phase9 integration/E2E | 비공개 후 과거 결과 제외, 원본 연락처 | PASS — 아래 실행 증거 |
| P9-T03 | 예 | 실제 규칙 handler·snapshot | phase9 unit/integration/worker E2E | 결정적 점수와 입력/후보/엔진 보존 | PASS — 아래 실행 증거 |
| P9-T04 | 예 | Hero·정렬·재추천·실패 | phase9 E2E | 같은 결과 집합, 실패 시 이전 성공 유지 | PASS — 아래 실행 증거 |
| P9-T05 | 예 | A/B·격리·제한·계산 시간 | phase9 unit/integration | 예상 순위, 200후보 CPU 1초 미만, 계정 분리 | PASS — 아래 실행 증거 |
| 정적 검사 | 예 | typecheck/lint/build | corepack pnpm typecheck/lint/build; Docker 동등 명령 | 오류 0 | PASS — 아래 실행 증거 |
| 기존 회귀 | 예 | 전체 unit/i18n/integration | corepack pnpm exec vitest run --project unit --project i18n; pnpm test:integration | 실패·skip 0 | PASS — 아래 실행 증거 |
| 실제 사업 품질 | 전체 Phase 필수 | 실제 공개 파트너·검수 평가 | 운영자 실제 데이터 등록 및 기대 추천 검수 | 합의 품질 충족 | BLOCKED: 실제 데이터/평가 기준 미제공 |
| 외부 AI 공급자 | 아니오 | 비용·모델 품질 | 사용자 규칙 엔진 선택 | 외부 호출 없음 | NOT_APPLICABLE |

최종 결과: 21 files / 고유 147 PASS / 0 최종 FAIL/skip. 단위36+i18n7+통합102+브라우저2. 반복 실행은 합산하지 않는다. 합성 코퍼스는 실제 사업 품질의 대체 증거가 아니다.

초기 실행 기록:

- 단위/i18n: 11 files / 43 PASS, 0 FAIL/skip, exit 0.
- 최초 Phase 9 통합은 테스트 설정에서 `DATABASE_URL`과 test URL이 같아 격리 보호 검증이 거절함: 0 tests, exit 1. 서비스의 게시 번역 조회를 현재 transaction의 locale DB로 변경하고 잘못된 전역 환경 덮어쓰기를 제거함.
- 다음 통합은 6개 중 5 PASS/1 FAIL: strict DTO가 동기 throw를 반환하여 rejects assertion에 도달하지 않음. 저장/요청 서비스 메서드를 async로 통일하여 검증 오류도 Promise rejection으로 일관되게 전달함. 전체 회귀에서 재검증 PASS.

추가 실행 기록:

- 전체 통합: 8 files / 101 PASS / 0 FAIL/skip, exit 0, 235.21초. 이후 연락처 nullable 계약 보완 및 테스트 1개를 추가했다.
- 보완 후 Phase 9 + 관리자 통합: Docker test 이미지에서 2 files / 24 PASS / 0 FAIL/skip, exit 0, 9.24초. Phase 9 8개 + 관리자 16개. 앞선 회귀와 중복을 제외하면 서버 통합 고유 테스트는 102개다.
- Docker에서 전체 unit 재실행은 42 PASS/1 FAIL: 기존 Phase 8 ZIP 검증에 필요한 python3가 slim test 이미지에 없었다(ENOENT). 후속 명령은 && 때문에 실행되지 않았다. Python이 설치된 host에서 같은 전체 unit/i18n을 재실행하여 11 files / 43 PASS / 0 FAIL/skip, exit 0, 32.47초 확인. 테스트를 skip하거나 ZIP assertion을 제거하지 않았다.
- Docker 최종 typecheck/lint: exit 0. lint 기존 경고 6, 신규 경고/오류 0. production 최종 build: exit 0, compile/TypeScript/route 생성 완료.
- 격리 test DB에서 db:migrate/db:seed/i18n:activate: exit 0. 운영 DB에는 적용하지 않았다.
- 첫 Chromium 실행: 기존 관리자 이미지/비공개 catalog 회귀 1 PASS. Phase 9은 첫 추천 성공 후 `getByLabel('Sort', exact:true)` 선택자가 select의 전체 라벨 텍스트와 일치하지 않아 대기했다. 별도 최소 브라우저 재현에서 정확 라벨 매칭 0개 확인 후 실행을 SIGINT로 중단(exit 130, 1 interrupted). 역할 기반 combobox 선택자로 바꾸고 개별 action timeout을 15초로 한정하여 Phase 9을 재실행했다. 중단을 성공으로 합산하지 않는다.


최종 브라우저/정적 검증:

- 다음 Phase 9 Chromium은 1 FAIL(exit 1): clipboard write 권한 거절로 복사 완료가 표시되지 않았다. 실제 거절 오류를 확인하고 상세 창 유지·ko/en 수동 복사 안내를 구현했다. 로컬 DTO 오류도 내부 Zod JSON 대신 번역된 안내를 표시한다.
- 최종 `E2E_BASE_URL=http://127.0.0.1:3189 E2E_MAIL_DIR=<sandbox> UPLOADS_DIR=<private sandbox> TEST_DATABASE_URL=<claps_test> corepack pnpm exec playwright test tests/e2e/phase9.spec.ts`: 1 PASS, 0 FAIL/skip, exit 0, test 46.4초/전체 약 1.1분. 복사 거절 안내 후 브라우저 권한을 허용해 실제 clipboard 텍스트를 확인했다. 이전 관리자 `import preview/export` 1 PASS와 합쳐 고유 브라우저 2 PASS다.
- 마지막 UI 보완 후 host 단위/i18n 전체 43 PASS(exit 0, 25.77초), Docker typecheck/lint/build exit 0. lint 기존 경고 6, 신규 0. backend 변경 없는 UI 보완이므로 이미 통과한 서버 102개를 다시 중복 실행하지 않았다.
- 브라우저는 실제 production 웹 + 실제 matching worker, 합성 partner DB를 사용했다. 실패 UI 검증만 격리 DB의 queued job을 failed로 변경했다. 공개 성공 fixture API나 test engine은 없다.
- [모바일 캡처](evidence/phase9/matching-mobile.png) 직접 확인: 390px, 가로 넘침 없음, 점수·근거·버튼 표시. 별도 사람의 직접 클릭 테스트는 수행하지 않았다.
- [결과 MD](phase9-result.md) · [결과 HTML](phase9-result.html). `python3 md/evidence/phase9/verify-docs.py --render`로 문서 검사하며 결과는 마지막 정리 기록에 남긴다.

최종 정리: 격리 DB users/partners/jobs/storage_tickets 모두 0건 확인. 이번 테스트 web 컨테이너 제거·test DB 중지, 임시 메일/업로드 디렉터리 정리 완료. DB volume·migration·빌드 이미지는 보존했다. 문서 검사 3항목 및 `git diff --check`는 PASS다.
