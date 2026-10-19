# 어드민 전체 간소화 계획 — 독립 리뷰 2차(최종 재검토)

- 대상: 수정된 `md/feat_plan/admin-simplification-plan.md`(433행), `admin-simplification-review-fixes.md`
- 이전 리뷰: `admin-simplification-review-round-1.md`(변경하지 않음)
- 기준 코드: `/mnt/f/claps-product` 현재 미커밋 상태
- 작성일: 2026-10-09 (KST)
- 리뷰 방식: 수정 계획·fixes 정독 + 원본 소스 정적 대조. **테스트·서버·DB·seed·migration은 실행하지 않았다.** 계획 단계이므로 실행 증거는 요구하지 않았고, 향후 수용 기준이 판정 가능한지만 보았다.

## 1. 판정

**계획 승인.** 1차의 P0 2건, P1 9건, P2 6건과 UI 보완 4건이 모두 계획상 닫힌 결정과 관측 가능한 수용 기준으로 반영되었다. 남은 차단 항목은 없다. 비차단 메모 6건은 구현 착수 때 함께 처리하면 된다(4절).

승인의 의미는 "이 계획대로 구현을 시작해도 된다"이다. 구현·DB 변경·배포 승인이나 `admin/admin1234` 로그인이 현재 동작한다는 확인이 아니다.

판정 기준으로 코디네이터가 전달한 우선순위를 따랐다. 최초 `admin/admin1234` 로그인과 최대 간소화가 우선이며, 강제 비밀번호 교체·닫을 수 없는 경고 배너·위험 수용 승인 절차는 요구하지 않는다. 1차 R1-01에서 제안했던 "닫을 수 없는 변경 권고 배너"는 planner가 미채택했고, 이 기준에 따라 그 미채택을 수용한다.

## 2. 1차 미검증분 보완: admin UI 전체 직접 읽기

1차에서 읽지 못했다고 적은 파일을 이번에 전부 읽었다.

| 파일 | 읽은 범위 | 계획 필드 표와 대조한 결과 |
|---|---|---|
| `components/admin/list-page.tsx` | 1~399 전체 | 목록 7종의 열(10~18행), 검색·새로고침·초기화, 보관/상태/종류/대상/기간/pageSize/sort/order 필터, 감사 JSON 펼침(357~359행)이 계획 3.1에 모두 있다 |
| `components/admin/shared.tsx` | 1~326 전체 | `Field`의 사유·쉼표 힌트, `ConfirmAction`의 사유 선행 검사(142~149행), `RecordView` 기본 27개 필드와 고급 8개 기술 필드(289~298행)가 3.2·3.4에 모두 분류되어 있다 |
| `components/admin/console.tsx` | 1~507 전체 | 헤더, 재확인 모달, requestId·field key 노출, 홈 5개 수치와 30일 표, 파트너 등록 버튼이 3.1에 있다 |
| `components/admin/detail-page.tsx` | 1~786 전체 | 프로젝트/파트너 편집 폼, 작업 재시도·중단, 스캔, 자료·가이드 탭, 이미지 즉시 업로드(628~646행), 사용자 정지·복구·세션 회수, 보관/복원이 3.2·3.3에 있다 |
| `components/admin/translation-editor.tsx` | 1~485 전체 | 언어 선택, 원문·초안·게시본, 저장/게시/게시 중단/내보내기, JSON 파일·textarea·미리보기가 3.3에 있다 |
| `components/admin/locale-editor.tsx` | 1~248 전체 | 목록 공통 사유, 코드·이름·fallback·방향·순서·사용 여부 입력이 3.3에 있다 |
| `components/domain/monitoring-workspace.tsx` | `ResultDetail`·`ScanHistory`(48~71행) | provider·engineVersion, job.id 링크 텍스트, 출처 원문, feedbackPath 분기가 3.2·5절에 있다 |

**결론: 계획 표에서 빠진 화면·입력·핵심 운영 동작을 찾지 못했다.** 이 읽기에서 나온 비차단 보완 4건은 대기 중 코디네이터에 먼저 전달했고, planner가 UI-01~04로 반영했다(3절 하단 표).

## 3. ID별 해소표

| ID | 1차 지적 | 판정 | 수정 계획의 결정 (절) | 소스 대조 근거 |
|---|---|---|---|---|
| R1-01 P0 | `admin` 식별자로 로그인 잠금, 초기 비밀번호 보완 | **해소** | 식별자 단독 차단 제거. `(identity, 클라이언트 서명 쿠키)` 쌍의 실패만 10회/15분 집계, 성공은 미집계. 신뢰 IP 미설정 시 `unknown` 공유 버킷 미사용. 별칭 행에 초기 발급 표식(2.1 제한표, T02) | 현행 결함 위치 `lib/server/auth/service.ts:27-33`, `lib/server/auth/http.ts:28-29,40`을 새 action이 호출하지 않는다고 명시. 일반 sign-in 버킷은 그대로라 일반 사용자 회귀 없음 |
| R1-02 P0 | 분실 복구 미폐쇄 | **해소** | `pnpm admin:recover-password --email --password-stdin`을 P1에 포함. 한 트랜잭션에서 hash 교체·전 세션/토큰 회수·system 감사. 메일은 보조 경로(2.3 하위절, 7.1, T04) | `sandboxMail` 고정(`service.ts:208-212`), `MAIL_ADAPTER=disabled`(`deploy/remote/compose.yaml:8`) 사실을 계획이 정확히 기술. bootstrap no-reset과 충돌하지 않도록 자동 호출 금지 명시 |
| R1-03 P1 | bootstrap 실행 위치·선행 조건 | **해소** | `migrate → db:seed → i18n:activate → 서버 → UI → tools bootstrap`. compose에 one-shot `admin-tools` 프로필, 비밀번호는 지속 env에 두지 않음(7.1, T01) | `Dockerfile:25-34` tools 단계에 scripts 존재, web 단계에 없음 확인. T01이 파트너 최초 저장까지 포함해 FK 선행(`localized-contents/service.ts:84-88`)을 검증 |
| R1-04 P1 | 로그인 직후 이중 비밀번호 | **해소** | admin-sign-in이 같은 트랜잭션에서 `admin_verified_until=+15분` 발급과 감사 기록. 일반 `/login`은 불변(2.1, 2.3, T02) | `access.ts:40-44`의 15분 검사 자체는 유지. 창 연장·우회 없음 명시 |
| R1-05 P1 | 일반 회원 세션의 `/admin` 404 | **해소** | 4개 상태 × 3개 진입점 표. 성공 시 현재 쿠키의 세션 행만 교체, 실패 시 유지(2.1 상태표, T05) | 현행 `app/admin/[[...path]]/page.tsx:17`의 `notFound()`를 redirect로 바꾸는 범위가 P1 파일표에 있음 |
| R1-06 P1 | 가이드 번역 소비처 없음 | **해소** | (b)안 채택: 가이드 번역 운영 UI 제거, API·데이터·ruleId 검증 보존. 혼합 파일은 적용 전 거절(3.5, T09) | 소비처가 파트너뿐임(`lib/server/partners/service.ts:14`)과 일치. T09에서 검증 불가능한 "공개 효과" 문구 삭제 확인 |
| R1-07 P1 | 검색·상태 탭의 서버 의미 | **해소** | 목록 7종+언어의 검색 대상·탭→파라미터 매핑표. additive `statuses`, `retryable`, `includeReads`. 감사 범위 필터는 상세의 변경 기록 탭으로 한정(3.1 매핑표, P3, T07) | 현행 단일 일치(`service.ts:98-115`)와 호환되는 additive 설계. 사용자 5상태(`list-page.tsx:178-184`) 모두 매핑 |
| R1-08 P1 | 조회 로그 노이즈, 자동 사유 저장 형식 | **해소** | 기본 목록에서 `*.read`·`admin.reauthenticate` 제외. reason은 구 reason → 메모 원문 → 중립 표식 `@admin:auto:v1`, 화면 문구는 action에서 현재 언어로 생성(3.1, 3.4, T11·T12) | DB NOT NULL 유지(`db/schema.ts:114`). 현행 영어 고정 사유 5종을 정확 일치로만 치환한다고 명시 |
| R1-09 P1 | 이탈 보호 수단·한계 | **해소** | 유형별 수단·보장 표. 기존 가드 공용화, 뒤로가기는 "확인 시도, 보존 보장 없음"으로 약속 하향(4.2, T15) | 기존 가드 `detail-page.tsx:103-123` 확장으로 실현 가능. T15에서 "항상 보존" 통과 조건 제거 확인 |
| R1-10 P1 | 비밀번호 변경 후 복귀 계약 | **해소** | 서버가 역할로 `nextStep` 결정(admin→`/admin/login`, member→`/login`). change/reset은 클라이언트 `next` 미사용. 페이지 파일을 P1 범위에 추가(2.3, T04·T05) | `service.ts:114,173`의 고정 `/login` 반환을 역할 분기로 바꾸는 범위 명시. open redirect 면이 생기지 않음 |
| R1-11 P2 | 스캔 outputLocale 고정·판정 규칙 | **해소** | key·outputLocale·version을 한 묶음 snapshot. key로 조회하는 GET 추가, 추측 판정 금지(5절, T10) | 현행 `IDEMPOTENCY_CONFLICT` 조건(`monitoring/service.ts:76-77`)과 일치 |
| R1-12 P1 | 포괄 재시도 약속 | **해소** | mutation 6분류표. 자동 재전송 없음, 409는 먼저 조회. 파트너 신규는 `creationKey`+영수증 테이블로 중복 방지. 세션 회수·이미지 추가는 "불명 유지"(4.1, P4, T08·T15) | 1차의 재전송 동작 표와 분류가 일치. 영수증은 선택 필드라 구 클라이언트 호환 |
| R1-13 P2 | 실패 수 정의 | **해소** | "다시 실행할 수 있는 실패"로 정의, 홈 수와 링크 목록이 같은 predicate(3.1, T12) | `jobs/service.ts:22`의 `canRetry` 조건과 동일하게 기술 |
| R1-14 P2 | stale 게시본, 빈 alt | **해소** | 원문 변경 후 기존 게시본 유지를 현행 정책으로 명문화. alt는 저장하지 않고 조회 시 nonblank fallback(3.5, T08·T09) | `partners/service.ts:15`의 `??`가 빈 문자열을 통과시키는 문제를 조회 단계에서 해결 |
| R1-15 P2 | 재번호 과설계, bind 식별자 | **해소** | max+10, 상한 초과 거절. `--bind-existing <email>`(2.2, T03·T13) | `scripts/account.ts`의 이메일 인자와 통일 |
| R1-16 P2 | 스키마 검사·fixture 범위 | **해소** | 테이블 20→22, `created_at` 17→19, 과거 prefix 스크립트는 전제 보존(5절 하위, P6, T18) | `db/schema.ts`의 `pgTable` 20개, `tests/integration/database.test.ts:36`의 17을 직접 확인 — 계획 수치와 일치 |
| R1-17 P2 | 판정 불가 수용 기준 | **해소** | T06 금지 패턴·대상 route 명시, T16 검사 수단(Playwright role/label + 실제 리더 1흐름), T02 수치 재작성(6절) | 금지 패턴이 현행 노출 필드(`shared.tsx:289-298`)를 포괄 |

| ID | 대기 중 전달한 UI 보완 | 판정 | 반영 위치 |
|---|---|---|---|
| UI-01 | 번역 언어 선택이 비활성 언어까지 나열(`translation-editor.tsx:165-169`) | **해소** | 3.3: 배포된 언어만, 비활성은 "사용 중 아님" 표기, 공개는 사용 중 언어만. T09 |
| UI-02 | 사용자 상태 5종 중 3종의 위치 | **해소** | 3.1 매핑표: 고급 단일 선택. T07 |
| UI-03 | 기존 가드가 번역·언어 모달에 미적용 | **해소** | 4.2: 공용화 후 적용. T15 |
| UI-04 | `ScanHistory`가 일반 사용자 화면과 공용 | **해소** | 5절: admin 분기만 변경, 일반 사용자 표시·신고 동작 불변. T10·T17 |

## 4. 비차단 메모 (구현 착수 시 처리, 재검토 불필요)

| ID | 내용 | 근거 | 권고 |
|---|---|---|---|
| R2-01 | 프로젝트 상태 이름 오기: 계획 3.1 매핑표에 `needs_fix`로 적혀 있으나 실제 값은 `needs_revision` | `db/schema.ts:51` / 계획 169행 | 문구 정정. 번역 키 작성 시 실제 enum 기준 |
| R2-02 | `ADMIN_AUTH_CLIENT_SECRET` 미설정 시 동작이 없다. 값이 없으면 관리자 로그인 자체가 막힐 수 있다 | 계획 2.1 제한표, 7.1 | 미설정 시 서버 기동 실패로 할지 로그인 503으로 할지 한 문장 추가. 환경 변수 정의·검증 파일을 P1 범위에 명시 |
| R2-03 | 신뢰 IP가 없는 배포에서는 쿠키를 지우면 실패 한도가 초기화되어 비밀번호 대입 억제가 사실상 없다 | 계획 2.1 "신뢰 IP 미설정" 행이 스스로 밝힘 | 계획이 한계로 명시했고 판정 기준상 추가 통제를 요구하지 않는다. 운영 문서에 프록시 헤더 설정 권고가 실제로 들어가는지만 P1 리뷰에서 확인 |
| R2-04 | 파트너 생성 영수증 테이블은 중복 1건 방지를 위한 것으로 범위가 크다 | 계획 4.1, P4 | 닫힌 결정이라 수용. 구현 중 더 단순한 동등 수단이 확인되면 계획 수정 후 교체 가능 |
| R2-05 | 감사 `q`가 관리자 이름과 여러 종류 대상의 표시명을 함께 찾는다. 대상 종류가 7가지라 join이 복잡하고 느릴 수 있다 | `lib/server/admin/service.ts:63-68` / 계획 3.1 매핑표 | T07 integration에 감사 검색의 결과 수 일치와 응답 시간 관찰을 포함. 과하면 관리자 이름 검색만 남기는 축소 허용 |
| R2-06 | 정적 `app/admin/login`이 optional catch-all보다 우선한다는 전제 | 설치 문서 `dynamic-routes.md`에서 명시 문장을 찾지 못함 | T01에 빌드·실 HTTP 확인이 이미 들어 있다. P1 첫 작업으로 확인 |

## 5. 구현 준비도 점검 (코디네이터 지정 항목)

| 항목 | 결과 | 위치 |
|---|---|---|
| 정상 인증·권한 (하드코딩·로컬 전용 없음) | 준비됨 | 2.1, 2.2 |
| rate limit / 복구 명령 / 초기화 | 준비됨 | 2.1 제한표, 2.3 하위절, 2.2 충돌표 |
| 이중 입력 제거 | 준비됨 | 2.1, 2.3 |
| 비관리자 세션 진입 | 준비됨 | 2.1 상태표 |
| 최소 필드 (파트너 이름 1개) | 준비됨 | 3.3, T08 |
| 사유 서버 처리 | 준비됨 | 3.4, T11 |
| 검색/필터의 서버 지원 | 준비됨 | 3.1 매핑표, P3 |
| 기술 정보 제거 | 준비됨 | 3.1~3.3, T06 금지 패턴 |
| 가이드 번역 (미제공 선택) | 준비됨 | 3.5 |
| dirty 가드 한계 | 준비됨 | 4.2 |
| mutation별 결과 불명 | 준비됨 | 4.1 |
| 스캔 snapshot | 준비됨 | 5절 scan |
| alt / sourceRevision | 준비됨 | 3.5 |
| deploy tools / seed / activation | 준비됨 | 7.1 |
| 테스트 판정 수단 | 준비됨 | 6절 T01~T18 |

## 6. 검증 한계

- 정적 읽기만 했다. 로그인, bootstrap, 복구 명령, migration, e2e, 빌드 어느 것도 실행하지 않았다. 계획의 T01~T18은 모두 향후 기준이다.
- 수정 계획은 2절, 3.1, 3.4~3.5, 4절, 5~8절을 전문 정독했다. 3.2·3.3의 필드 표(181~263행)는 변경 관련 행을 검색으로 확인했고(가이드 번역, imageAlt, 콘텐츠 언어, sortOrder), 나머지 행은 1차에서 읽은 내용에서 바뀌지 않았다고 보고 재정독하지 않았다.
- 계획이 인용한 수치 중 직접 확인한 것은 테이블 20개, `created_at` 17개, `needs_revision` enum, tools 이미지 구성이다. `scripts/phase12-migration-check.ts`·`phase16-migration-check.ts`·`backup-restore.py`의 내부 전제는 읽지 않았다.
- 새 설계(서명 쿠키 제한, 영수증 테이블, 스캔 조회 API)는 아직 코드가 없으므로 "문서상 모순이 없고 현행 코드와 충돌하지 않는다"까지만 판단했다. 실제 동작은 구현 후 T02·T08·T10에서 확인해야 한다.
- 외부 메일·provider·storage·실제 배포 환경은 조회하지 않았다.
