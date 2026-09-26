# Phase 2 상세 개발 플랜 — ko/en 파일 언어팩·공통 언어 선택

## 1. 기본 정보

| 항목 | 내용 |
| --- | --- |
| Phase | 2 |
| 상태 | `EXECUTED` — 구현·필수 검증 완료; 최종 판정은 결과 보고서 |
| 작성일 | 2026-09-22 |
| 예상 기간 | 4~6 작업일; 1명 순차 수행 기준 초기 추정, 외부 결정·계정 준비 대기 제외. 착수 조사 후 재산정 |
| 담당 | 프론트엔드·백엔드·번역 검수 (실제 담당자 배정은 착수 시 기록) |
| 요구사항 추적 | I18N-01, UI-02, 기존 전체 화면 고정 문구 |
| 전체 검증 연결 | T-18·T-23·T-24 비회원/기존 UI; T-19·T-21·T-22 기반 |

문서 작성은 구현 시작이나 Phase 완료를 의미하지 않는다. 선행 결과와 이 Phase의 필수 결정을 확인한 뒤 `READY`로 변경하고 계획을 공유한다. 이후 `IN_PROGRESS → EXECUTED`로 진행하며, `COMPLETED`는 완료 게이트를 충족한 결과 보고서의 판정이다. 미결정 사항으로 구현을 시작할 수 없으면 원인과 재개 조건을 적고 `BLOCKED`로 변경한다.

## 2. 배경과 목표

기존 한국어 UI와 랜딩을 ko/en 파일로 분리하고 언어를 바꿔도 현재 화면·입력을 유지한다.

## 3. 입력 자료와 이전 Phase 인수인계

- [전체 개발 플랜](development-plan.md): 제품 범위·DB/API 계약·최종 완료 기준의 기준 문서.
- [Phase 진행 규칙](phase-development-process-rules.md): 시작·테스트·보고·완료 게이트.
- [기존 연동 가이드](../HANDOFF.md), [저장소 설명](../README.md), [AGENTS.md](../AGENTS.md).
- [Phase 1 계획](phase1-plan.md)과 [체크리스트](phase1-test-checklist.md), [결과 MD](phase1-result.md), [결과 HTML](phase1-result.html)을 순서대로 읽는다. 이전 결과가 `COMPLETED`이고 필수 검증이 모두 `PASS`인지 확인한다. Phase 1 결과는 COMPLETED, 필수 4 PASS다. Phase 2 착수 시 작업 트리·기반 검증과 D-10 콘텐츠/검수 게이트를 재확인한다.
- 필요한 인수인계: Phase 1의 언어 schema·비활성 seed·공통 API·테스트·Docker.

후속 Phase를 미리 계획하는 것은 허용하되 구현은 번호 순서대로 진행한다. 이전 Phase의 실패·차단·이월 항목이 이 단계의 완료 기준에 영향을 주면 먼저 해결하거나 범위/계약 변경을 기록한다.

## 4. 현재 상태 조사

착수 전 UI: 앱/인증의 언어 버튼은 무동작이고 랜딩에는 선택기가 없었다. 고정 문구·상태/직무/스타일 표시명이 코드에 있었다. 실제 조사·완료 결과는 16절과 결과 보고서를 참조한다.

공통 조사 기준은 `feature/backend`의 현재 작업 트리다. 이번 문서 분할 시 `md/`는 기존 미추적 사용자 파일이었으며 원본 규칙을 보존한다. `package.json`에는 `dev/build/start/lint`만 있고 DB·인증·테스트 의존성은 없다. `node_modules/next/dist/docs/`는 현재 확인되지 않았다. 구현 착수 시 설치된 Next.js 버전의 로컬 가이드를 확보·확인한 뒤 코드를 작성한다. 이 문서는 미래 Phase의 코드가 이미 존재한다고 가정하지 않는다. 착수 시 실제 파일, 의존성, 작업 트리 및 이전 결과와 차이를 다시 기록한다.

## 5. 구현 범위

10개 namespace ko/en 파일, registry·로더·fallback·고정 code 분리, cookie·SSR locale, 공통 LanguageSwitcher, 모든 기존 화면 연결, key/변수 검증, 업무 콘텐츠 공개 fallback 함수를 구현한다.

이 단계에서 추가·변경하는 사용자/관리자 문구는 ko/en 파일 언어팩에 함께 반영한다. 업무 데이터 번역은 `localized_contents`만 사용하고, 고정 UI·랜딩·메일 문구는 DB로 옮기지 않는다.

## 6. 제외 범위

회원 선호 저장은 Phase 3, 어드민 헤더/DB 콘텐츠 편집은 Phase 6. 목업 파트너 업무 데이터를 UI 언어팩에 넣지 않는다.

결제·구독, 조직 협업, 범용 CMS, 자동 침해 신고는 전체 초기 범위에서 제외한다. 새로운 비용·제품 정책·공개 계약이 필요하면 구현 전에 전체 플랜과 이 문서의 변경 이력을 갱신한다.

## 7. 결정·가정·질문

기본 ko, en fallback ko, URL 구조 유지. common/navigation/landing/auth/projects/partners/assets/monitoring/admin/email 파일 구조를 사용한다. 아직 없는 관리 기능 문구는 해당 Phase에서 추가한다. 파일팩 준비 후 ko/en 활성화, 선택기에는 활성 DB와 배포 파일의 교집합만 노출한다.

권장안과 확정 사항을 구분한다. 이 문서 작성에는 추가 승인이 필요하지 않으며, 미결정 항목은 해당 구현의 시작 게이트에서 해결한다. 실제 과금·메일 발송·외부 데이터 변경 검증은 진행 규칙 8.6에 따라 승인된 대상과 환경에서만 수행한다.

## 8. 작업 분해와 실행 순서

위에서 아래 순서로 진행한다. 각 작업의 선행 산출물을 확인하고 담당 영역이 산출물·검증 증거를 남긴다.

| 작업 ID | 작업 | 산출물 | 의존성 | 담당 영역 | 검증 |
| --- | --- | --- | --- | --- | --- |
| P2-01 | 고정 문구·metadata·접근성·문자 포함 이미지 조사/추출 | 문구 목록·ko/en 파일·고정 code | Phase 1 완료 | 프론트/번역 | P2-T01 |
| P2-02 | registry·loader·fallback·cookie·SSR 구현 | locale API·lang/dir | P2-01 | 백엔드/프론트 | P2-T02 |
| P2-03 | 선택기와 기존 화면 연결 | PC/모바일 전환·폼 유지 | P2-02 | 프론트 | P2-T03 |
| P2-04 | 업무 게시본 fallback·Docker 파일팩 검증 | 실제 제공 locale·동일 파일팩 | P2-03 | 백엔드/검증 | P2-T04 |

## 9. 예상 파일/API/DB/화면 영향

다음은 예상 경로다. 아직 없는 경로는 생성 예정이며 도구 선택으로 경로가 달라지면 구현 전에 기록한다.

- 생성: `messages/ko/*.json`, `messages/en/*.json`, `lib/i18n/`, `components/layout/language-switcher.tsx`.
- 생성: `app/api/locales/route.ts`, `app/api/locale/route.ts`, 번역 검증 스크립트/테스트.
- 변경: `app/`, `components/domain/`, `components/layout/`, `lib/nav.ts`, `lib/workspace-nav.ts`, 상태/직무/스타일 표시부.

| 영역 | 영향 |
| --- | --- |
| DB migration | schema 변경 없이 fallback 순환/등록 언어 검증·게시본 조회. |
| seed | 파일 준비 후 ko/en 활성화; 재실행으로 운영 설정 덮어쓰기 금지. |
| API 계약 | GET /api/locales, POST /api/locale; 회원 API는 Phase 3. |
| 화면 | 랜딩 시작하기 왼쪽·앱/인증 우측 상단·PC/모바일·키보드/터치. |
| 인프라 | web/worker에 messages 포함·SSR/클라이언트 locale 일치. |
| 삭제 | 기본적으로 삭제 파일 없음. 기존 store/mock은 호출자 전환과 참조 검색이 끝난 뒤 해당 Phase 소유 범위에서만 제거한다. |

## 10. 테스트 계획

기본 검사: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`. Phase 1에서 인수한 실행 명령은 `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm test:i18n`, `pnpm db:migrate`, `pnpm db:seed`다. 실제 실행에서는 corepack pnpm 10.34.5와 Docker target을 사용했다. 명령·종료 코드·검사 수는 phase2-test-checklist.md에 기록했다. 테스트가 0개이거나 필수 suite가 skip이면 통과로 처리하지 않는다.

누락 key·변수 불일치·en-US·미등록 언어·게시/초안 fixture. 실제 관리자 게시 흐름은 Phase 6.

아래는 **실행 전 검증 설계**다. 구현이 끝나면 `phase2-test-checklist.md`에 환경·명령/절차·실제 결과·종료 코드·suite/test 성공/실패/skip 수·실패 원인·수정·재검증을 기록한다. 해당 Phase에 적용하지 않는 테스트 범주는 삭제하지 말고 `NOT_APPLICABLE` 사유와 이후 검증 Phase를 기록한다.

| ID | 필수 여부 | 분류 | 명령 또는 실행 절차 | 기대 결과 | 현재 상태 |
| --- | --- | --- | --- | --- | --- |
| P2-T01 | 필수 | 단위/정적 | pnpm test:i18n 및 문구/이미지 목록 대조 | 필수 key/변수 누락 0건·사용자 원문 언어팩 혼입 0건 | PASS |
| P2-T02 | 필수 | 통합 | cookie/브라우저/미등록 locale·순환 fallback·SSR 렌더 | 우선순위 정상·raw key/undefined 노출 0건 | PASS |
| P2-T03 | 필수 | E2E/수동 | 랜딩/앱/인증 전환·새로고침·입력/필터 유지·키보드 조작 | 선호 유지·URL/입력 보존·hydration 오류/신규 job 호출 0건 | PASS |
| P2-T04 | 필수 | DB/Docker | 게시/초안 조회·컨테이너 재빌드/재시작 | 초안 미노출·제공 locale 명시·파일팩 일치·UI 문구 DB 조회 없음 | PASS |

기본 코드 검사는 코드가 변경되는 Phase마다 필수다. 표의 필수 검증 중 하나라도 `FAIL/BLOCKED/PENDING`이면 완료할 수 없다. test adapter/sandbox 통과와 실제 공급자 품질 검증을 구분한다.

## 11. 완료 조건

- [x] 기존 필수 고정 문구·랜딩이 ko/en 파일에 연결되었다.
- [x] 기존 3개 화면 계열의 선택기가 PC/모바일에서 동작한다.
- [x] 회원/관리자 연결 잔여 범위가 후속 단계에 기록되었다.
- [x] 작업별 필수 검증이 모두 `PASS`이고 미실행을 성공으로 기록하지 않았다.
- [x] 상세 계획 대비 차이, 변경 파일, 실제 명령·결과 및 이월 항목을 기록했다.
- [x] `phase2-test-checklist.md`, `phase2-result.md`, `phase2-result.html`을 실제 실행 후 작성했다.
- [x] MD/HTML 상태·수치·미완료·인수인계가 일치하고 문서 링크/HTML 구조가 검증되었다.
- [x] 다음 Phase를 막는 미해결 항목이 없다.

## 12. 위험과 대응

문맥·영어 긴 문구·aria-label·이미지 속 문자는 수동 검토한다. 표시 문자열을 code로 바꿀 때 기존 업무 분기도 검사한다.

## 13. rollback/복구

이전 이미지/파일팩 함께 복원·미지원 언어 교집합 제외·기본 fallback. 사용자 원문/DB 번역 보존.

사용자 변경을 포함한 작업 트리를 통째로 초기화하지 않는다. 적용한 migration과 코드 버전의 호환성을 확인하며, 데이터가 존재하는 환경의 파괴적 되돌리기는 백업/복구 검증 없이 실행하지 않는다.

## 14. 결과 증거와 다음 Phase 인수인계

결과 증거: 문구 목록·key/변수 검사·화면별 전환/입력 유지·SSR·Docker 증거.

다음 단계: [Phase 3](phase3-plan.md)에 locale/cookie·auth/email 파일·회원 선호 연결 지점을 전달한다.

구현·검증 후 생성할 파일은 `phase2-test-checklist.md`, `phase2-result.md`, `phase2-result.html`이다. 현재 미생성 파일은 완료 증거로 링크하지 않는다. HTML은 외부 CDN/런타임 JavaScript 없이 단일 파일·반응형·인쇄 CSS로 작성한다. 로그·화면 증거에서 secret, 세션 쿠키, 개인정보, 비공개 원문을 제거한다. MD를 원본으로 삼고 두 보고서에 같은 완료 판정과 수치를 기록한다.

## 15. 변경 이력

| 날짜 | 변경 | 근거/상태 |
| --- | --- | --- |
| 2026-09-22 | 전체 개발 플랜을 Phase별 상세 계획으로 분할 | 사용자 요청·Phase 진행 규칙 반영; `DRAFT`, 구현/테스트 미착수 |

| 2026-09-23 | Phase 1 인수인계: 비활성 ko/en seed·errors namespace·strict metadata/API·실행 명령·격리 테스트 DB·Docker 제공. 자동 28 PASS, 기존 UI lint 경고 20건은 후속 정리. Phase 2 구현은 미착수 | 선행 기반 완료; 결과 링크 갱신 |

## 16. 2026-09-23 착수 조사·실행 계획

- Phase 1 MD/HTML COMPLETED 및 필수 4 PASS, 28개 자동 테스트 인수 확인. 기존 미커밋 변경은 보존한다. 담당은 Codex 단독 수행.
- 실제 package.json에 DB/테스트 명령이 존재한다. Node 22.22.0 및 corepack pnpm 10.34.5 사용. Next 16.3.3 로컬 internationalization, server/client components, cookies 가이드 확인.
- 현재 UI AST 조사: 한국어 리터럴/JSX/템플릿 561개 출현(중복·업무 fixture·로직 code 포함). 추출 목록은 구현 후 별도 문구 목록에 기록한다.
- 순서: 문구·고정 code 정리 → 파일 registry/서버 locale/게시 fallback → 공통 선택기와 전체 화면 연결 → 자동·브라우저·Docker 검증 및 보고. errors namespace는 Phase 1에서 유지하며 admin/email은 후속 구현 전 빈 파일로 계약만 준비한다.
- 파일 registry는 배포 디렉터리에서 탐색하고 필요한 namespace를 로드한다. 활성화는 명시적 일회성 명령으로 수행하며 seed 재실행은 기존 운영 설정을 보존한다.
- D-10 검수자 미확정은 공개 배포 전 게이트다. 로컬 구현·합성 fixture·테스트 이미지 검증을 진행하고 운영 공개/배포는 별도 인수인계한다. 회원 선호는 Phase 3, 실제 콘텐츠 게시/관리자는 Phase 6.
- 기본 검사: corepack pnpm lint / typecheck / build / test:unit / test:i18n / test:integration / test:e2e. 격리된 Phase 2 합성 DB와 로컬 컨테이너만 사용한다.

### 구현 중 확인 및 보완

- 한국어가 들어간 랜딩 스크린샷 2개는 파일별 조사 후 언어팩 기반 HTML ProductPreview로 대체했다. 실제 포장/브랜드 사진의 원문은 보존한다.
- 열린 새 프로젝트 모달에도 동일 LanguageSwitcher를 제공해 입력 중 전환을 검증한다. 모바일 앱 메뉴를 접고 헤더의 선택기는 유지한다.
- 시각 검토에서 파트너 목업의 고정 factor/매칭 기준 label이 업무 값과 결합된 것을 발견했다. label을 code로 분리하고 원래 업체명·세계관·설명·추천값은 그대로 보존했다.
- 파일 로더는 namespace 선택을 지원한다. 공통 클라이언트 shell에는 기존 화면 전환에 필요한 8개 UI namespace만 전달하고, admin/email/errors는 서버 서비스에서 별도로 읽는다.
- 공개 origin은 APP_ORIGIN으로 설정한다. DB seed와 초기 파일팩 활성화를 분리하며, i18n:activate는 version=1 기본 seed만 갱신한다. 이 bootstrap은 관리자 편집/감사 기능을 대신하지 않는다.

| 2026-09-23 | Phase 2 구현/검증 완료: 자동 52 PASS, Docker 4 PASS, 필수 4 PASS. 실제 실행과 차이는 체크리스트/결과 보고서에 기록 | EXECUTED; 공개 배포 전 D-10 유지 |
