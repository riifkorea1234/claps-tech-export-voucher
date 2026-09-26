# Phase 8 독립 서버·다운로드 검증 체크리스트

상태: 승인된 독립 범위 PASS; 실제 공급자 포함 전체 Phase IN_PROGRESS. 실행일: 2026-09-23. 담당: Codex 단독.

범위는 사용자가 승인한 공급자 보류·독립 서버 구현이다. 실제 공급자 평가/Phase 7 생성→검증 흐름은 이 테스트의 성공으로 대체하지 않는다.

환경: Node 22.22.0, pnpm 10.34.5, Next 16.3.3, PostgreSQL 17.11 격리 `claps_test`, private 임시 파일, synthetic 계정/가이드/PNG. 실제 메일·공급자 호출 없음.

| ID | 필수 | 검사 | 명령/방법 | 기대 | 실제/상태 |
| --- | --- | --- | --- | --- | --- |
| P8-S01 | 예 | 계약/ZIP | `corepack pnpm exec vitest run --project unit --project i18n` | 보수적 판정·ZIP CRC/파일명·언어팩/기존 계약 | PASS, 최종 10 files / 38 PASS / 0 FAIL/skip, exit 0 |
| P8-S02 | 예 | 검증/최종화 | `TEST_DATABASE_URL=<격리 DB> corepack pnpm exec vitest run --project integration tests/integration/phase8.test.ts` | 소유권/버전/가이드/성공 job/동시성·늦은 결과 차단 | PASS, 최종 전체 통합에 포함된 18 PASS / 0 FAIL/skip |
| P8-S03 | 예 | 서버 회귀 | `TEST_DATABASE_URL=<격리 DB> corepack pnpm test:integration` | 기존 auth/workspace/jobs/admin/DB/i18n 유지 | PASS, 최종 7 files / 94 PASS / 0 FAIL/skip, exit 0; 최초 timeout 아래 기록 |
| P8-S04 | 예 | 실제 웹 E2E | `corepack pnpm exec playwright test tests/e2e/{phase8,jobs,workspace}.spec.ts --grep <아래 필터>` | 공급자 미등록 503·미검증 확정 차단·synthetic 서버 근거 확정→실제 ZIP worker→다운로드→취소·ko/en·390px | PASS, 선택된 3 files / 6 PASS / 0 FAIL/skip, exit 0 |
| P8-S05 | 예 | 정적/빌드 | `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm build` | 오류 0·production routes | PASS, Docker 최종 typecheck/lint/build exit 0; lint 오류 0/기존 경고 6/신규 경고 0 |
| P8-S06 | 예 | 문서/공백 | `git diff --check`, MD 링크·HTML 구조 검사 | 유효 보고서 | PASS, 공백 및 문서 3항목 검사 |
| P8-T01/T03/T05 실공급자 부분 | 원래 전체 Phase 필수 | 실제 평가/생성 전체 흐름 | 공급자/Phase 7 재개 후 | 실제 품질·생성부터 다운로드까지 | BLOCKED — 사용자가 실제 공급자 보류 승인 |
| migration/seed 변경 | 아니오 | DB | 기존 migrations 전체를 빈 test DB에 적용 | 새 schema 불필요 | NOT_APPLICABLE: 새 SQL schema 변경 없음; JSONB 계약 확장만. 기존 migration 회귀는 P8-S03 |
| 물리 파일 만료 삭제 | 아니오 | 보존 정책 | 기존 ledger·capability 만료 유지 | 원본/과거 증거 삭제 없음 | NOT_APPLICABLE: 기존 승인 범위가 물리 삭제 금지; ZIP 24시간 접근 만료·ledger 보존 검증 |

최초 실패 기록: 동시에 진행한 build/typecheck와 전체 회귀 중 기존 jobs child-worker 3개가 20초 안에 IPC ready를 전달하지 못했다. worker 부모 검사의 불필요 저장소 import를 분리하고 빌드와 분리 재실행한 결과 timeout 값을 늘리지 않고 94개 모두 통과했다. 호스트 파일 시스템의 느린 시작 영향과 구분했다. 테스트 helper의 `key = randomUUID()`가 UUID template literal 타입으로 추론되어 문자열 멱등키가 typecheck에서 거절되었으며 `key: string`으로 수정했다. 이어서 선택적 snapshot의 타입 좁히기 오류를 명시적 존재 검사로 수정하고 최종 Docker typecheck/build를 통과했다.

P8-S04의 가이드와 검증 성공 근거는 테스트 전용 직접 DB fixture다. 웹에서 가짜 성공 API를 제공하지 않는다. export worker는 실제 production handler를 사용한다.


## 최종 실행 증거

- `docker compose -f compose.test.yaml up -d --wait`: exit 0. 이번에 생성된 격리 DB에 기존 migration 전체를 테스트 beforeAll에서 적용했다.
- `corepack pnpm exec vitest run --project unit --project i18n`: exit 0, 10 files/38 PASS, 20.73초. Python 3 zipfile 독립 해제 검증 포함.
- `TEST_DATABASE_URL=<isolated claps_test> corepack pnpm test:integration`: exit 0, 7 files/94 PASS, 178.05초. 최초 88 PASS/3 timeout 이후 최종 재실행이다. Phase 8은 18개이며 추가 복구/변조 검사를 포함한다.
- `docker build --target test -t claps-phase8-test .`: exit 0. `docker run --rm claps-phase8-test sh -c 'pnpm typecheck && pnpm lint'`: exit 0, 기존 경고 6.
- `docker build --target web -t claps-phase8-web .`: exit 0, compile/TypeScript/정적 생성·신규 route 확인.
- 격리 네트워크의 test 이미지에서 `pnpm db:seed && pnpm i18n:activate`: exit 0. 운영 데이터에 적용하지 않았다.
- production web localhost:3188 + 실제 export worker, 공유 private uploads/sandbox 메일로 Chromium 실행. 환경은 E2E_BASE_URL/E2E_MAIL_DIR/UPLOADS_DIR/TEST_DATABASE_URL 및 E2E_EXTERNAL_WORKER=1. 필터: `production server|creates and links|forces API ownership|restores real job|distinguishes cancellation|forces job ownership`. 결과 3 files/6 PASS, 42.3초. grep으로 선택하지 않은 다른 E2E는 성공/skip 수에 포함하지 않는다.
- 최종 합계: 단위31+i18n7+서버통합94+브라우저6 = **138 PASS / 0 FAIL / 0 skip**, 20 files. 문서 3개 검사는 별도이며 테스트 수에 더하지 않는다.
- 모바일 390px 캡처를 직접 확인했다. 원본 PNG와 ZIP 다운로드, 만료/타인·최종 취소 후 접근 차단을 확인했다. 실공급자 정확도·비용·대규모 부하·사람의 별도 직접 클릭 평가는 수행하지 않았다.

[결과](phase8-result.md) · [HTML](phase8-result.html) · [모바일](evidence/phase8/final-mobile.png)


최종 보완: 테스트 전용 worker helper의 top-level await를 현재 tsx 실행 형식에 맞는 async main으로 변경했다. worker 컨테이너를 중지한 상태에서 Phase 8 Chromium만 재실행하여 host helper로 실제 ZIP 처리도 1 PASS(35.7초) 확인했다. 이 중복 테스트는 138개 합계에 추가하지 않는다. 수정 helper를 마운트한 Docker typecheck도 exit 0이다. production 코드 변경은 없다.

문서 검사: `python3 md/evidence/phase8/verify-docs.py --render`로 로컬 MD 링크, HTML 구조, MD와 HTML의 정확한 본문·상태·수치 동일성을 확인했다. 환경 정리 시 격리 users/projects/jobs/storage_tickets는 모두 0건이다. 테스트 web/worker/DB는 중지하고 임시 sandbox 파일을 정리한다. DB volume·migration·빌드 이미지는 보존한다.
