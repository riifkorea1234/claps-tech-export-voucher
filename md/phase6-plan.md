# Phase 6 상세 개발 플랜 — 어드민 7개 메뉴·운영 CRUD·DB 콘텐츠 번역

## 1. 기본 정보

| 항목 | 내용 |
| --- | --- |
| Phase | 6 |
| 상태 | `EXECUTED` — 구현·필수 검증 완료, 결과 보고서 COMPLETED |
| 작성일 | 2026-09-22 |
| 예상 기간 | 6~8 작업일; 1명 순차 수행 기준 초기 추정, 외부 결정·계정 준비 대기 제외. 착수 조사 후 재산정 |
| 담당 | 프론트엔드·백엔드·운영 (실제 담당자 배정은 착수 시 기록) |
| 요구사항 추적 | OPS-01, I18N-01, UI-02 어드민, MATCH-02 파트너 master |
| 전체 검증 연결 | T-12 기본, T-19·T-20·T-22 게시, T-03·T-18·T-23·T-24 어드민 |

문서 작성은 구현 시작이나 Phase 완료를 의미하지 않는다. 선행 결과와 이 Phase의 필수 결정을 확인한 뒤 `READY`로 변경하고 계획을 공유한다. 이후 `IN_PROGRESS → EXECUTED`로 진행하며, `COMPLETED`는 완료 게이트를 충족한 결과 보고서의 판정이다. 미결정 사항으로 구현을 시작할 수 없으면 원인과 재개 조건을 적고 `BLOCKED`로 변경한다.

## 2. 배경과 목표

운영자가 회원·프로젝트·파트너·작업을 관리하고 업무 콘텐츠 번역을 검토/게시할 수 있게 한다.

## 3. 입력 자료와 이전 Phase 인수인계

- [전체 개발 플랜](development-plan.md): 제품 범위·DB/API 계약·최종 완료 기준의 기준 문서.
- [Phase 진행 규칙](phase-development-process-rules.md): 시작·테스트·보고·완료 게이트.
- [기존 연동 가이드](../HANDOFF.md), [저장소 설명](../README.md), [AGENTS.md](../AGENTS.md).
- [Phase 5 계획](phase5-plan.md)과 구현 후 생성될 `phase5-test-checklist.md`, `phase5-result.md`, `phase5-result.html`을 순서대로 읽는다. 이전 결과가 `COMPLETED`이고 필수 검증이 모두 `PASS`인지 확인한다. 2026-09-23 Phase 5 결과가 생성되었으며 COMPLETED, 필수 5 PASS다. 아래 인수인계와 Phase 6 자체 미결정 사항을 착수 시 확인한다.
- 필요한 인수인계: Phase 3 관리자 가드·계정 상태, Phase 4 CRUD/파일, Phase 5 job 운영 서비스, Phase 2 파일팩/locale.

후속 Phase를 미리 계획하는 것은 허용하되 구현은 번호 순서대로 진행한다. 이전 Phase의 실패·차단·이월 항목이 이 단계의 완료 기준에 영향을 주면 먼저 해결하거나 범위/계약 변경을 기록한다.

## 4. 현재 상태 조사

2026-09-23 착수 조사: Phase 5 결과·체크리스트·HTML은 COMPLETED, 필수 5 PASS·자동 고유 121 PASS·smoke 4 PASS다. 기존 작업 트리에 Phase 1~5 미커밋/미추적 변경이 다수 있으며 그대로 보존한다. 관리자 UI/API는 없고 `messages/{ko,en}/admin.json`은 빈 객체다.

실제 Node 22.22.0, pnpm 10.34.5, Next 16.3.3 및 unit/integration/i18n/E2E·migration·seed 스크립트가 존재한다. 설치된 `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`와 `01-app/02-guides/data-security.md`의 요청 시 조회·서버 DAL·최소 DTO 지침을 확인했다.

- `assertAdmin`은 active/admin 여부 검사 뒤에도 무조건 403이다. D-02에서 웹 접근을 추가 인증 구현 전까지 비활성화했기 때문이다. 단순 role 검사로 바꾸어 이 정책을 우회하지 않는다.
- `AuthService.authenticated`는 users 행 잠금 후 세션 유효성을 재검사한다. 관리 대상 사용자/작업을 변경할 때 actor와 target 잠금 순서를 통일해 상호 관리의 교착을 방지해야 한다.
- partners/locales의 version, partners/brand_guides의 source_revision, localized_contents 및 감사 테이블은 이미 존재한다. 번역 draft와 published의 revision/version을 독립적으로 추적하는 부분은 보완해야 한다.
- `publishedContent`는 게시본만 조회하고 fallback 메타를 반환한다. 원본 리소스의 권한/공개 여부 검사는 호출 서비스가 담당한다. 관리 조회와 사용자 조회를 공유 캐시에 섞지 않는다.
- `JobService.retryLocked`를 동일 관리자 transaction 안에서 재사용할 수 있다. 소유자 세션 가장 없이 대상 소유자 상태·부모·제한과 감사 기록을 함께 검사한다. 응답 불명 작업은 계속 재시도 금지다.
- 운영 partner seed 자료는 제공되지 않았다. 기존 D-08/D-10 게이트를 유지하고 개발 검증에는 격리 합성 fixture만 사용한다.

## 5. 구현 범위

대시보드·회원·프로젝트·파트너·가이드·작업·모니터링 7개 메뉴, 공통 검색/목록/상세/폼, 회원 정지/세션 폐기, 프로젝트 보관/복구, 파트너 CRUD/공개, 작업 재시도/취소, 감사 기록, 언어 현황/등록/활성화와 DB 번역 draft/publish/import/export를 구현한다. 가이드/모니터링은 메뉴와 공통 목록 계약을 준비하고 실기능은 Phase 7/10에서 완성한다.

이 단계에서 추가·변경하는 사용자/관리자 문구는 ko/en 파일 언어팩에 함께 반영한다. 업무 데이터 번역은 `localized_contents`만 사용하고, 고정 UI·랜딩·메일 문구는 DB로 옮기지 않는다.

## 6. 제외 범위

UI/메일/랜딩 언어팩 업로드·범용 CMS·API 키 편집·CRM·관리자 판정 덮어쓰기. 미완성 가이드/탐지 메뉴를 실제 기능 완료로 표시하지 않는다.

결제·구독, 조직 협업, 범용 CMS, 자동 침해 신고는 전체 초기 범위에서 제외한다. 새로운 비용·제품 정책·공개 계약이 필요하면 구현 전에 전체 플랜과 이 문서의 변경 이력을 갱신한다.

## 7. 결정·가정·질문

관리자 접근 범위·감사 열람/보존·상태 변경 사유 정책은 확정값 사용. 번역은 partner와 guide 표시 필드만 허용하며 규칙 조건·연락처·URL·숫자는 원본에 둔다. 기본 원문과 기본 언어 게시본은 동일 트랜잭션으로 동기화한다.

권장안과 확정 사항을 구분한다. 이 문서 작성에는 추가 승인이 필요하지 않으며, 미결정 항목은 해당 구현의 시작 게이트에서 해결한다. 실제 과금·메일 발송·외부 데이터 변경 검증은 진행 규칙 8.6에 따라 승인된 대상과 환경에서만 수행한다.

### 착수 당시 결정 대기 — D-02 (이력, 아래 승인으로 해소)

기존 전체 계획 D-02는 CLI 관리자 지정만 확정했으며 추가 인증 방식은 미확정이다. Phase 진행 규칙 6.4의 권한 정책 결정에 해당한다. 사용자의 Phase 6 진행 요청에 따라 조사·구현 계획 준비는 수행하되, 인증 방식 결정 전에는 웹 관리자 차단을 해제하지 않는다.

권장 개발안은 **기존 비밀번호 재확인 후 현재 세션에만 15분간 관리자 접근 허용**이다. 역할/활성 상태·세션 유효성·추가 인증 만료를 모든 관리자 요청에서 서버 검사하고, 재확인 시도 제한·same-origin을 적용한다. 로그아웃·비밀번호 변경·정지·세션 폐기 시 효력이 사라져야 한다. 이는 MFA가 아니며 운영 추가 인증/출시 게이트와 별개다. 대안은 TOTP 구현 또는 웹 관리자 접근 차단 유지다. 당시에는 사용자 선택을 대기했다. 아래 승인 후 실행 계획의 사용자 확정으로 해소되었다.

재개 조건: 개발용 추가 인증 방식 선택. 이후 필요한 additive migration/API 계약을 확정하고 READY 계획을 공유한 뒤 P6-01부터 진행한다. 감사 보존·영구 삭제 비활성 정책과 실제 콘텐츠 게시 검수 게이트는 기존 결정을 유지한다.

## 8. 작업 분해와 실행 순서

위에서 아래 순서로 진행한다. 각 작업의 선행 산출물을 확인하고 담당 영역이 산출물·검증 증거를 남긴다.

| 작업 ID | 작업 | 산출물 | 의존성 | 담당 영역 | 검증 |
| --- | --- | --- | --- | --- | --- |
| P6-01 | 관리자 shell·7개 메뉴·공통 목록/폼·언어 선택 | 가드된 운영 UI | Phase 5 완료 | 프론트 | P6-T01 |
| P6-02 | 대시보드·회원/프로젝트·파트너·작업 서비스 연결 | 운영 CRUD·감사 로그 | P6-01 | 백엔드/프론트 | P6-T02 |
| P6-03 | locale 등록/준비 상태/활성화 구현 | 파일팩 교집합·fallback 검증 | P6-02 | 백엔드 | P6-T03 |
| P6-04 | 번역 초안/게시·revision·캐시 구현 | 필드별 schema·원자적 게시 | P6-02~03 | 백엔드 | P6-T04 |
| P6-05 | JSON preview/import/export·콘텐츠 언어 탭 구현 | 원자적 import·충돌/오류 안내 | P6-04 | 공통 | P6-T05 |

## 9. 예상 파일/API/DB/화면 영향

다음은 예상 경로다. 아직 없는 경로는 생성 예정이며 도구 선택으로 경로가 달라지면 구현 전에 기록한다.

- 생성: `app/admin/`, `components/admin/`, `app/api/admin/`, `lib/server/admin/`, `lib/server/localized-contents/`.
- 변경: `lib/server/partners/`, 언어 registry/조회, `messages/*/admin.json`, 파트너 표시 번역.
- 생성: 운영 권한·감사·번역 게시/import/캐시 테스트.

| 영역 | 영향 |
| --- | --- |
| DB migration | partners/admin_audit_logs/localized_contents 활용. source_revision 저장 위치·version/FK/인덱스 추가는 migration으로 기록. |
| seed | 운영 파트너 원본과 ko/en 번역은 승인된 데이터만. 재실행으로 운영 게시본을 덮어쓰지 않음. |
| API 계약 | /api/admin/overview·users·projects·partners·jobs·guides·monitoring-records·audit-logs, /locales, /localized-contents/:type/:key/:locale 및 import-preview/import/publish/export. |
| 화면 | 7개 메뉴·목록/상세·언어 현황 탭·원문/번역 비교·초안/게시 구분. 헤더 UI 언어와 콘텐츠 편집 언어 분리. |
| 인프라 | 캐시 키에 locale·권한·게시 version, 게시 60초 이내 갱신; API secret은 환경변수 유지. |
| 삭제 | 기본적으로 삭제 파일 없음. 기존 store/mock은 호출자 전환과 참조 검색이 끝난 뒤 해당 Phase 소유 범위에서만 제거한다. |

## 10. 테스트 계획

기본 검사: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`. Phase 1에서 제공할 목표 명령은 `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm test:i18n`, `pnpm db:migrate`, `pnpm db:seed`다. **실제 scripts가 존재함을 확인했다. 이번 착수 조사에서 테스트를 실행하거나 통과 처리하지 않았다.** 실제 도구/필터 인자는 Phase 1에서 확정하고 착수 시 이 문서와 체크리스트에 실행 가능한 명령을 갱신한다. 테스트가 0개이거나 필수 suite가 skip이면 통과로 처리하지 않는다.

일반/관리자·공개/비공개 파트너·게시/초안·원문 변경·잘못된 JSON/중복/큰 입력·동시 version·미배포 언어 fixture. guide 번역은 합성 fixture로 계약 검증, 실제 버전 흐름은 Phase 7.

아래는 **실행 전 검증 설계**다. 구현이 끝나면 `phase6-test-checklist.md`에 환경·명령/절차·실제 결과·종료 코드·suite/test 성공/실패/skip 수·실패 원인·수정·재검증을 기록한다. 해당 Phase에 적용하지 않는 테스트 범주는 삭제하지 말고 `NOT_APPLICABLE` 사유와 이후 검증 Phase를 기록한다.

| ID | 필수 여부 | 분류 | 명령 또는 실행 절차 | 기대 결과 | 현재 상태 |
| --- | --- | --- | --- | --- | --- |
| P6-T01 | 필수 | E2E/접근성 | 7개 메뉴·검색/페이지·헤더 전환·키보드/모바일 | 메뉴 7개·사용 가능 범위 명확·폼/콘텐츠 언어 유지 | PENDING |
| P6-T02 | 필수 | 권한/감사 | 일반 사용자 관리 요청·관리자 정지/복구/재시도/비공개 변경 | 우회 차단·actor/대상/시각/변경/사유 기록·secret 비노출 | PENDING |
| P6-T03 | 필수 | locale 통합 | 미배포 언어 활성화·기본 언어 비활성·순환 fallback 요청 | 모두 거절·교집합만 노출 | PENDING |
| P6-T04 | 필수 | 게시/캐시 | 초안·게시 실패·원문 변경·locale/권한 전환·seed 재실행 | 초안 미노출·이전 게시본 보존·갱신 필요 표시·60초 내 반영 | PENDING |
| P6-T05 | 필수 | import 통합 | preview→import→재업로드·동시 수정·악성/미허용 필드 | 원자적 반영·중복 0건·충돌 거절·UI/email/landing 입력 거절 | PENDING |

기본 코드 검사는 코드가 변경되는 Phase마다 필수다. 표의 필수 검증 중 하나라도 `FAIL/BLOCKED/PENDING`이면 완료할 수 없다. test adapter/sandbox 통과와 실제 공급자 품질 검증을 구분한다.

## 11. 완료 조건

- [x] 7개 메뉴와 이 단계의 회원/프로젝트/파트너/작업 운영 기능이 동작한다.
- [x] DB 번역 게시/import/캐시/감사 및 권한 필수 검증을 통과했다.
- [x] 가이드·모니터링 실기능의 미완료 범위를 Phase 7/10에 명시했다.
- [x] 작업별 필수 검증이 모두 `PASS`이고 미실행을 성공으로 기록하지 않았다.
- [x] 상세 계획 대비 차이, 변경 파일, 실제 명령·결과 및 이월 항목을 기록했다.
- [x] `phase6-test-checklist.md`, `phase6-result.md`, `phase6-result.html`을 실제 실행 후 작성했다.
- [x] MD/HTML 상태·수치·미완료·인수인계가 일치하고 문서 링크/HTML 구조가 검증되었다.
- [x] 다음 Phase를 막는 미해결 항목이 없다.

## 12. 위험과 대응

범용 번역 resource_key는 FK가 아니므로 원본 존재/권한·정리·고아 검사를 서비스에서 강제한다. 원문 편집과 번역 게시의 동시 수정으로 잃어버린 갱신을 version 조건으로 방지한다.

## 13. rollback/복구

변경/게시 경로를 제한하고 이전 게시 version을 복구·캐시 무효화한다. 이전 UI 이미지로 복원하더라도 감사/원본/초안은 보존한다.

사용자 변경을 포함한 작업 트리를 통째로 초기화하지 않는다. 적용한 migration과 코드 버전의 호환성을 확인하며, 데이터가 존재하는 환경의 파괴적 되돌리기는 백업/복구 검증 없이 실행하지 않는다.

## 14. 결과 증거와 다음 Phase 인수인계

결과 증거: 7개 메뉴 화면·권한/감사 기록·import 전후 diff·실측 캐시 반영 시간·콘텐츠 편집 언어 보존.

다음 단계: [Phase 7](phase7-plan.md)에 가이드 메뉴·번역 허용 필드/규칙 ID 계약·원문 revision·공통 job/파일 운영 동작을 전달한다.

구현·검증 후 생성할 파일은 `phase6-test-checklist.md`, `phase6-result.md`, `phase6-result.html`이다. 현재 미생성 파일은 완료 증거로 링크하지 않는다. HTML은 외부 CDN/런타임 JavaScript 없이 단일 파일·반응형·인쇄 CSS로 작성한다. 로그·화면 증거에서 secret, 세션 쿠키, 개인정보, 비공개 원문을 제거한다. MD를 원본으로 삼고 두 보고서에 같은 완료 판정과 수치를 기록한다.

## 15. 변경 이력

| 날짜 | 변경 | 근거/상태 |
| --- | --- | --- |
| 2026-09-22 | 전체 개발 플랜을 Phase별 상세 계획으로 분할 | 사용자 요청·Phase 진행 규칙 반영; `DRAFT`, 구현/테스트 미착수 |

## Phase 5 인수인계 (2026-09-23)

- [결과](phase5-result.md)·[체크리스트](phase5-test-checklist.md)·[HTML](phase5-result.html): COMPLETED. 필수 5 PASS, 자동 고유 121 PASS, smoke 4 PASS. Phase 6 구현은 아직 시작하지 않았다.
- jobs 큐·lease token/heartbeat/deadline·dispatch/cost·retry child UNIQUE가 구현되었다. 0003_medical_tenebrous.sql을 먼저 적용한다. DB/파일 테스트 볼륨은 중지 상태로 보존했다.
- JobService get/cancel/retry/enqueue는 인증 소유자 서비스다. 관리자 API에는 별도 관리자/추가 인증·감사 wrapper를 구현한다. 공개 테스트 생성·retry endpoint와 관리자 우회는 없다.
- queued 취소는 즉시 canceled, running 취소는 요청 후 결과 커밋 차단. 실패 재시도는 기존 terminal을 수정하지 않고 새 row와 retry_of_id를 만든다. 동일 시도당 child 1개, 최초+재시도2회 상한.
- PROVIDER_UNKNOWN/unknown 비용은 일반 재시도 금지. 공급자 request ID·usage 확인 후 별도 reconciliation 정책이 필요하다. 운영 registry는 실제 엔진이 없어 비어 있다.
- 개발 제한은 사용자 승인 실행2/대기10/시간당 새시도60, timeout5분, lease30초/heartbeat10초, 5초 지수 backoff. 운영 한도 변경은 공급자 Phase에서 확정한다.
- /jobs/:id 및 useJob/JobStatusPanel은 ko/en·polling·오류·취소·다음 시도 표시 기반이다. 내부 input/output/provider ID/오류 원문은 public 상태 DTO에서 제외한다.
- worker maintenance는 만료 download capability 삭제·만료 upload cleanup_pending 전환만 한다. 임시·실패·ZIP 파일/참조/job/감사는 실제 삭제하지 않는다. cleanup ledger 적재량과 파일 용량을 운영 화면에서 관찰한다.
- SIGTERM 완료 경합 방지 및 handler apply deadline rollback을 유지한다. handler는 dispatch·reserveFile을 외부 IO 전에 commit하고 apply에는 DB 쓰기만 둔다.

## 2026-09-23 착수 기록

- 담당: Codex 단독 수행. 기존 구현·이전 결과·권한/큐/번역/DB 계약 및 로컬 Next 가이드를 조사했다.
- D-02 추가 인증 선택 질문을 전달했다. 현재 BLOCKED는 이 정책 결정에 한정하며 Phase 5 기술 선행 실패를 뜻하지 않는다.
- 구현 코드·DB·운영 데이터 변경 없음. 이번 변경은 상세 계획의 오래된 환경 정보 교정과 재개 조건 기록이다.
- 필수 P6-T01~05는 모두 PENDING이다. 결과/테스트 완료 보고서는 구현·실행 후 생성한다.

## 승인 후 실행 계획 (2026-09-23)

사용자가 비밀번호 재확인 후 현재 세션 15분 관리자 접근을 확정했다. READY 계획 공유 후 IN_PROGRESS로 진행한다. 실제 운영 공개는 별도 게이트다. 재확인은 계정별 15분 5회 제한을 기존 인증 제한으로 적용한다.

- additive migration: auth_sessions.admin_verified_until, localized_contents.published_source_revision 및 published_version. 기존 데이터/감사/파일은 보존한다.
- 관리자 DAL은 actor/target users를 ID순으로 잠근 뒤 세션·추가 인증을 재검사한다. 모든 변경은 사유·version·감사와 같은 transaction으로 처리한다.
- 번역은 partner/guide 표시 schema만 허용, 원문 ko 게시본은 원본 편집과 동기화한다. import는 64KiB/최대100행, preview와 동일한 예상 version/source revision으로 원자적 저장하며 같은 내용 재적재는 no-op이다.
- 조회는 private,no-store로 locale/권한 간 공유 캐시를 피하고 게시 직후 DB를 다시 읽는다. 캐시 최대60초 요구를 즉시 반영으로 충족한다.
- 가이드/모니터링은 조회와 후속 Phase 안내, 가이드 표시 번역 계약까지 구현한다. 실제 추출/탐지 실행은 Phase7/10이다.
- 운영 콘텐츠 seed/공개는 수행하지 않는다. 합성 fixture로 CRUD·게시를 검증하고 기존 운영 검수 게이트를 유지한다.

## 구현 중 변경·검증 기록 (2026-09-23)

- 예상 이미지 관리 범위에 따라 기존 PNG/JPEG/WebP 검증·private 저장·IO 전 ledger 방식을 partner에도 적용했다. `0005` migration으로 storage target check에 partner를 추가했다. 신규 테이블·외부 저장소·유료 서비스는 없다.
- 원문 schema에 선택 marketDescription/imageAlt, 번역 schema에 선택 ipNames/marketDescription/imageAlt를 추가했다. 기존 레코드는 호환되며 원본의 연락처·태그·숫자·조건은 번역으로 변경하지 않는다. 선택 필드 생략 import는 기존 값을 보존한다.
- 페이지는 `app/admin/[[...path]]`, API는 기존 access route와 `app/api/admin/[...path]` 공통 handler를 사용한다. 기존 UI 컴포넌트에 textarea만 보완했다. 사용자 파트너 화면에 실제 공개 카탈로그를 추가하고 Phase 9 추천 시연과 구분했다.
- 이미지 다운로드는 private,no-store로 매 요청 공개/권한 상태를 재검사한다. 공유 캐시를 두지 않았으므로 별도 캐시 무효화 job은 불필요하다.
- 1차 관리자 통합 12 PASS/1 FAIL: 집계 SQL 예약어 별칭을 수정했다. 로컬 파일 접근 지연 때문에 전체 검사 환경을 동일 Node/pnpm의 Docker로 옮겼다.
- 1차 브라우저 1 PASS/3 FAIL: 공통 UI loader가 admin namespace를 제외한 문제를 수정하고 언어팩 회귀 테스트를 추가했다.
- 2차 전체 브라우저 29 PASS/2 FAIL: Next route announcer를 오류로 센 테스트 selector를 main으로 한정하고, select의 명시적 접근성 이름을 보완했다. 최종 재검증과 결과 보고는 계속 진행 중이다.
- 최종 서버 자동 검사: 15 files/111 PASS/0 FAIL/0 skip, unit28+i18n7+integration76. 관리자 통합16은 권한·동시관리 잠금·15분/다른세션/비밀번호변경·정지·번역 원자성·동시 version·64KiB·seed 보존을 포함한다.

## 최종 실행 결과

필수 5 PASS, 자동 고유142 PASS(단위28/i18n7/통합76/Chromium31), lint 0 errors/6 기존 warnings, typecheck/production build exit0. 최종 관리자 Chromium4 PASS/0 FAIL/0 skip. 상세 실행/초기 실패/수정은 [체크리스트](phase6-test-checklist.md), 완료 판정과 범위는 [결과](phase6-result.md)·[HTML](phase6-result.html)을 따른다. 과거 BLOCKED/PENDING 문구는 착수 당시 이력이며 추가 인증 결정과 개발 완료로 해소되었다.
