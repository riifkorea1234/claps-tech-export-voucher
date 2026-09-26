# Phase 4 테스트 진행 체크리스트

## 1. 환경과 최종 결과

- 작업일 2026-09-23, Codex 단독 수행. Node 22.22.0 / pnpm 10.34.5 / Next 16.3.3 / sharp 0.35.3 / PostgreSQL 17.11 / Chromium·Playwright 1.63.0.
- 전용 Compose `claps-phase4-tests`, 새 DB 볼륨, private `claps-phase4-uploads`, loopback web 3104, sandbox `/tmp/claps-phase4-mail`. 다른 프로젝트와 운영 데이터를 변경하지 않았다.
- **16 files / 93 tests / 93 passed / 0 failed / 0 skipped**: unit 24 + i18n 6 + PostgreSQL integration 39 + Chromium E2E 24.
- 필수 **5 PASS / 0 FAIL / 0 BLOCKED / 0 PENDING**. 기본 검사도 PASS. 세션 썸네일 보완 후 workspace E2E 6개를 추가 재검증했고, 마지막 PATCH 생략 필드 보존 보완 후 전체 suite를 다시 검증했다(고유 수에 중복 합산하지 않음).
- lint **0 errors / 6 기존 warnings**, typecheck·직접 tsc·production build exit 0.
- Docker persistence/cleanup smoke **4 checks / 4 PASS**, 자동 테스트 수와 별도다.

## 2. 필수 검증

| ID | 필수 여부 | 분류 | 대상·명령/절차 | 기대 결과 | 실제 결과 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| P4-T01 | 필수 | 권한/통합 | workspace 통합 및 E2E: A/B 프로젝트·세션·에셋·library·파일 읽기/변경/연결, ownerId 주입, Origin | 교차 접근/참조 차단 | 소유권 없는 ID는 404, 주입 422, Origin 403, 인증 부재 401 | PASS |
| P4-T02 | 필수 | DB/API | 31개 프로젝트 CRUD·30건 페이지·IP 리터럴 검색·최근/오래된 정렬·KPI·동시 version·없는 ID | 서버 데이터·시각·정확한 집계, 충돌/404 | 첫 페이지 30/다음 1, 와일드카드 문자 리터럴 처리, 동시 수정 1 성공+1 충돌, 실존하지 않는 상세 404 | PASS |
| P4-T03 | 필수 | 파일/보안 | 실제 PNG/JPEG/WebP, 확장자/위장 MIME/손상/초과 10MiB/경로/만료/타인/다른 부모 ticket | 불허 요청 차단, 원본·썸네일 분리 | 실제 디코딩, PNG 원본 checksum 일치, WebP 320px, 단회 연결·만료·소유 검사, 실패 ledger 기록 | PASS |
| P4-T04 | 필수 | E2E | 프로젝트 생성/실패 재시도/편집/검색/페이지/보관/복구/커버·세션 연결/이름/채택 후 새로고침 | 저장 성공 후 갱신, 입력 보존, mock 미이관 | 전체 E2E 24 PASS 및 마지막 보완 workspace 6 PASS; ko/en 입력·URL 보존, 390/1280px 화면 확인 | PASS |
| P4-T05 | 필수 | 복구/삭제 | 부모/세션 독립 보관·복구·withdrawal_pending·worker 가드·Docker DB restart/web 교체·파일 참조/정리 | 비활성 결과 차단, 데이터/파일 보존, 참조 유지 | ID/인증 세션/원본·썸네일 checksum 보존, 보관 시 기존 파일 링크 차단·복구 시 재개, 물리 파일 유지 | PASS |
| 기본 | 필수 | 정적/회귀 | lint, typecheck, tsc, build, unit/i18n/integration/e2e, compose config, diff --check | 신규 오류 없음, skip 없음 | 모두 exit 0, 신규 경고 없음; 기존 경고 18→6 | PASS |

프로젝트/세션 보관과 에셋 삭제는 논리 상태 변경이다. 영구 파일/개인정보 삭제 완료를 의미하지 않는다. 실제 이미지 생성은 검증하지 않았으며 합성 fixture만 사용했다.

## 3. 실제 실행 명령

| 명령·절차 | 종료 코드 | 최종 결과 |
| --- | --- | --- |
| docker compose -p claps-phase4-tests -f compose.test.yaml up -d --wait | 0 | 새 격리 DB healthy |
| corepack pnpm add sharp@0.35.3 --save-exact / db:generate | 각 0 | 직접 의존성 및 0002 additive migration |
| docker build --target test -t claps-phase4-test . | 0 | Node/pnpm 고정 테스트 이미지 |
| Docker test: pnpm db:migrate / db:seed / i18n:activate | 각 0 | 새 DB schema·멱등 seed·ko/en 활성화 |
| Docker test: pnpm exec vitest run --project unit --project i18n --project integration | 0 | 12 files / 69 PASS / 0 skip, 최종 11.05초 |
| Docker test: pnpm typecheck && pnpm exec tsc --noEmit && pnpm lint | 0 | 타입 성공, lint 0 errors / 6 기존 warnings |
| docker build --target web -t claps-phase4-web . | 0 | production build, 런타임 secret 없이 성공 |
| E2E 환경 설정 후 corepack pnpm test:e2e | 0 | 4 files / 24 PASS / 0 skip, 최종 전체 실행 1.5분 |
| 세션 썸네일 보완 이미지: corepack pnpm exec playwright test tests/e2e/workspace.spec.ts | 0 | 영향 범위 6/6 재검증, 37.5초; 중복 합산 제외 |
| corepack pnpm exec tsx tests/helpers/phase4-persistence.ts prepare/verify/cleanup | 각 0 | 아래 smoke 4 PASS |
| Docker DB restart·web 컨테이너 교체 | 각 0 | 같은 DB/파일 볼륨 유지, 서비스 정상 재개 |
| 합성 환경변수 docker compose config --quiet / git diff --check | 각 0 | 구성·공백 검사 성공 |

E2E_BASE_URL은 `http://127.0.0.1:3104`, E2E_MAIL_DIR은 별도 sandbox, TEST_DATABASE_URL은 격리 claps_test DB다. secret/쿠키/전체 세션 파일은 보고서에 포함하지 않는다. [실행 요약](evidence/phase4/verification.txt)을 함께 보존한다.

## 4. Docker·화면 검증

| Check | 실제 검증 | 결과 |
| --- | --- | --- |
| 1 | 합성 계정·프로젝트·세션·에셋 준비, 인증 원본/썸네일 요청, SHA-256과 private/attachment 헤더 | PASS |
| 2 | PostgreSQL 재시작 및 web 컨테이너 교체 후 동일 계정 세션으로 원본/썸네일 다시 조회 | 같은 ID·제목·프로젝트 연결·양쪽 checksum, PASS |
| 3 | 프로젝트 보관 후 이미 발급된 다운로드 링크 요청, 복구 후 재요청 | 404→200, 원본 checksum 보존, PASS |
| 4 | 합성 계정/DB fixture와 private 세션 상태 정리 | users/projects/sessions/assets/tickets/jobs 각각 0, PASS |

[모바일 프로젝트](evidence/phase4/project-mobile.png)와 [PC 프로젝트](evidence/phase4/project-desktop.png)를 도구로 직접 확인했다. 모바일의 제목 줄바꿈 문제를 수정하고 제목 최소 표시 폭을 E2E로 검증했다. 캡처에는 합성 표시명만 있다.

## 5. 초기 실패·수정·재검증

| 최초 결과 | 원인 | 수정·재검증 |
| --- | --- | --- |
| 호스트 typecheck/tsc exit 2 | sharp namespace Metadata 타입 없음 | named Metadata import, 최종 typecheck/tsc/build PASS |
| 최초 통합 포함 자동 suite 7 FAIL / 59 PASS | 저장 키 첫 세그먼트의 확장자가 기존 fileSchema 규약과 불일치; 서비스 입력 검증은 동기 throw인데 Promise 계약 테스트; DB created_at 컬럼 수 fixture | UUID-original/thumbnail 키, public service async 계약, additive schema 16개/시각 컬럼 15개로 갱신; 66 PASS 후 파일/lifecycle 3개 보강, 최종 69 PASS |
| 첫 lint 신규 이미지 관련 경고 2 | private 이미지의 eslint 지시문 위치 | 해당 private img 줄 앞에 정확히 위치, 최종 신규 경고 0 |
| 최종 코드 검토에서 PATCH 생략 필드 기본값 적용 발견 | Zod 4에서 default 필드의 partial은 생략된 필드에도 기본값을 적용 | default 없는 독립 PATCH schema로 수정; 동시 편집 통합·커버 E2E에 IP/설명/상태 보존 assertion 추가, 최종 전체 재검증 |
| 첫 모바일 캡처의 세로 제목 | 헤더 가로 flex에서 텍스트 영역이 지나치게 축소 | 모바일 세로/PC 가로 배치, 실제 화면 재확인 및 E2E 제목 폭 검증 PASS |

기존 Phase 2 localStorage E2E fixture는 서버 프로젝트/세션/합성 에셋으로 바꾸고 입력/언어 보존 검증을 유지했다. 테스트를 제거하거나 skip으로 바꾸지 않았다. 재시도·재검증 성공 수를 총계에 중복 합산하지 않았다.

## 6. 적용 제외·운영 한계

| 범주 | 상태 | 사유·후속 |
| --- | --- | --- |
| 실제 생성/가이드 추출/검증/최종화/ZIP | NOT_APPLICABLE | Phase 6~8. 현재 합성 fixture와 CRUD/조회·채택 기반만 검증 |
| worker 실제 처리·재시도·만료 청소 | NOT_APPLICABLE | Phase 5. 여기서는 lifecycle 잠금/정리 ledger·참조 검사 계약만 검증 |
| 영구 삭제·보존 기간 | NOT_APPLICABLE | 사용자 결정대로 비활성. 합성 테스트 파일 정리는 제품 삭제 기능과 별개 |
| 외부 공급자·실제 메일·운영 ingress/TLS·부하 | NOT_APPLICABLE | 별도 계정·운영 준비 Phase. 로컬 private 파일과 sandbox만 검증; ingress body 10MiB 설정 필요 |
| 실제 운영 백업/PITR·복원 | NOT_APPLICABLE | 여기서는 named volume 재시작 보존만 검증. Phase 11 복원 훈련 별도 |

## 7. 마무리·판정

E2E/통합 fixture 정리 뒤 업무 데이터 0건을 확인했다. 합성 rate bucket, 합성 파일, sandbox 메일과 private 세션 파일을 제거했다. 최초 정리와 PATCH 보완 재검증을 합해 rate bucket 182개, 파일 24개, sandbox 메일 71개를 정리했다. 테스트 web/DB를 중지하고 named volume·migration·빌드 이미지는 보존했다. 다른 프로젝트 서비스는 변경하지 않았다.

필수 5 PASS, 자동 93 PASS, smoke 4 PASS로 Phase 4 개발 범위의 완료 게이트를 충족한다. [결과 보고서](phase4-result.md)의 문서 검증 기록을 함께 확인한다.
