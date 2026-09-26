# Phase 4 상세 개발 플랜 — 프로젝트·세션·에셋 CRUD·영속 파일

## 1. 기본 정보

| 항목 | 내용 |
| --- | --- |
| Phase | 4 |
| 상태 | `EXECUTED` — 구현·필수 검증 완료, 결과 보고서 COMPLETED |
| 작성일 | 2026-09-22 |
| 예상 기간 | 5~7 작업일; 1명 순차 수행 기준 초기 추정, 외부 결정·계정 준비 대기 제외. 착수 조사 후 재산정 |
| 담당 | 백엔드·프론트엔드 (실제 담당: Codex 단독 수행) |
| 요구사항 추적 | PROJ-01~03, SESS-01~02, FILE-01 업로드/단일 파일, UI-01 |
| 전체 검증 연결 | T-03·T-04·T-05·T-13·T-17; T-14 데이터/파일 재시작 |

문서 작성은 구현 시작이나 Phase 완료를 의미하지 않는다. 선행 결과와 이 Phase의 필수 결정을 확인한 뒤 `READY`로 변경하고 계획을 공유한다. 이후 `IN_PROGRESS → EXECUTED`로 진행하며, `COMPLETED`는 완료 게이트를 충족한 결과 보고서의 판정이다. 미결정 사항으로 구현을 시작할 수 없으면 원인과 재개 조건을 적고 `BLOCKED`로 변경한다.

## 2. 배경과 목표

프로젝트·생성 세션과 파일을 계정별 서버 데이터로 전환하고 새로고침/재시작 후에도 보존한다.

## 3. 입력 자료와 이전 Phase 인수인계

- [전체 개발 플랜](development-plan.md): 제품 범위·DB/API 계약·최종 완료 기준의 기준 문서.
- [Phase 진행 규칙](phase-development-process-rules.md): 시작·테스트·보고·완료 게이트.
- [기존 연동 가이드](../HANDOFF.md), [저장소 설명](../README.md), [AGENTS.md](../AGENTS.md).
- [Phase 3 계획](phase3-plan.md)과 `phase3-test-checklist.md`, `phase3-result.md`, `phase3-result.html`을 확인했다. 이전 결과는 `COMPLETED`, 필수 검증 4 PASS로 구현 시작 게이트를 충족한다.
- 필요한 인수인계: Phase 3 인증/소유권·탈퇴 정책, Phase 1 DB/공유 볼륨, Phase 2 번역/API locale.

후속 Phase를 미리 계획하는 것은 허용하되 구현은 번호 순서대로 진행한다. 이전 Phase의 실패·차단·이월 항목이 이 단계의 완료 기준에 영향을 주면 먼저 해결하거나 범위/계약 변경을 기록한다.

## 4. 현재 상태 조사

착수 당시 projects-store/assets-store/session-assets-store는 localStorage 배열을 저장했다. 커버는 data URL/gradient이며 없는 ID에도 샘플 헤더가 나왔다. 현재 구현에서는 비동기 API와 소유권 404로 전환했다.

공통 조사 기준은 `feature/backend`의 현재 작업 트리다. 이번 문서 분할 시 `md/`는 기존 미추적 사용자 파일이었으며 원본 규칙을 보존한다. `package.json`에는 `dev/build/start/lint`만 있고 DB·인증·테스트 의존성은 없다. `node_modules/next/dist/docs/`는 현재 확인되지 않았다. 구현 착수 시 설치된 Next.js 버전의 로컬 가이드를 확보·확인한 뒤 코드를 작성한다. 이 문서는 미래 Phase의 코드가 이미 존재한다고 가정하지 않는다. 착수 시 실제 파일, 의존성, 작업 트리 및 이전 결과와 차이를 다시 기록한다.

## 5. 구현 범위

프로젝트 CRUD·KPI·검색/페이지·보관/복구, 세션 CRUD/프로젝트 연결, 에셋 조회·채택/삭제 기반, 업로드 ticket·파일 메타·권한 다운로드·썸네일·임시 파일 정리 계약을 구현한다. 공통 비동기 UI·충돌·404를 연결한다. 실제 생성은 Phase 7이며 합성 에셋으로 기반을 검증한다.

이 단계에서 추가·변경하는 사용자/관리자 문구는 ko/en 파일 언어팩에 함께 반영한다. 업무 데이터 번역은 `localized_contents`만 사용하고, 고정 UI·랜딩·메일 문구는 DB로 옮기지 않는다.

## 6. 제외 범위

가이드 추출·이미지 생성·검증·최종 확정·ZIP worker. 목업 데이터를 소유 증명 없이 서버에 자동 이관하지 않는다.

결제·구독, 조직 협업, 범용 CMS, 자동 침해 신고는 전체 초기 범위에서 제외한다. 새로운 비용·제품 정책·공개 계약이 필요하면 구현 전에 전체 플랜과 이 문서의 변경 이력을 갱신한다.

## 7. 결정·가정·질문

프로젝트/세션 소유자 일치·생성 전 프로젝트 이동·수동 커버>최근 최종본>기본 커버 정책을 적용한다. 파일 크기/MIME/보존/탈퇴 정책은 확정값을 사용한다. 생성 후 프로젝트 이동 정책이 미정이면 해당 변경을 허용하지 않는다.

권장안과 확정 사항을 구분한다. 이 문서 작성에는 추가 승인이 필요하지 않으며, 미결정 항목은 해당 구현의 시작 게이트에서 해결한다. 실제 과금·메일 발송·외부 데이터 변경 검증은 진행 규칙 8.6에 따라 승인된 대상과 환경에서만 수행한다.

## 8. 작업 분해와 실행 순서

위에서 아래 순서로 진행한다. 각 작업의 선행 산출물을 확인하고 담당 영역이 산출물·검증 증거를 남긴다.

| 작업 ID | 작업 | 산출물 | 의존성 | 담당 영역 | 검증 |
| --- | --- | --- | --- | --- | --- |
| P4-01 | 업무 DTO·repository·소유권/충돌 처리 구현 | 대상별 CRUD·version 계약 | Phase 3 완료 | 백엔드 | P4-T01 |
| P4-02 | 프로젝트 검색·KPI·세션 목록/연결 구현 | 서버 페이지·집계·UTC 시각 | P4-01 | 백엔드 | P4-T02 |
| P4-03 | 파일 저장·ticket·다운로드·참조 정리 구현 | 원본/썸네일·소유 파일 API | P4-01 | 백엔드/운영 | P4-T03 |
| P4-04 | 화면/store 비동기 교체·404·충돌·커버 연결 | 실제 서버 목록/상세 | P4-02~03 | 프론트 | P4-T04 |
| P4-05 | 보관/탈퇴·늦은 결과 차단 계약·재시작 검증 | 정리 예약 계약·영속성 증거 | P4-04 | 공통 | P4-T05 |

## 9. 예상 파일/API/DB/화면 영향

다음은 예상 경로다. 아직 없는 경로는 생성 예정이며 도구 선택으로 경로가 달라지면 구현 전에 기록한다.

- 생성: `lib/server/projects/`, `lib/server/asset-sessions/`, `lib/server/assets/`, `lib/server/storage/`, 관련 `lib/contracts/`, `lib/api/`, `app/api/`.
- 변경: `lib/projects-store.ts`, `lib/assets-store.ts`, `lib/session-assets-store.ts`, `lib/project-cover.ts`와 호출 화면.
- 변경: `app/(app)/projects/`, `app/(app)/assets/`, 커버/세션/프로젝트 컴포넌트·언어팩; 생성: CRUD/파일 테스트.

| 영역 | 영향 |
| --- | --- |
| DB migration | projects/asset_sessions/assets 제약·인덱스·version 확인 및 필요한 additive migration. 파일 메타는 소유 레코드 JSONB. |
| seed | A/B 소유 프로젝트·빈/다수 세션·에셋/커버 fixture. 운영 데이터 자동 생성 없음. |
| API 계약 | /api/projects·/stats·/:id/library, /api/asset-sessions, /api/assets/:id, POST /api/uploads, GET /api/files/:token. 아직 없는 최종본은 빈 library가 정상. |
| 화면 | 30건 프로젝트 페이지·목록/상세·세션명 통일·빈/로딩/실패/404·중복 제출 방지. |
| 인프라 | web/worker 공유 파일 볼륨, ingress/앱/스토리지 동일 크기 제한, 경로/확장자/MIME 검증. |
| 삭제 | 기본적으로 삭제 파일 없음. 기존 store/mock은 호출자 전환과 참조 검색이 끝난 뒤 해당 Phase 소유 범위에서만 제거한다. |

## 10. 테스트 계획

기본 검사: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`. Phase 1에서 제공할 목표 명령은 `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm test:i18n`, `pnpm db:migrate`, `pnpm db:seed`다. **착수 시 Phase 1의 추가 scripts 설치를 확인했다. 실제 결과는 체크리스트에 기록한다.** 실제 도구/필터 인자는 Phase 1에서 확정하고 착수 시 이 문서와 체크리스트에 실행 가능한 명령을 갱신한다. 테스트가 0개이거나 필수 suite가 skip이면 통과로 처리하지 않는다.

A/B 사용자, 잘못된 소유 관계·없는 ID·동시 version·정상/위장/초과 크기 파일·만료 ticket fixture. worker 늦은 응답 실행 검증은 Phase 5에서 이어간다.

아래는 **실행 전 검증 설계**다. 구현이 끝나면 `phase4-test-checklist.md`에 환경·명령/절차·실제 결과·종료 코드·suite/test 성공/실패/skip 수·실패 원인·수정·재검증을 기록한다. 해당 Phase에 적용하지 않는 테스트 범주는 삭제하지 말고 `NOT_APPLICABLE` 사유와 이후 검증 Phase를 기록한다.

| ID | 필수 여부 | 분류 | 명령 또는 실행 절차 | 기대 결과 | 현재 상태 |
| --- | --- | --- | --- | --- | --- |
| P4-T01 | 필수 | 권한/통합 | A가 B의 프로젝트/세션/에셋 ID를 읽기·변경·연결 | 교차 계정 접근/참조 전부 차단, 권한 필드 입력 무시 | PASS — 체크리스트 참조 |
| P4-T02 | 필수 | DB/API | CRUD·검색·정렬·페이지·KPI·동시 편집·없는 ID | 정확한 집계·version 충돌·404, 샘플 fallback 0건 | PASS — 체크리스트 참조 |
| P4-T03 | 필수 | 파일/보안 | MIME/크기/경로 변조·만료/타인 token·썸네일 요청 | 불허 업로드/다운로드 차단·원본/썸네일 분리 | PASS — 체크리스트 참조 |
| P4-T04 | 필수 | E2E | 생성/수정/검색/페이지/커버/세션 연결 후 새로고침 | 서버 상태 유지·오류/빈 상태 구분·중복 제출 방지 | PASS — 체크리스트 참조 |
| P4-T05 | 필수 | 복구/삭제 | 보관/복구·탈퇴 계정 접근·컨테이너 재시작·참조 파일 삭제 요청 | 데이터/파일 보존·접근 차단·참조 훼손/고아 파일 방지 | PASS — 체크리스트 참조 |

기본 코드 검사는 코드가 변경되는 Phase마다 필수다. 표의 필수 검증 중 하나라도 `FAIL/BLOCKED/PENDING`이면 완료할 수 없다. test adapter/sandbox 통과와 실제 공급자 품질 검증을 구분한다.

## 11. 완료 조건

- [x] 업무 CRUD가 서버에서 계정별로 동작하고 저장 실패를 성공으로 표시하지 않는다.
- [x] 타인 파일/업무 객체 접근과 version 충돌을 강제한다.
- [x] 재시작 후 데이터/원본/썸네일이 유지되고 정리 대상이 추적된다.
- [x] 작업별 필수 검증이 모두 `PASS`이고 미실행을 성공으로 기록하지 않았다.
- [x] 상세 계획 대비 차이, 변경 파일, 실제 명령·결과 및 이월 항목을 기록했다.
- [x] `phase4-test-checklist.md`, `phase4-result.md`, `phase4-result.html`을 실제 실행 후 작성했다.
- [x] MD/HTML 상태·수치·미완료·인수인계가 일치하고 문서 링크/HTML 구조가 검증되었다.
- [x] 다음 Phase를 막는 미해결 항목이 없다.

## 12. 위험과 대응

DB와 파일 삭제는 단일 트랜잭션이 아니다. 예약/연결 완료/만료 상태를 추적하고 실제 정리 실행은 Phase 5 worker로 넘긴다. JSON 커버 참조는 서버에서 무결성을 검사한다.

## 13. rollback/복구

업무 쓰기/업로드를 제한한 후 DB와 파일의 같은 기준 시점 백업으로 복원하거나 호환 이전 이미지로 전환한다. 서버 데이터를 localStorage 값으로 덮어쓰지 않는다.

사용자 변경을 포함한 작업 트리를 통째로 초기화하지 않는다. 적용한 migration과 코드 버전의 호환성을 확인하며, 데이터가 존재하는 환경의 파괴적 되돌리기는 백업/복구 검증 없이 실행하지 않는다.

## 14. 결과 증거와 다음 Phase 인수인계

결과 증거: 권한/충돌 응답·실제 파일 checksum·화면 갱신·재시작 전후 ID/파일 비교.

다음 단계: [Phase 5](phase5-plan.md)에 작업 대상 소유권·파일 adapter·보관/탈퇴/정리 예약·결과 반영 가드를 전달한다.

구현·검증 후 생성할 파일은 `phase4-test-checklist.md`, `phase4-result.md`, `phase4-result.html`이다. 현재 미생성 파일은 완료 증거로 링크하지 않는다. HTML은 외부 CDN/런타임 JavaScript 없이 단일 파일·반응형·인쇄 CSS로 작성한다. 로그·화면 증거에서 secret, 세션 쿠키, 개인정보, 비공개 원문을 제거한다. MD를 원본으로 삼고 두 보고서에 같은 완료 판정과 수치를 기록한다.

## 15. 변경 이력

| 날짜 | 변경 | 근거/상태 |
| --- | --- | --- |
| 2026-09-22 | 전체 개발 플랜을 Phase별 상세 계획으로 분할 | 사용자 요청·Phase 진행 규칙 반영; `DRAFT`, 구현/테스트 미착수 |


## Phase 3 인수인계 (2026-09-23)

- [결과 MD](phase3-result.md), [체크리스트](phase3-test-checklist.md), [결과 HTML](phase3-result.html): 승인 개발 범위 COMPLETED. 필수 4 PASS, 자동 73 PASS, smoke 4 PASS, 기존 lint 18 warnings.
- users.id와 검증된 세션만 인증 주체로 사용한다. requireUser/requirePage/requireOwned는 lib/server/authorization/guards.ts, 세션 조회는 lib/server/auth/session.ts에 있다. 앱 page는 서버 가드 래퍼이며 기존 화면은 page-content.tsx다.
- 업무 mutation은 세션/계정 상태·소유권 확인과 DB 쓰기를 같은 transaction에서 수행한다. AuthService.authenticated의 계정 행 잠금·세션 재검사 패턴을 따른다. 독립 가드 호출 후 별도 transaction에서 쓰면 정지/탈퇴와의 경합을 다시 검토해야 한다.
- 파일 endpoint는 raw storageKey 요청을 직접 열지 말고 부모 리소스의 소유권을 검사한 뒤 DB 메타데이터를 사용한다. 업무 CRUD/파일 다운로드/삭제·실제 사용자별 업무 저장은 아직 연결되지 않았다.
- 탈퇴는 withdrawal_pending, 정지는 suspended다. 세션/메일 토큰 폐기와 접근 차단만 완료했다. 계정/업무/파일/감사/백업 영구 삭제·익명화는 보존 정책 별도 결정 전 비활성이며 늦은 worker 결과로 부활시키지 않는다.
- 회원 locale은 users.preferences.locale이다. 첫 가입 현재 locale 저장, 로그인 시 회원 선호 cookie 동기화, PATCH /api/me/preferences 및 POST /api/locale 회원 저장이 제공된다. 사용자 고정 문구·메일은 ko/en 파일팩에 유지한다.
- 세션/메일 토큰은 DB digest 저장 방식이다. Better Auth 기본 handler와 혼용하지 않는다. auth_rate_limits migration을 먼저 적용한다. 재설정/변경/정지/탈퇴/승격은 기존 세션을 폐기한다.
- 실제 메일은 미연결, 명시적 로컬 sandbox만 제공한다. 소셜·공개 관리자는 비활성이다. 확인·프로필 완료 fixture를 pnpm account promote/suspend로 관리하며 공개 admin API는 admin도 차단한다.
- E2E는 격리 claps_test DB와 sandbox bind mount 및 E2E_MAIL_DIR이 필요하다. 기존 비인증 앱 접근 fixture를 되돌리지 않는다. 실제 환경에서 로그인 없이 기능을 시험하려고 우회 코드를 추가하지 않는다.
- Phase 4 구현은 미착수다. 이 인수인계는 업무 CRUD나 파일 서비스 완료를 의미하지 않는다.

## 착수 조사·실행 계획 (2026-09-23)

- Phase 3 계획·체크리스트·MD/HTML 결과를 확인했다. COMPLETED, 필수 4 PASS이며 인증 기반을 인수한다. 이전 미커밋/미추적 변경을 보존한다.
- Next 16.3.3 로컬 Route Handlers / Fetching Data 가이드를 읽었다. DB/auth/test 의존성과 scripts는 이미 설치되어 있으며 앞선 초안의 미설치 설명은 작성 당시 기록이다.
- Codex 단독 수행. P4-01~02 READY 후 IN_PROGRESS: strict DTO, 기존 users 행 잠금 transaction, 계정별 CRUD·version·검색·30건 페이지·KPI 및 보관/복구부터 구현한다.
- P4-03은 파일 정책 답변 대기: PNG/JPEG/WebP 10MiB, 업로드 15분, 다운로드 5분을 제안했다. 확정 전 파일 구현은 진행하지 않는다. 영구 삭제 비활성은 Phase 3 확정 정책을 유지한다.
- 보관 프로젝트의 세션/에셋은 부모 보관 상태로 접근을 막고 복구 시 다시 표시한다. 세션 개별 보관은 부모 복구와 별도로 유지한다. 생성 job/에셋이 있는 세션의 프로젝트 이동은 금지한다.
- 에셋 생성/검증/최종화 엔진은 후속 Phase다. 사용자 화면의 임의 목업 생성·최종화 쓰기는 비활성화하고 조회·채택·보관만 실제 API에 연결한다.
- additive migration으로 프로젝트 자유 입력 IP와 파일 ticket/정리 ledger가 필요한 경우 기록한다. 파일 메타 원본은 기존 소유 레코드 JSONB를 유지한다.
- 검증: pnpm lint/typecheck/build, test:unit/integration/i18n/e2e. 격리 claps-phase4-tests DB/업로드 볼륨을 사용하고 A/B·충돌·파일·보관/복구·컨테이너 재시작을 검증한다.
- 사용자에게 위 순서와 기존 변경 보존 방침을 공유했다. 완료 판정은 실제 검증과 MD/HTML 보고서 작성 후 수행한다.

### 파일 기준 확정·설계 보완
사용자가 제안 기준을 승인했다: PNG/JPEG/WebP, 10MiB(10×1024×1024 bytes), 업로드 15분, 다운로드 5분. P4-03 READY→IN_PROGRESS. 원본·썸네일은 공유 볼륨에 분리 저장하고 sharp로 실제 디코딩·최대 40MP·단일 프레임을 검증한다. 경로는 서버 생성 UUID만 사용한다. additive storage_tickets 테이블은 임시 업로드 및 다운로드 권한의 만료/연결 상태 ledger이며 별도 영구 files 엔티티가 아니다. 소유 레코드 JSONB가 연결 파일의 원본 메타다. 교체 파일은 cleanup_pending 상태로 보존하고 worker 영구 삭제는 구현하지 않는다. 자유 입력 IP는 기존 ip_name 컬럼으로 충분하여 migration이 필요 없다.

### 구현·검증 중 확인한 차이
- CRUD는 `lib/server/projects/service.ts`의 WorkspaceService에 모아 계정 잠금·소유권·DTO 변환을 공유했다. 파일은 storage/service, 후속 worker 가드는 assets/lifecycle로 분리했다.
- 기존 프로젝트 목록의 20개 클라이언트 페이지를 계획대로 서버 기본 30개로 교체했다. 서버 목록/선택기는 검색·페이지를 지원한다.
- 프로젝트/세션 상세와 단계 화면은 실제 서버 제목·카운트·private 썸네일로 표시하며 샘플 fallback을 제거했다. 생성/검증/최종화 목업 버튼은 준비 중 상태로 대체했다.
- 모니터링 화면의 프로젝트/라이브러리 선택 호출만 비동기에 맞게 호환 수정했다. 탐지 기능·기록 자체는 Phase 10 범위 그대로다.
- 0002 additive migration, sharp 0.35.3 직접 의존성, UPLOADS_DIR 설정을 추가했다. 원본과 썸네일 키는 기존 fileSchema 규약에 맞게 UUID-original / UUID-thumbnail을 사용한다.
- 첫 통합 검증에서 저장 키 규약 불일치·동기 검증 오류/Promise 계약·DB 테이블 수 fixture를 수정했다. 재검증 69 PASS, 최초 E2E 24 PASS. 모바일 캡처에서 좁은 제목 폭을 발견해 헤더를 반응형으로 수정하고 최종 재검증 중이다.
- PostgreSQL 재시작 + web 컨테이너 교체 뒤 ID/세션·원본/썸네일 checksum 보존을 실제 검증했다. 별도 smoke 기록을 체크리스트에 남긴다.

### 최종 실행 기록
필수 P4-T01~05 모두 PASS. 고유 자동 93 PASS(단위 24+i18n 6+통합 39+E2E 24), smoke 4 PASS. 마지막 세션 썸네일 보완 후 관련 E2E 6개도 재통과했다. lint 0 errors/기존 6 warnings, typecheck/tsc/build 성공. [체크리스트](phase4-test-checklist.md), [결과 MD](phase4-result.md), [결과 HTML](phase4-result.html)에 실제 명령·실패 수정·인수인계를 기록했다. 문서 게이트 검증은 evidence/phase4/verification.txt에 기록한다.

### 최종 검토 보완
Zod 4의 default 필드를 partial로 감싸도 기본값이 적용되는 동작을 실제 확인했다. PATCH 계약은 default 없는 독립 strict schema로 변경하여 이름/커버/보관 수정에서 IP·설명·상태를 덮어쓰지 않도록 한다. 기존 동시 편집 테스트와 커버 E2E에 생략 필드 보존 assertion을 추가했다. 완료 보고서의 고유 테스트 수는 동일하나 최종 재검증을 마친 뒤 확정한다.

최종 PATCH 보완 후 자동 93 PASS, typecheck/tsc/build/lint 성공을 재확인했다. 문서 검증 3/3 PASS, 합성 fixture 정리 및 테스트 서비스 중지까지 완료했다.
