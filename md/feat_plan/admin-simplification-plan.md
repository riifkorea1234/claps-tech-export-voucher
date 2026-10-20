# 어드민 전체 간소화 개발 계획

문서 상태: 구현 전 계획 / **reviewer 2차 승인, 비차단 보완 반영본**. 승인 근거: [독립 리뷰 2차](admin-simplification-review-round-2.md), 4절 R2-01~06 반영(재검토 불필요). 작성 기준일: 2026-10-09(KST).

## 1. 목표, 범위, 검증 수준

운영자는 아이디 `admin`, 최초 비밀번호 `admin1234`로 실제 서버에 로그인하고, 개발 지식 없이 사용자를 찾고, 프로젝트를 확인하고, 파트너를 등록·공개하고, 번역을 게시하고, 실패 작업과 모니터링을 처리할 수 있어야 한다. 이 로그인은 로컬 데모 전용이 아니다. 실제 배포 환경에서도 정상 서버 계정과 자격 증명으로 제공하며, 기존 이메일 로그인·접근 제어·감사·국제화는 보존한다.

이번 산출물은 **개발 계획만**이다. 원본 `/mnt/f/claps-product`의 현재 미커밋 코드까지 직접 읽었다. 하위 worktree의 제품 코드는 기준으로 삼지 않았다. 이번 수정은 이 계획과 새 `admin-simplification-review-fixes.md` 및 planner 사본만 변경한다. 제품 코드, DB, seed, 다른 기존 문서, reviewer 문서, 커밋, 배포는 변경하지 않는다. 아래의 ‘구현한다’, ‘통과해야 한다’는 미래 작업·수용 기준이며 완료 주장이나 실행된 테스트가 아니다. 실제 DB 계정·해시·실데이터·외부 제공자·실행 중 서비스는 조회하거나 검증하지 않았으므로 현재 `admin/admin1234`가 된다고 단정하지 않는다.

원본 `AGENTS.md`와 설치된 Next 16.3.3 문서 `node_modules/next/dist/docs/01-app/02-guides/authentication.md`, `01-app/01-getting-started/15-route-handlers.md`, `01-app/03-api-reference/04-functions/cookies.md`를 확인했다. 인증과 권한을 서버에서 별도로 확인하고, App Router의 비동기 `params`/`cookies()` 사용 및 Route Handler의 요청 시 처리를 유지한다. 인증 응답·사용자별 admin 데이터에 정적/공용 캐시를 도입하지 않는다. 이번 수정에서는 같은 설치 문서와 `01-app/03-api-reference/02-components/link.md`의 `onNavigate`를 다시 읽었다. 개발 시작 시 설치 버전의 관련 문서를 다시 확인한다. 정적 `/admin/login`과 optional catch-all 우선순위는 구현 빌드와 route e2e로 확인한다. 과거 `md/admin-beginner-review.md`, `admin-crud-review.md`, `admin-beginner-fixes.md`는 참고 이력이며 이번 범위를 제한하거나 검증 완료 근거로 쓰지 않는다.

### 요구 추적

| ID | 이번에 반드시 구현할 요구 | 근거/현재 차이 | 구현 단계 / 수용 기준 |
|---|---|---|---|
| A01 | admin/admin1234 정상 서버 로그인과 최초 계정 생성 | S01~S04, 현재 이메일만 허용, 별칭/초기화 없음 | P1 / T01~T04 |
| A02 | 이메일 로그인, 재확인, 세션·로그아웃·비밀번호 운영 변경 보존 | S02~S04, 7일 세션과 15분 재확인이 별개 | P1,P2 / T02~T05 |
| U01 | 모든 목록·상세·신규 화면을 초보 운영 흐름으로 개편 | S05~S09, 공통 필드 자동 표시·필터 과잉 | P2~P4 / T06~T09 |
| U02 | 개발용 값·불필요 입력·반복 사유 제거 | S06~S12, reason min(1), JSON·UUID·코드 노출 | P2~P5 / T06,T10,T11 |
| U03 | 대시보드, 프로젝트 가이드/자료, 사용자 관련 목록 포함 | S01,S05,S08 | P3 / T07,T12 |
| U04 | 파트너 등록·이미지·공개/보관·번역 게시·언어 운영 전체 포함 | S07~S12 | P4,P5 / T08,T09,T13 |
| U05 | 작업 재시도/중단·모니터링·감사 전체 포함 | S06,S07,S11,S13 | P3,P5 / T10,T12,T14 |
| Q01 | 성공/오류/빈/권한/로딩/저장·이탈/모바일 처리 | S05~S09 일부 이미 있으나 전체 일관성 확인 필요 | 모든 단계 / T05,T15,T16 |
| C01 | route/back/i18n/서버 권한·version·감사·내부 계약 호환 | S01~S13 | 모든 단계 / T04,T11,T17 |
| D01 | 실제 배포 준비·마이그레이션·되돌림, 실데이터 증거로 출시 판단 | 현재는 정적 조사만 완료 | P6 / T18 |

### 원본 소스 근거 인덱스

아래 경로는 모두 `/mnt/f/claps-product/` 기준이다. 행 번호는 작성 시점 스냅샷이며 원본 변경 시 재대조한다.

| 근거 | 파일:행 | 확인한 현재 동작 |
|---|---|---|
| S01 | `app/admin/[[...path]]/page.tsx:11-44` | 미로그인 `/login?next=...`, active admin만 페이지 진입, users/projects/partners/jobs/guides/monitoring/audit-logs/locales 허용, guides는 프로젝트 가이드 탭으로 이동 |
| S02 | `components/domain/auth-flow-form.tsx:19-54`, `app/login/page.tsx:9-42`, `lib/server/auth/http.ts:21-64` | 이메일 lookup→sign-in, 이메일 type/서버 emailSchema, 안전한 admin next 일부 처리, Origin·rate limit·쿠키 설정 |
| S03 | `lib/server/auth/service.ts:48-80,117-173,176-204`, `lib/server/auth/policy.ts:4-7` | better-auth hash/verify, credential 조회, verified/상태 검사, 7일 세션, 비밀번호 변경 시 모든 세션 회수, 기존 account CLI는 promote/suspend만 |
| S04 | `db/schema.ts:15-28,124-142`, `lib/server/admin/access.ts:20-58`, `scripts/account.ts:4-15` | email unique, 역할·상태 CHECK, credential·세션 테이블, active/verified/admin 잠금 후 재검사, admin_verified_until 15분, 재확인 5회/15분 |
| S05 | `components/admin/console.tsx:56-182,190-218,245-353,358-501`, `lib/server/admin/service.ts:76-89` | 자동 재확인·pending 재실행, back 검증, 기술적 requestId/field key 표시, 전체기간 실패 수를 today 박스에 표시, 30일 사용량과 cleanup |
| S06 | `components/admin/list-page.tsx:10-17,41-99,110-305,334-359`, `lib/server/admin/service.ts:29-68,92-146` | 일곱 목록, q/상태/종류/기간/보관·pageSize/sort/order, 감사 JSON diff, 작업·모니터링 검색에 owner UUID 포함 |
| S07 | `components/admin/detail-page.tsx:53-77,124-185,285-338,375-468,613-785` | 프로젝트·파트너 편집, 실제 신규 POST 호출 가능한 파트너, 모든 mutation 사유 강제, 사용자 정지/복구/세션회수·작업·모니터링·이미지 |
| S08 | `components/admin/detail-page.tsx:483-611`, `components/admin/shared.tsx:213-323` | 관련 목록·자료·가이드/번역, 기본 attempt/provider/cost_state 등, 고급 UUID/version/revision 링크 |
| S09 | `components/admin/translation-editor.tsx:45-118,132-169,179-340,342-458` | 파트너/가이드 원문·초안·게시, 언어 전환 시 초안 교체, 사유 강제, schemaVersion 자동 요청, JSON 파일+textarea·diff 노출 |
| S10 | `components/admin/locale-editor.tsx:26-74,78-127,154-223`, `lib/i18n/packs.ts:29-47` | 코드/이름/방향/fallback/정렬순서/사유 수동 입력, pack 유효성으로 deployed 판정 |
| S11 | `lib/contracts/admin.ts:10-54,59-80`, `lib/server/admin/service.ts:295-453,455-542,545-627,632-711` | 사유 strict/min(1), version 충돌, 사용자 자기 정지/회수 금지·복구 조건, 파트너 source revision, 재시도·중단 상태 조건·사용량 |
| S12 | `lib/server/localized-contents/service.ts:19-88,93-120`, `lib/contracts/metadata.ts:31-39,66-69`, `lib/server/admin/images.ts:1-191` | 번역 원문 연계·ruleId 동일 집합, JSON schemaVersion, 이미지 저장/삭제·검증·감사(업로드 인터페이스 유지 대상) |
| S13 | `lib/server/admin/http.ts:16-25,68-166`, `components/domain/monitoring-workspace.tsx:48-71`, `lib/account-store.ts:8-31` | 모든 admin API 재확인·Origin·정상 접근 제어, admin 스캔 결과 읽기 전용·job UUID 링크·provider/engineVersion 노출, 인증 뒤 문서 교체 |

## 2. 확정한 로그인·계정 운영 설계

### 2.1 진입과 이메일 로그인 관계

- `/admin` 및 허용된 상세 링크의 미로그인·일반 회원은 **새 `/admin/login?next=<안전한 admin 경로>`**로 보낸다. 신규 `app/admin/login/page.tsx`는 별도 정적 로그인 페이지다. 관리자 외 페이지 redirect는 UX이며 admin API의 active/verified/admin 권한 거절은 유지한다. 역할 승격은 하지 않는다. 일반 회원의 `/login?next=/admin`도 이 페이지로 이어져 관리자 계정 선택을 제공한다.
- 기본 입력은 ‘관리자 아이디 또는 이메일’(text, autocomplete=username)와 ‘비밀번호’(password, current-password) 두 개, 로그인 버튼 하나다. `admin`은 DB 별칭이며 이메일도 같은 credential 인증을 사용한다. 실패는 존재·역할·정지 여부를 구분하지 않는 ‘아이디 또는 비밀번호를 확인해 주세요’로 통일한다. 가입·소셜 로그인·개발용 힌트는 이 화면에 없다.
- 일반 `/login`, `/sign-in`, 가입·확인·비밀번호 찾기 `{email,password}` 계약과 기존 제한은 유지한다. ‘관리자 로그인’ 링크만 추가한다. 일반 이메일 sign-in으로 로그인한 관리자도 admin 목적지를 지원하지만 최초 admin API에서는 기존 재확인을 수행한다. 일반 로그인 세션에는 15분 verified 창을 새로 부여하지 않는다. 별칭을 lookup/가입/forgot-password 이메일 필드에 넣지 않는다.
- 새 `POST /api/auth/admin-sign-in`은 `{identifier,password,next?}`를 받는다. identifier는 trim·소문자 정규화, 최대 320; 이메일이면 emailSchema, 그 외 영문·숫자·밑줄·하이픈 3~40자 후 별칭 조회. 별칭/계정/credential이 없어도 KDF를 수행한다. 서버가 credential 검증과 active/verified/admin/profile-complete 확인을 같은 트랜잭션에서 처리하고 7일 세션과 `admin_verified_until=clock_timestamp()+15분`을 함께 발급한다. `admin.reauthenticate` 감사에 로그인으로 확인했다는 중립 사유 표식을 남긴다. 프런트 문자열 비교·가짜 쿠키·하드코딩 우회·로컬스토리지 인증은 금지한다.
- 관리자 로그인 성공 트랜잭션에서 기존 쿠키가 가리키는 세션 행만 삭제하고 새 세션으로 교체한다. 실패 시 기존 회원 세션을 유지한다. 다른 기기 세션을 로그인 때문에 회수하지 않는다. 세션 교체의 사용자 잠금은 user UUID 정렬 순서로 취득한다. 쿠키 쓰기와 문서 교체는 Route Handler/클라이언트에서 수행한다.
- 서버가 역할 확인 후 `nextStep`을 결정한다. next는 기존 admin section/detail UUID 및 query/back allowlist로 검증하고 외부 URL, `//`, 역슬래시, CR/LF, 자기 로그인 반복, 알 수 없는 route는 `/admin`으로 대체한다. 클라이언트는 서버 nextStep만 사용한다.

| 진입 시 상태 | `/admin` 및 허용된 상세 | `/admin/login` | admin-sign-in / API |
|---|---|---|---|
| 미로그인 | 안전한 next를 담아 관리자 로그인 redirect | 로그인 폼 | 정상 credential만 발급, API 401 |
| 일반 회원 세션 | 관리자 로그인 redirect | ‘관리자 계정으로 로그인해야 합니다’와 폼/서비스 이동 | 성공 시 현재 회원 세션 교체, 실패 유지; member API 403 |
| 정지 관리자(기존 쿠키 포함) | 유효 세션으로 인정하지 않고 관리자 로그인 redirect | 폼, 정지 여부 공개 안 함 | 로그인 안전한 공통 실패; 기존 세션 API 401 또는 권한 재검사 403, 데이터 없음 |
| 정상 active/verified/profile-complete 관리자 | 화면 진입, 15분 창 만료 시 재확인 | 안전한 목적지 redirect | 로그인 세션만 verified15분; API 서버 재검사 유지 |

#### 관리자 로그인 서버 제한 (R1-01)

관리자 전용 action은 기존 `limit(sign-in, identifier,10)` 및 공용 `ip:admin-sign-in/unknown` 버킷을 그대로 호출하지 않는다. 알려진 admin 별칭 하나로 다른 운영자의 이메일 로그인까지 잠기는 결함을 막기 위해 **식별자 단독 차단을 없애고 클라이언트별 요청 제한과 실패 제한**을 둔다.

| 제한 / 조건 | 확정 정책 |
|---|---|
| 식별자 정규화 | 존재하면 같은 user_id, 미등록은 정규화 identifier digest. 별칭/이메일은 같은 클라이언트 안에서 실패 집계 공유 |
| 클라이언트 요청량 | admin-sign-in에 한해 서버 발급 무작위 32바이트 서명 쿠키(별도 `ADMIN_AUTH_CLIENT_SECRET`, httpOnly/SameSite=Lax/Secure 조건)를 사용, 100회/15분 사전 제한. 잘못된 서명은 새 ID. 식별자와 무관한 요청량 제한이며 암호 저장 아님 |
| 서명 secret 설정·누락 (R2-02) | `lib/server/config/env.ts`에 `ADMIN_AUTH_CLIENT_SECRET`을 선택 환경 변수로 선언하고 별도 관리자 인증용 검증 함수에서 base64url 형식과 디코딩 길이(32바이트)를 검증한다. `lib/server/auth/http.ts`의 admin-sign-in 진입에서만 이 함수를 호출하며, 미설정·빈 값·잘못된 형식이면 `SERVICE_UNAVAILABLE` HTTP 503, 세션/쿠키 발급 없음. 서버 기동·일반 로그인·기존 세션은 유지한다. 배포 초기 자동 생성·기존 값 유지 절차는 7.1 |
| 실패 집계 | `(정규화 identity, 클라이언트 쿠키 ID)`당 실패 10회/15분. 성공은 실패 횟수에 더하지 않고 해당 쌍 실패 상태 해제. 초과 쌍의 잘못된 credential에는 RATE_LIMITED와 남은 대기 안내; 100회 요청량 안에서 검증된 정상 credential은 실패 한도로 거절하지 않음. 실패 저장은 인증 rollback 밖 별도 원자적 upsert |
| 신뢰 IP 사용 | `AUTH_TRUSTED_IP_HEADER`를 배포 프록시가 덮어쓰고 직접 web 접근을 차단한 경우만, 해당 IP당 100회/15분 사전 제한도 적용. 임의 전달 헤더·X-Forwarded-For를 자동 신뢰하지 않음. 동일 NAT의 100회 소진은 동일 IP 사용자를 제한할 수 있으며, 다른 IP 정상 운영자는 영향 없음 |
| 신뢰 IP 미설정/헤더 누락 | IP는 제한 키로 쓰지 않고 클라이언트 쿠키 기준으로 동작; `unknown` 전원 공유 한도 없음. 공개/운영 로그인은 계속 허용한다. 쿠키 삭제로 한도를 우회할 수 있으므로 이 fallback을 분산 공격 방지라고 주장하지 않음. 쿠키 초기화 시 실패 한도도 초기화되는 한계와 프록시 헤더 설정 권고는 7.1 및 향후 `deploy/README.md`에 명시(R2-03), 기존 제한 외 신규 통제 없음 |
| 범위 | Origin 검사·KDF·권한 정책 유지. 일반 sign-in/lookup/가입·5회 재확인 제한은 현재 정책 유지; 외부 admin-sign-in 실패가 일반 이메일 sign-in 버킷을 증가시키지 않음 |

최초 `admin/admin1234`는 운영 배포에서도 정상 사용 가능하며 강제 변경·로컬전용·접근불가 정책으로 축소하지 않는다. 비밀번호 변경은 정상 상단 링크로 제공한다. 별칭 행의 `initial_password_issued`는 **초기 발급 후 교체 여부** 표식일 뿐 실제 암호와 문자열 비교하지 않는다. 신규 bootstrap=true, bind-existing=false, already-configured는 유지, 성공한 정상 변경/메일 reset/서버 복구는 false로 같은 트랜잭션에서 갱신한다. 비밀번호 변경 페이지에서 true일 때만 ‘초기 발급 비밀번호를 사용 중이면 여기서 변경할 수 있습니다’라는 보조 설명을 제공하고 로그인·기본 운영 화면은 추가 배너 없이 유지한다. 같은 암호로 교체했다면 false도 안전한 암호라는 증거가 아니다. 별도 위험 수용 승인·닫을 수 없는 경고 배너는 추가하지 않는다.

### 2.2 서버 실제 계정·초기 생성·충돌 정책

**DB 변경은 향후 구현 P1에 필요**하다. 새 `admin_login_aliases` 테이블을 Drizzle 및 새 migration으로 추가한다: `login_name` PK(정규화 이름), `user_id` unique FK→users, `created_at`, `initial_password_issued boolean NOT NULL DEFAULT false`; 첫 별칭은 `admin`. 회원 모델에 모든 사용자의 username 필수 컬럼을 추가하지 않는다. 별칭은 user_id에 귀속되고 이메일 변경이나 비밀번호 교체 후에도 유지된다. 일반 사용자에게 별칭 생성/변경 HTTP API는 제공하지 않는다.

초기화는 신규 `scripts/bootstrap-admin.ts` 및 `pnpm admin:bootstrap`에서 **명시적으로 한 번 수행**하는 서버 운영 명령으로 구현한다. 웹 시작/빌드/로그인마다 생성하지 않고, 범용 DB seed·demo seed에도 섞지 않는다. 신규 생성 모드의 필수 환경 변수 `ADMIN_BOOTSTRAP_EMAIL`은 배포 운영자가 소유하는 실제 관리자 이메일이고, 최초 비밀번호 `ADMIN_BOOTSTRAP_PASSWORD=admin1234`는 서버 환경/보안 입력으로 전달한다. 이 값은 사용자가 요구한 최초 로그인 값이며 코드의 인증 정답으로 넣지 않는다. 출력·감사·에러에 비밀번호·해시를 남기지 않는다. 파라미터를 생략하면 안전하게 실패하고 DB에 아무것도 쓰지 않는다. 운영 배포에서도 이 절차를 지원한다.

| 서버 항목 | 신규 계정의 확정 값·처리 |
|---|---|
| users.id / email | 서버 UUID / 정규화한 ADMIN_BOOTSTRAP_EMAIL, 기존 이메일 unique 유지 |
| name / org_name | `관리자` / `CLAPS 운영`, profile_completed_at=now(); 별도 프로필 입력 없이 즉시 운영 가능 |
| app_role / status | `admin` / `active` |
| email_verified | true; 서버 배포 관리자에 의한 초기 계정 소유 확인을 명시적 bootstrap 감사로 남김, 공개 sign-up에는 적용 금지 |
| preferences / version | `{schemaVersion:1,locale:'ko'}` / 기존 기본값 1, ja 이름·kana 필드 null 보존 |
| auth_accounts | provider_id='credential', account_id=user UUID, password=await hashPassword(초기 비밀번호), 저장 뒤 verifyPassword 확인; 평문 저장 금지 |
| admin_login_aliases | login_name='admin', user_id=같은 UUID, unique/FK 준수 |
| 세션 | 초기화가 임의 세션을 만들지 않음. 정상 로그인 후만 7일 세션 발급 |
| 감사 | 신규 사용자 생성·별칭 연결 action을 admin_audit_logs에 system actor(null), request_id, schemaVersion=1 diff로 기록; 비밀번호/해시 제외 |

초기화 전체를 단일 트랜잭션과 전용 advisory lock으로 처리한다. 먼저 별칭, 이메일, credential을 확인하고 다음 정책을 적용한다. 결과는 created/already-configured/conflict 중 하나와 안전한 상태 요약만 출력한다.

| 기존 상태 | 동작 |
|---|---|
| 별칭 없음, 이메일 없음 | 사용자+credential+별칭 생성, 해시 검증 실패면 전부 rollback |
| admin 별칭이 같은 이메일의 active/verified/admin/profile-complete 사용자에 연결, credential 1개 존재 | already-configured, **현재 비밀번호·이름·상태·세션 그대로**. 초기값으로 다시 reset하지 않음. 실제 현재 password가 admin1234인지 출력하지 않음 |
| 같은 이메일 사용자만 존재, 별칭 없음 | conflict로 중단, 자동 승격·verified 수정·비밀번호 덮어쓰기 금지 |
| 별칭이 다른 이메일 사용자에 연결 / 기존 상태 불완전·정지·탈퇴 / credential 없음·중복 | conflict로 중단, 자동 복구·재활성화·계정 합병 금지 |
| 동시/반복 실행 | lock+unique로 한 계정·한 별칭만 생성, 다른 실행은 already-configured 또는 명시적 conflict |

기존 관리자 사용자를 쓰는 경우에는 별도 **`pnpm admin:bootstrap --bind-existing <email>`**를 실행한다. 이는 서버 운영자가 정규화 이메일로 정확한 사용자를 지정하는 운영 절차다. `ADMIN_BOOTSTRAP_EMAIL`과 bind 이메일이 다르면 무변경 conflict이며 UUID를 찾을 필요가 없다. 이미 active/verified/admin/profile-complete이며 credential 한 개인 사용자만 연결하고, 같은 설정의 반복 연결은 no-op, 다른 별칭 소유자는 교체하지 않는다. 기존 비밀번호는 변경하지 않으므로 최초 `admin1234` 수용 기준이 필요하면 운영자가 아래 정상 변경 또는 명시 서버 복구 명령으로 직접 설정해야 한다. 일반 사용자라면 기존 `pnpm account promote <email>`의 정상 정책과 이메일 확인·프로필 완료를 먼저 수행한다. suspended/withdrawal_pending 계정은 bootstrap로 되살리지 않는다. 최초 bind의 연결 감사와 모든 대상 세션 회수는 같은 트랜잭션으로 처리한다. already-configured 반복 bind는 감사·세션 회수도 하지 않는 완전 no-op다. 이 충돌 해결을 개발자 임의 자동 덮어쓰기로 처리하지 않는다.

### 2.3 재확인·세션·로그아웃·비밀번호

- 7일 인증 세션과 15분 재확인은 별개다. **admin-sign-in에서 이미 비밀번호를 검증했으므로 최초 운영 진입은 비밀번호 한 번 입력으로 끝난다.** 15분 후 첫 admin API의 ADMIN_REAUTH_REQUIRED만 모달로 다시 입력한다. 일반 `/login` 이메일 로그인은 기존 최초 재확인을 유지한다. 15분 창 연장·영구 우회는 없다.
- 재확인 5회/15분은 그대로다. 서버가 실제 mutation 전에 ADMIN_REAUTH_REQUIRED로 거절한 동작만 원래 payload(존재하는 key 포함)로 최대 한 번 재개한다. 취소하면 입력 보존·저장하지 않음; 또 재확인 오류면 자동 반복 없음. **네트워크 결과 불명은 재확인 거절과 달라 자동 재전송하지 않는다**(4.1 분류). 세션 만료/로그아웃 후 pending mutation 폐기, 재로그인 후 자동 실행 금지.
- 상단은 관리자 이름, 언어, 서비스로 돌아가기, 정상 ‘비밀번호 변경’, 로그아웃이다. verifiedUntil 숫자 삭제. 401 로그인 이동, 403 운영 권한 없음, ADMIN_REAUTH_REQUIRED 모달을 구분한다.
- 비밀번호 변경 링크는 `/change-password`를 사용한다. 현재+새+확인 입력, 8~128자 정책 유지. **성공 목적지 결정 주체는 서버 AuthService이며 검증된 세션 사용자/소비한 reset token 사용자 역할이 admin이면 `/admin/login`, 일반 사용자이면 기존 `/login`을 nextStep으로 반환한다.** change/reset에서 클라이언트 next는 읽지도 전달하지도 않는다. 일반 lookup/sign-in의 안전한 next 처리만 유지한다. 변경 페이지는 requirePage가 반환한 현재 사용자 역할로 admin ‘관리자로 돌아가기’(`/admin`), member 기존 `/login` 링크를 렌더한다. 취소는 저장·세션 회수 없음; 암호 입력은 메모리에서 버린다. 현재 페이지 파일과 공통 폼 props를 P1 범위에 포함한다.
- 성공 시 credential hash 교체·해당 사용자 모든 세션·verify/reset token 회수·별칭 초기 발급 표식 해제·감사를 같은 트랜잭션으로 수행하고 HTTP 쿠키 삭제 뒤 nextStep으로 문서 교체한다. 새 암호로 admin-sign-in→verified15분, 이전 암호 거절; bootstrap 반복은 새 암호를 유지한다. 실패 시 현재 암호만 비우고 나머지 입력/필드 설명 보존. 강제 최초 변경 없음.
- 로그아웃은 현재 서버 세션 삭제+쿠키 만료 후 `/admin/login` 문서 교체. 실패를 성공으로 가장하지 않음. 뒤로가기/다른 탭은 다음 요청의 서버 권한 재검사, 인증 이전 RSC 데이터 재사용 금지. dirty인 정상 로그아웃은 4.2 가드 확인 후 서버 호출; 만료/권한 상실의 필수 인증 이동은 차단하지 않는다.

#### 메일 disabled 배포의 분실 복구 (R1-02)

현재 `AuthService`는 sandboxMail 고정 주입이고 remote compose의 기본은 `MAIL_ADAPTER=disabled`다. 실제 발송 어댑터는 이번 코드에 없다. 메일 전달을 이번 필수 복구의 전제로 삼지 않는다.

이번 P1에 새 `scripts/recover-admin-password.ts`와 `pnpm admin:recover-password --email <email> --password-stdin`을 구현한다. 서버/tools DB 자격 증명을 가진 운영자만 명시 실행하며 공개 HTTP 복구 API는 만들지 않는다. 이메일·password-stdin 인자는 모두 필수, 암호는 stdin에서 받아 8~128자 검증·hashPassword/verifyPassword 확인, CLI 인자·환경·로그·감사·셸 history에 암호/해시를 출력하지 않는다. 누락/잘못된 입력은 DML 이전 실패. bootstrap·seed·시작 스크립트에서 자동 호출하지 않으며 현재 암호를 묻지 않는 분실 복구 전용이다.

사용자 lock 및 credential 확인 후 active/verified/admin/profile-complete와 단일 credential, 연결 별칭을 검증한다. 정지/탈퇴/일반회원/별칭 충돌/credential 중복은 무변경 conflict이고 role·verified·프로필·상태를 바꾸지 않는다. 한 트랜잭션에서 암호 교체·모든 세션·reset/verify token 회수·initial_password_issued=false·system actor(null) `admin.password.recover` 감사(이메일을 추가 노출하지 않고 대상 user_id, request_id, 비밀 없는 변경 표식) 기록. SQL/감사 실패면 전체 rollback; 출력은 recovered/conflict와 안전한 요약뿐이다. stdin은 터미널/파일에서 받은 한 줄 끝의 LF/CRLF만 제거하고 암호 자체를 trim하지 않으며, 추가 줄은 입력 오류로 거절한다. 같은 명시 명령의 반복도 매번 의도한 교체와 세션 회수이며 bootstrap no-reset과 별개다. 복구 직후 admin 별칭/새 암호 로그인, 구 암호/구 세션 거절을 T04로 검증한다.

로그인 화면 분실 안내는 ‘서버 운영자에게 비밀번호 복구를 요청해 주세요’ 한 줄로 한다. 기존 이메일 `/forgot-password`→reset API는 보존하고 별칭 이메일을 공개하지 않는다. sandbox 격리 테스트에서는 메일 reset도 위 서버 역할 목적지·세션 회수를 검사한다. 실제 메일 어댑터/전달은 현재 **사용 불가**, 구현 범위에 새 메일 서비스 통합을 추가하지 않는다. 향후 준비된 경우 보조 경로로 쓸 수 있으나 T18의 이번 복구 통과는 disabled 상태 서버 명령으로 판정한다.

## 3. 운영 화면·필드의 전수 결정

표의 ‘삭제’는 **운영 UI에서 제거**하는 뜻이다. DB/서버 계약 데이터 삭제와 다르다. ‘자동’은 보이지 않는 서버/클라이언트 계약 생성이다. ‘고급’은 운영상 실제 필요한 추가 설정만 접힌 ‘추가 정보/설정’에 둔다는 뜻이다. UUID·raw JSON·schemaVersion·version·provider request ID 등을 단지 ‘고급’에 옮겨 노출하는 방식은 채택하지 않는다. 표의 필수는 운영자 입력 기준이다. 읽기 전용 값은 입력 필수가 없고 서버에 없는 값은 ‘정보 없음’으로 표시하며 추측해서 채우지 않는다.

### 3.1 공통·대시보드·목록

| 화면 / 필드·동작 (근거) | 결정 | 기본 노출 | 필수·기본값·예시 |
|---|---|---|---|
| 모든 화면 메뉴(S01,S05) | 유지·쉬운 이름 | 예 | ‘홈/사용자/프로젝트/파트너/운영’; 운영 안 작업·모니터링·변경 기록·언어. route는 기존명 유지 |
| 헤더 관리자명·서비스 이동·언어·로그아웃·비밀번호 변경 | 유지/추가 | 예 | 읽기전용 ‘관리자’, 현재 UI 언어 유지 |
| verifiedUntil 숫자·상시 기술적 세션 표시 | 삭제 | 아니오 | 실제 재확인 모달/만료 임박 안내만 유지 |
| requestId·API error code·field key(S05) | 삭제(지원정보 복사만 제공) | 아니오 | 기본은 번역된 오류·필드 이름·복구 동작, 지원정보 복사에는 requestId만, 비밀 제외 |
| 대시보드 users/projects(S05) | 유지 | 예 | ‘전체 사용자/운영 중 프로젝트’ 정확한 기간 표기, 목록 링크 |
| failed/queued | 유지·행동 연결 | 예 | ‘다시 실행할 수 있는 실패 N건/대기 중 N건’, 전체기간 중 아래 조치 가능 조건과 queued 수만 집계. ‘오늘’이라는 현재 오해 소지 문구 삭제 |
| cleanup | 고급 읽기전용 | 아니오 | ‘파일 정리 대기 N건’, 시스템 자동 처리 안내; 실행 버튼이나 완료 보장 없음 |
| usage_date/kind/status/requests 30일 테이블 | 고급 읽기전용 | 아니오 | ‘최근 30일 작업 현황’; 숫자는 실 API 결과만 |
| 대시보드 초보 퀵액션 | 추가 | 예 | ‘파트너 등록/사용자 찾기/실패 작업 확인’; 실제 route만 연결 |
| 목록 q·검색 버튼·목록 새로고침 | 목록별 유지 | 예 | 아래 7종 표의 검색 대상만, 200자. 언어/프로젝트 가이드 탭은 검색 입력 제거 |
| 상태(users/jobs), 보관 여부(projects/partners/monitoring) | 유지·간단 탭 | 예 | 사용자는 전체/이용 가능/이용 제한 및 고급 나머지 3상태, 작업은 진행 중/실패/전체; 보관 default active, ‘보관함’ 링크 |
| jobs.kind·audit.entityType·기간 from/to | 고급 | 아니오 | 선택, 한글 종류/대상/날짜, 시작≤종료. jobs 전체 종류 포함 |
| pageSize/sort/order(S06) | 삭제 | 아니오 | 자동 20건·created_at desc·id 안정 정렬, 기존 URL 지정값은 허용·보존, 새 조작 시 page=1 |
| ownerId/projectId/entityId/actorId/action raw 입력 | 삭제 / 관련 탭에서 자동 | 아니오 | 서버 query 지원은 유지. UI는 선택한 이름·관련 범위 안내, UUID 입력 요구 없음 |
| 필터 초기화 | 유지 | 활성 필터 있을 때 | q/고급필터 reset, 관련 탭의 owner/project/entity 스코프는 절대 지우지 않음 |
| 이전/다음·페이지/총수·로딩/빈 목록 | 유지 | 예 | 빈 검색 ‘조건에 맞는 결과가 없습니다’+초기화; 실제 전체 빈 목록은 가능한 등록 동작만 |
| users 목록 name,email,org_name,status | 유지 | 예 | 읽기전용 이름/이메일/회사/이용 상태. created_at은 상세 추가정보로 이동 |
| projects 목록 name,ip_name,status,archived_at | 유지 | 예 | 프로젝트/브랜드·캐릭터/상태; created_at 고급 |
| partners 목록 name,visibility,archived_at | 유지 | 예 | 파트너/공개 여부/보관 여부; created_at 고급 |
| jobs 목록 kind,status,created_at,error_code | 유지·번역 | 예 | 작업 종류/상태/시작 시각/실패 설명. raw error_code·attempt는 삭제, 자세한 비용은 상세 추가정보 |
| monitoring 목록 name,latest_result_count,archived_at | 유지 | 예 | 대상명/최근 발견 N건/보관 여부; created_at 고급 |
| guides 목록 version,status,created_at,current | 유지·업무명 | 프로젝트 가이드 탭 | ‘가이드 3차/사용 가능/등록일/현재 사용 중’, DB optimistic version와 구분 |
| audit 목록 created_at,action,entity_type,reason | 유지·사람말 | 예 | ‘언제/누가/무엇을/변경 요약’, reason은 상세의 변경 설명. actor/대상명 DTO 추가 |

#### 목록 검색 대상·탭의 서버 매핑 (R1-07, UI-02)

아래 표는 기존 list API 7종(users/projects/partners/jobs/guides/monitoring/audit)과 별도 언어 목록을 모두 닫는다. 기존 guides endpoint는 관련 가이드 탭·legacy URL 호환용이며 전역 검색 UI를 제공하지 않는다. `q`는 normalizeInput·소문자 부분검색·파라미터 바인딩을 사용하고 이름 join과 count/페이지 query의 필터가 같아야 한다. 종류·상태를 찾는 UI는 번역된 탭/선택지이고 raw 영문코드 검색을 요구하지 않는다.

| 목록 / endpoint | 검색 대상·UI 힌트 | 기본 탭 → 서버 파라미터 / 추가 탭 |
|---|---|---|
| 사용자 / users | 이름·이메일·회사 | 전체=`status` 없음(5상태 모두), 이용 가능=`active`, 이용 제한=`suspended`. 고급 단일 선택: 이메일 확인 필요=`email_unverified`, 프로필 작성 필요=`profile_pending`, 탈퇴 처리중=`withdrawal_pending`; 원문 상태명 입력 없음 |
| 프로젝트 / projects | 프로젝트명·브랜드/IP 이름·소유자 이름/이메일 join | 사용 중=`archived=active,status` 없음, 보관함=`archived=archived`; preparing/generating/verifying/needs_revision/completed는 행 상태 번역, 상태 검색 입력 없음 |
| 파트너 / partners | 원문 파트너명·원문 IP 이름 | 사용 중=`archived=active`, 보관함=`archived=archived`, 전체=`archived=all`. 공개/비공개는 행 배지, 가짜 status 탭 없음 |
| 작업 / jobs | 소유자 이름·이메일·프로젝트명 join, 힌트 ‘사용자 또는 프로젝트’. 종류명 검색은 입력 대상이 아님 | 기본 진행 중=`statuses=queued,running`, 실패=`status=failed`, 전체=둘 다 없음; 고급 kind는 번역된 전 kind→기존 kind 코드, 대기/실행/성공/중단은 단일 status. 홈 재시도 가능 링크=`status=failed,retryable=true` |
| 모니터링 / monitoring-records(UI monitoring) | 대상명·소유자 이름/이메일 join | 사용 중=`archived=active`, 보관함=`archived=archived`, 전체=`archived=all` |
| 변경 기록 / audit-logs | 관리자 이름/이메일·대상 표시명 join, 힌트 ‘관리자 또는 대상 이름’. null actor는 서버가 ko/en/ja의 ‘시스템/System/システム’ 검색어를 actor IS NULL 조건과 이름 검색 OR로 매핑 | 기본 변경만=`includeReads=false`, 고급 ‘조회 기록 포함’=`includeReads=true`. 대상종류·기간은 기존 entityType/from/to, UUID 입력 없음. 특정 사용자/대상 범위는 해당 상세 변경 기록 탭으로만 진입(entityType/entityId); 일반 목록에 새 이름 선택기 안 만듦 |
| 가이드 / guides(관련탭·기존 list API) | 검색 UI 제거. 원문/규칙은 선택 상세에서 읽기; legacy q의 기존 UUID 검색 API는 유지 | 프로젝트 scope `projectId` 자동, 전체 등록본=`status` 없음; 현재 사용중은 activeGuide 관계 표시, UI status 필터 없음 |
| 언어 / locales | 검색 입력 없음(3개 카탈로그), 새로고침 유지 | 전체 한 목록·탭 없음, 기존 locales GET; enabled/deployed는 각 행 상태, HTTP에 지원하지 않는 status/q를 보내지 않음 |

작업용 additive `statuses`는 queued/running/succeeded/failed/canceled 중 중복 제거된 최대 5개 comma-list, status와 동시 지정은 VALIDATION_ERROR, jobs 외 사용 거절. SQL은 `status=ANY($n::text[])`, count도 동일. `retryable=true` 역시 jobs 전용 boolean, JobService의 canRetry 조건(실패·미 dispatch·취소 요청 없음·retry child 없음·정책 maxRetries 미만·TRANSIENT/TIMEOUT/WORKER_LOST)과 동일한 서버 predicate를 홈·목록이 공유한다. 홈 수는 이 조건만 세며 provider 미준비/소유자 비활성은 상세에서 기존 불가 이유를 표시한다. 새 retry child가 생기면 원래 실패 수는 감소하고 child도 실패하여 조치 가능하면 다시 포함된다. queued 링크는 `status=queued`. 기존 status 단일 요청·sort/order/pageSize·기간·scope는 호환한다.

프로젝트 guides 탭은 q 없이 현재 사용중/등록차수/상태를 읽는다. 감사 읽기 노이즈는 `.read` suffix인 현재/미래 action과 `admin.reauthenticate`를 기본 제외하고 변경/복구/bootstrap/system mutation 및 legacy non-read는 포함한다. 현재 생성되는 `admin.read`(상세·모니터링 이력), `translation.read`, `admin.reauthenticate`는 모두 제외한다. 미래 `.read` suffix도 같은 기준이다. 감사 저장은 계속 유지하며 includeReads가 조회 자체를 삭제하는 기능은 아니다. 현재 고정 시스템 문구 `Administrative detail access`, `Content editor access`, `Monitoring history access`, `Password reconfirmed`, `Explicit account lifecycle operation`도 action과 함께 현재 언어로 표시하고 과거 자유 사유는 원문 보존한다.

### 3.2 사용자·프로젝트·가이드·작업·모니터링 상세/신규

| 화면 / 현재 필드·행동(근거) | 결정 | 기본 노출 | 필수·예시·제약 |
|---|---|---|---|
| 사용자 상세 name,email,org_name,status,app_role(S08) | 유지 읽기전용 | 예 | ‘김민수/ops@example.com/예시회사/이용 가능/관리자’; app_role는 권한 설명으로 표시, 역할 변경 input 없음 |
| family_name,given_name,kana | 고급 읽기전용 | 아니오 | 일본어 사용자 원본 이름정보를 그대로 보존, 이름 합성 규칙 변경 금지 |
| email_verified,profile_completed_at | 유지·요약 | 상태 문제 있을 때 | ‘이메일 확인 필요/프로필 작성 필요’, 정상은 상태 배지로 통합; timestamp 입력 없음 |
| created_at | 고급 읽기전용 | 아니오 | ‘가입일’, locale 날짜 |
| 사용자 관련 projects/jobs/monitoring/history | 유지 | 탭 | scope 자동, 다른 사용자 정보 혼입 금지 |
| suspend/restore/revoke 및 reason(S07,S11) | 유지 + reason 자동/선택 메모 | 위험 작업 영역 접힘 | ‘이용 제한/제한 해제/모든 기기 로그아웃’ 확인 한 번. 자기사용자 정지·회수 금지, 탈퇴 처리중 금지, verified+profile-complete만 복구 |
| 사용자 신규(/users/new) | 삭제/차단 | 아니오 | 생성 API 없음. 404 안내, 기존 일반 가입만 사용. 관리자에서 암호·role 입력 추가하지 않음 |
| 프로젝트 상세/편집 name | 유지 | 예 | 필수 1~200자, ‘봄 신상품’ |
| ipName | 유지·‘브랜드·캐릭터 이름’ | 예 | 필수 1~200자, ‘클랩스 캐릭터’; 프로젝트의 실제 도메인 필드로 자동 임의 복제 금지 |
| description | 유지 | 예 | 선택, 10,000자, ‘4월 굿즈 디자인 운영’ |
| owner_id / active_guide_id | 자동 관계 + 이름 링크 | 예(소유자/사용 가이드) | UUID UI 삭제, API DTO에 사용자명·가이드 표시명 추가 |
| status/archived_at | 유지 | 예 | 읽기전용 상태, 보관/복원 명확한 확인; 데이터 삭제 아님 |
| reason,version,source_revision | 자동 / UI 삭제 | 아니오 | action 사유 자동, version 원본 잠금·충돌 유지 |
| 프로젝트 신규(/projects/new) | 삭제/차단 | 아니오 | admin HTTP에 POST 없음(S13). ‘새 프로젝트’ 버튼을 만들지 않음. 서비스 정상 생성 경로를 안내하며 소유자 UUID 입력 방식 도입 금지 |
| 프로젝트 자료 탭 sessions.title,assets 표시명,adopted/finalized/verification.verdict(S08) | 유지 읽기전용 | 예 | 제목 없는 기존 자료는 ‘자료 1’, 생성/채택/확정·검증 결과 사람말, raw verification JSON 삭제 |
| sessions.id/assets.id 및 내부 증거 버전 | 자동 / UI 삭제 | 아니오 | 서버 관계 유지, 읽기권한 없는 일반 서비스 URL을 임의로 링크하지 않음 |
| 프로젝트 가이드 등록본 version/status/created_at/current | 유지 | 예 | 업무상 등록차수는 유지, ‘현재 사용 중’ 표시 |
| 가이드 원문 rules.title/description/evidence.page/excerpt | 유지 읽기전용 뷰 추가 | 가이드 선택 시 | 실제 가이드 데이터 DTO 확장, ‘규칙/설명/근거 페이지’, 추출 미완료는 진행 상태·재시도 경로 안내 |
| rules.condition.field/operator/value | 고급 읽기전용·문장 변환 | 아니오 | 예 ‘로고 크기가 최소 20이어야 합니다’, 미지원 조건은 ‘규칙 설명 준비되지 않음’; raw JSON 노출 금지 |
| ruleId/schemaVersion/source revision/active ID | 자동 / UI 삭제 | 아니오 | 번역 규칙 매핑·원문 연계 그대로 |
| 가이드 신규·원문 편집·교체·삭제 | 삭제/미제공 명시 | 아니오 | 기존 admin 생성/원문 편집 API 없음. 이번에는 원문 조회 개선과 파트너 번역 전체 개선, 사용자 프로젝트의 정상 가이드 등록 프로세스 유지. 가이드 번역 소비처가 없어 UI 제거, API/데이터 유지(3.5). ‘나중에 개발’ 안내 대신 가능한 동작만 설명 |
| `/admin/guides/:id` | 유지 호환 | 링크 목적지만 | 기존 프로젝트 guides 탭 redirect 보존, 선택 가이드 query `guide` 추가하여 원문 자동 선택 |
| 작업 kind,status,created_at,error_code(S07,S11) | 유지·한글 설명 | 예 | 종류/진행 상태/시작 시각/실패 원인·복구방법 |
| attempt,provider,provider_request_id,retry_of_id,id,version,cost_state raw | UI 삭제 | 아니오 | 내부 DTO/계약 유지, 재시도 관계는 ‘원래 작업/재시도 작업’ 이름 링크로 대체 |
| usage.units/unit·비용 상태 | 고급·쉬운 설명 | 아니오 | 실제 비용 자료만 ‘사용량 3회/정산 대기’, provider 금액 추측 금지 |
| canRetry/retryJobId/canCancel | 유지·서버 가능 동작만 | 예 | ‘다시 실행/중단’, 재시도는 추가 사용량 안내 후 확인, 중단은 ‘중단 요청됨’과 최종 중단 구분 |
| 작업 reason | 자동 / 선택 메모 | 아니오 | 재시도/중단 사유 자동, 실패 작업 재시도만 허용, 동일 재시도 중복 생성 금지 |
| 작업 신규(/jobs/new) | 삭제/차단 | 아니오 | 종류별 작업 생성은 정상 서비스 흐름, admin raw payload 입력 미제공 |
| 모니터링 상세 name/record.imageUrl/sourceName/sourceAvailable/lastScannedAt | 유지 읽기전용 확장 | 예 | ‘확인 대상/원본 이미지/최근 확인일’; 원본 삭제·보존만료는 정보 없음 안내 |
| latest_result_count/archived_at | 유지 | 예 | 발견건수와 보관 상태. 0건과 아직 검사 안 함을 구분 |
| scans job.createdAt/status/result.state/sources.status/items.url/source/similarity/discoveredAt | 유지·사람말 | 실행내역 펼침 | 원본 링크 ‘발견 페이지 열기’, 유사도 참고 정보·한계 유지, 안전한 외부 URL과 noreferrer |
| scans job.id/item.id/provider/engineVersion/factor 내부 필드(S13) | UI 삭제 또는 업무지표로 변환 | 아니오 | ‘실행 작업 보기’ 이름 링크. character/color/composition/logo 값은 ‘비교 요소’ 고급, provider·engineVersion 삭제 |
| feedback.reported/reason·grade | 유지 읽기전용 | 결과 상세 | 기존 admin feedbackPath=null 유지, 보고/철회 버튼 새로 만들지 않음 |
| scanAvailable·scan·archive/restore | 유지 | 예 | 공급자 불가/소유자 비활성/보관상태 불가 사유 설명, scan는 비용 안내 확인 후 실행 |
| monitoring reason/outputLocale/idempotencyKey/version | 자동 | 아니오 | 최초 시도 key/outputLocale/version snapshot 고정; UI 언어를 바꿔도 같은 시도 값 유지(5절). 결과 불명 자동 재전송 없음 |
| 모니터링 신규(/monitoring/new) | 삭제/차단 | 아니오 | admin 생성 API 없음, 기존 서비스 등록 흐름 유지 |
| 모든 상세 id/version/source_revision/owner_id/project_id/retry_of_id/active_guide_id | UI 삭제·관계 이름으로 변환 | 아니오 | 서버 계약 및 안전한 route에는 여전히 필요. 일반 ‘고급’에도 raw 값 노출 금지 |

### 3.3 파트너 신규/편집·이미지·번역·언어·감사

| 화면 / 필드·동작 (근거) | 결정 | 기본 노출 | 필수·기본값·예시 |
|---|---|---|---|
| 파트너 신규 `/admin/partners/new`·편집 name | 유지 | 예 | 유일한 최초 저장 필수 입력, 1~500자, ‘클랩스 스튜디오’ |
| description | 유지 | 예 | 선택 10,000자, ‘캐릭터 굿즈를 제작합니다’, 빈 문자열 계약 허용 |
| visibility | 유지·저장 후 공개 동작 | 예(상태) | 신규 private 자동, ‘비공개로 저장’→이미지·내용 확인→‘공개하기’; 편집 공개/비공개 변경은 영향 확인 |
| contactEmail | 고급 | 아니오 | 선택, 비어있으면 null, ‘partner@example.com’, 입력 시 이메일 검증 |
| tags / ipNames | 고급·칩 추가 | 아니오 | 선택, 각각 최대 50개, tag 100자/IP 500자; ‘봉제/클랩스 캐릭터’. 쉼표 규칙 입력 안내 삭제, 칩 추가·제거 지원 |
| marketDescription | 고급 | 아니오 | 선택, ‘주요 고객: 캐릭터 팬’, 기존 값 절대 빈값으로 덮어쓰지 않음 |
| imageAlt | 자동 + 고급 수정 | 아니오 | 자동값은 저장하지 않고 조회 시 fallback(3.5). 기존/번역 사용자 작성 nonblank 값 보존; 비어있으면 현재 공개 이름 기반 locale 설명 |
| reason / schemaVersion / sourceRevision / version / imageCount | 자동 / UI 삭제 | 아니오 | 불필요한 입력 삭제, 내부 profile/원문 revision·동시성 보존, imageCount는 이미지 목록 개수로만 표시 |
| 이미지 파일·미리보기·제거(S07,S12) | 유지 | 이미지 탭 | 선택, PNG/JPEG/WebP 기존 서버 타입/크기/20개 한도 유지, 선택→미리보기→‘사진 추가’; 선택 즉시 암묵 업로드 변경 |
| 이미지 파일명·mime/storageKey/index/version·사유 | 자동 / UI 삭제 | 아니오 | 파일 metadata/스토리지 검증 보존, 이름과 미리보기로 제거 확인, URL query 호환 유지 |
| 보관/복원 | 유지 | 접힌 위험작업 | ‘목록에서 보관/다시 사용’, archived public 전환 금지, 보관과 공개 상태 설명 |
| 번역 대상 partner/resourceKey/locale/schemaVersion/version/sourceRevision | 자동 / UI 삭제 | 아니오 | 화면 대상·선택 언어로 설정, 현재 DB version/revision·내부 guide API의 원문 ruleId 매핑도 유지 |
| 콘텐츠 언어 선택 | 유지·이름만 표시 | 예 | 등록된 deployed 언어 이름(코드 숨김), ko는 읽기전용 원문. 비활성 언어도 준비용으로 표시하되 ‘사용 중 아님’ 표기; pack 미배포는 선택 불가. 비활성 언어 draft 저장/게시 가능, 공개/UI 선택은 enabled+deployed만. UI 언어 스위처와 목적 구분 |
| 파트너 번역 name / description | 유지 | 예 | 이름 필수(원문 초기값), 설명 선택, 500/10,000자 |
| 파트너 번역 ipNames / marketDescription / imageAlt | 고급(원문 값 있으면 해당 항목 기본 노출) | 조건부 | ipNames 칩, 원문 표현 빠뜨리지 않도록 알림; 원문 값·배열 구조 보존, 번역 imageAlt 빈값은 조회 fallback, 자동 문자열 저장 없음 |
| 가이드 번역 rules.title/description | 운영 UI 제거 | 아니오 | 현재 공개 소비처 없음. 기존 API/데이터/파일 계약 보존, 새 효과 없는 편집·게시 버튼 없음(3.5) |
| 원문 보기·초안·게시 상태·needsUpdate | 유지 | 예 | ‘원문이 변경되어 번역 확인이 필요합니다’, 원문/번역 병렬(모바일 세로), 사용자가 명시적 검토·저장 후 게시 |
| saveDraft / publish / unpublish / reason | 유지·사유 자동 | 예 | ‘저장/게시/게시 중단’. 게시 전 저장 완료·원문 최신 확인·해당 언어 영향 확인, 중단은 원문 fallback 안내 |
| JSON textarea·schema/UUID/raw diff 미리보기(S09) | 삭제 | 아니오 | 운영자 JSON 작성 요구 없음. 일반 번역 필드로 전체 작업 가능 |
| JSON 파일 import/export | 고급 ‘번역 파일 가져오기/내보내기’ | 아니오 | 기존 호환 파일 유지·64KiB/100 entries 제한, 선택→서버 검증·이름/항목별 변경표→확인→적용. preview 이후 파일 바뀌면 적용 불가 |
| import before/after·resourceKey/field key | 유지·이름 변환 | 미리보기 | 사람말 대상명/언어/필드명/텍스트·칩, JSON.stringify 화면 출력 삭제, 파트너만 UI에서 적용 가능; guide 포함 파일은 적용 전 설명·거절, DB 변경 없음. API의 guide import/export는 그대로 보존 |
| 언어 목록 native_name/enabled/deployed/missing(S10,S11) | 유지·쉬운 상태 | 예 | ‘한국어/사용 중/준비 완료/번역 미완료 N건’; missing이 공개 파트너 기준이라는 범위 표시(가이드 전부 수치로 오인 금지) |
| 언어 code | UI 삭제 / 자동 | 아니오 | 코드는 내부 PK. 언어명 선택에서 유효 pack+카탈로그 값 매핑 |
| 언어 추가 | 유지·카탈로그 선택 | 예 | 필수 ‘추가할 언어’ 하나; 새 `lib/i18n/locale-catalog.ts` ko/en/ja nativeName/displayName/direction 메타를 확정 등록, 검증된 deployed pack 중 미등록만 선택 가능 |
| nativeName/displayName | 자동 + 고급 이름 편집 | 아니오 | 새 항목 카탈로그 값, 기존 값 보존; 고급 편집 시 둘 다 1~100자. 예 ‘日本語/일본어’ |
| direction | UI 삭제 / 자동·기존 보존 | 아니오 | 신규 카탈로그 ltr/rtl, 기존 direction 그대로. 새 언어 pack 추가 배포 시 카탈로그 메타도 함께 제공, 운영자가 방향 코드 입력하지 않음 |
| fallbackCode | 자동 + 고급 ‘번역 없을 때 보여줄 언어’ | 아니오 | 신규 ko, ko는 null 고정; 기존 값 보존, 언어명 선택만, cycle·없는 대상 서버 거절 |
| sortOrder | UI 삭제 / 자동 | 아니오 | 기존 값 유지, 신규 max+10, 결과 >10,000이면 STATE_CONFLICT와 ‘등록 가능한 순서 범위를 초과했습니다’ 설명; 기존 행 재번호/일괄 version 변경 없음, 숫자 입력 금지 |
| enabled | 유지·확인 버튼 | 예 | 신규는 false, 준비 완료 언어만 ‘사용하기’, ko 비활성 금지, 없는 pack 즉시 활성 불가 |
| 언어 reason/version | 자동 / UI 삭제 | 아니오 | 목록 공통 사유와 모달 사유 모두 제거, 저장/활성/비활성별 감사 자동 생성 |
| 카탈로그에 없는 언어·불완전 pack | 입력화면 삭제 | 아니오 | ‘언어 준비가 필요합니다’ 안내, 해당 pack+메타 배포가 먼저; 임의 언어코드를 운영자가 넣는 방식 금지 |
| 감사 created_at/actor/action/entity/name(S06) | 유지 읽기전용 | 예 | ‘관리자가 파트너 공개 상태를 변경했습니다’, 기존 null actor는 ‘시스템’, 대상 삭제면 ‘대상이 삭제되었습니다’ |
| 감사 changes.fields before/after/reason | 유지·문장/텍스트 | 기록 펼침 | 필드별 ‘비공개→공개’, 중립 표식·알려진 시스템 사유는 현재 언어 action 설명, 사용자 메모/legacy 자유 사유는 원문 표시(3.4), 원래 데이터 변경/백필 금지 |
| 감사 changes.schemaVersion/id/entity_id/actor_id/request_id/JSON 원문 | UI 삭제 | 아니오 | 감사 원본은 DB에 불변 보존, 지원정보 복사에 requestId만, 삭제/수정 버튼 없음 |
| 감사 대상 링크 | 유지·정규 매핑 | 예 | guide→해당 프로젝트 guide 선택, locale→/admin/locales, monitoring 및 monitoring-records→/admin/monitoring/:id, 누락·legacy entity는 읽기 요약과 ‘대상 정보 없음’ |
| 감사 신규/상세 독립 route | 미제공 유지 | 아니오 | `/admin/audit-logs` 행 펼침으로 읽기, `/admin/audit-logs/:id` 404 유지 |

### 3.4 사유·보존·삭제의 내부 처리

운영 UI의 모든 강제 `reason` 입력, `hasReason`/`withReason`, ConfirmAction의 사유 선행 검사, 언어 목록·모달 중복 필드를 제거한다. 일반 저장은 확인 모달도 요구하지 않는다. 영향 있는 작업만 한 개 모달에서 대상명+결과+실행/취소를 보여준다. 선택 ‘메모 남기기’는 모달 안 접힘으로 제공하고 최대 400자, 어떤 작업에서도 메모는 필수가 아니다.

서버의 신규 `lib/server/admin/reason.ts`가 실제 action을 기준으로 reason을 정한다. 요청 `reason`은 선택(trim·공백→없음·최대 500자), 새 `note`는 선택(trim·최대 400자), 이미지 query에도 선택 note 추가. 우선순위는 유효한 구 reason → note 원문만 → **언어 중립 고정 표식 `@admin:auto:v1`**이다. reason/note 둘 다 있으면 기존 reason 우선, 사용자가 입력하지 않은 한국어 문장·`자동설명: 메모` 합성 저장 금지. NOT NULL·500자 제한 유지. 새 UI는 note를 적을 때만 전송한다.

감사 action/diff 설명과 자동 reason 표시는 action 코드 allowlist를 현재 ko/en/ja UI 언어로 번역한다. partner.create/update, project.archive/restore, user.suspend/restore/revoke, job.retry/cancel, monitoring.scan/archive/restore, translation.import/publish/unpublish, locale.create/update, bootstrap/bind/recover 및 admin.reauthenticate를 포함한다. 표식은 출력하지 않는다. 메모·legacy 자유 사유는 ‘메모/이전 사유’로 원문 보존한다. 구 시스템 reason은 **action+정확한 고정문구** 매칭일 때만 locale 설명으로 치환하며 본문 substring 추측이나 DB 백필 없음. 자동문구는 사용자가 작성한 사유로 표시하지 않는다. 일반 번역 저장과 파일 적용은 현행 `translation.import` action을 유지하고 둘 다 ‘번역 초안 저장’으로 설명한다. 파일 적용인지 판별하는 새 action/불필요한 schema 필드는 만들지 않는다. import-preview는 적용 감사로 가장하지 않는다.

contracts/admin.ts의 partner/locale/import, AdminService 인라인 user/project/monitoring/job/archive, ContentService publish/unpublish/import, images의 query/delete 스키마를 **함께** 바꾼다. DB 감사 reason NOT NULL, changes `{schemaVersion:1,fields}`, request_id와 transaction 원자성은 유지한다. 과거 감사는 수정하지 않는다. 기존 metadata schemaVersion, optimistic version, sourceRevision, ruleId, idempotencyKey, worker 및 비용 정책은 UI에서 숨겼다고 제거하지 않는다. 기존 고급 항목에 알려지지 않은 필드가 있으면 화면에 자동 출력하지 않는 명시적 allowlist 뷰를 쓴다. 기존 레코드의 값은 폼에서 접혀도 저장 payload에 보존하며 null·빈 문자열·없음의 의미를 혼동하지 않는다. 사용자 입력의 기술적 데이터가 보존을 위해 필요하면 서버 snapshot에서 재사용한다.

### 3.5 가이드 번역·파트너 원문 변경·alt 공개 정책 (R1-06, R1-14)

현재 guide localized_contents를 읽는 사용자 화면 소비처가 없다. 이번 최소 변경은 **가이드 번역 운영 UI 제거**다. 프로젝트 가이드 원문·규칙·근거 읽기와 redirect는 유지하고 translation-editor는 파트너에서만 연다. guide용 get/save/import/export/publish/unpublish API, localized_contents 행과 원문 sync, schema/ruleId 검증은 유지한다. 파일 UI에서는 partner만 가져오기/내보내기하고 guide 포함 파일은 preview/적용 전에 ‘가이드 번역은 이 화면에서 적용할 수 없습니다’로 차단한다(혼합 파일 부분 적용 없음). API 호환 integration은 guide를 계속 검증하되 존재하지 않는 공개 화면 효과를 T09 성공 기준으로 쓰지 않는다.

파트너 원문 변경 시 sourceRevision이 증가하고 이전 **게시 번역은 계속 공개**한다(현행 유지). 관리자 편집기에 needsUpdate를 표시하고 새 draft 저장은 최신 sourceRevision 요구, 게시도 저장된 draft revision 및 요청 revision이 최신 원문과 같아야 한다. 자동 게시중단·자동 재게시 없음. 따라서 변경 직후 기존 게시본이 보이는 것은 오류가 아니며, 최신 원문 확인→저장→게시 후 새 공개본으로 바뀐다. 게시 중단하면 기존 fallback chain으로 원문/다른 사용중 언어를 읽는다.

자동 imageAlt는 새 문자열을 DB에 넣지 않고 `publicPartner` 조회에서 선택한다. 공개 번역의 trim nonblank 사용자 alt → 원문의 trim nonblank 사용자 alt → **최종 공개 이름과 resolvedLocale에 맞는 ‘{name} 이미지’ 번역문구** 순서다. 빈 문자열/공백은 fallback을 타며 빈 alt 응답을 반환하지 않는다. ko 원문 행에는 빈값 자체를 보존하고 사용자 작성값은 그대로 반환, 자동 생성값을 저장하지 않아 이름 바뀜만으로 alt 문자열을 일괄 수정하지 않는다. 원문 name/description/ipNames/marketDescription/imageAlt의 실제 변경은 기존 sourceRevision 증가 정책, 번역 draft alt 변경은 번역 version 정책을 유지한다. 기존 ‘이름 이미지’로 이미 저장된 문자열은 사용자값과 구분 불가하므로 자동 재작성 안 함. 이미지가 없는 파트너에도 DTO alt의 동일 fallback 적용.

## 4. 대표 시나리오와 상태별 UX

| 시나리오 | 초보 운영자가 하는 순서 | 성공/결과 기준 | 오류·제약 처리 |
|---|---|---|---|
| 최초 운영 진입 | /admin → admin/admin1234 → 홈(15분 후에만 재확인) | 실제 서버 active admin, 아이디·암호 각 한 번, 프로필 setup 없음 | 틀린 암호·미등록·일반회원 동일 안전 오류, 다른 클라이언트 실패 누적이 정상 로그인을 잠그지 않음; 재확인 취소는 원래 입력 보존 |
| 사용자 지원 | 사용자 검색(이름/이메일) → 상세 → 이용 제한/해제 | 대상·영향 확인 한 번, 자동 감사와 서버 세션 회수, 결과 배지 갱신 | 자기 정지/회수·탈퇴·확인 미완료 복구는 설명, 권한 상실 즉시 중단 |
| 프로젝트 확인 | 프로젝트 검색 → 기본 정보 수정 → 가이드 원문 확인 → 자료/작업/변경 기록 | 프로젝트명/IP만 필수, 업무 가이드 차수·규칙 읽기와 관련 범위 유지 | 동시수정이면 입력 보존+변경 비교·최신 불러오기, 임의 덮어쓰기 금지 |
| 파트너 등록 | 이름 입력 → 비공개 저장 → 사진 선택·확인·추가 → 공개 | 최초 이름 한 개만 필수, 사진/공개 확인, public 목록 반영 | 타입/용량/개수 실패는 사진 오류, 등록 완료 후 사진 오류로 파트너 재생성 금지 |
| 번역 게시 | 파트너 → 언어 선택 → 원문 참고 입력 → 저장 → 게시 확인 | 파트너 source revision 유지, 사용중 en/ja 공개 결과·비활성 언어 공개되지 않음 확인 | 원문 갱신·version 충돌은 새 원문 확인, 저장 전 언어 전환은 이탈 확인, 미게시 언어는 원문 fallback |
| 언어 운영 | 언어 → 준비된 언어 추가 → 사용하기/사용 중단 | 언어 하나 선택·확인, 코드/방향/정렬 입력 없이 등록, ko 유지 | pack 미준비·fallback cycle·동시변경 서버 거절, 변경 후 현재 언어 비활성이면 ko fallback |
| 실패 처리 | 홈 실패 링크 → 작업 상세 → 다시 실행 또는 중단 | 사용량 영향 설명, 서버 canRetry/canCancel 준수, 새 작업 링크 | provider 미준비·비활성 소유자 불가, 중복 제출은 같은 실행 반환, ‘중단 요청’과 완료 구분 |
| 모니터링 확인 | 대상 → 원본·최근 결과 → 다시 확인 → 실행 기록 펼침 | 최초 key 보존, 공급자 실제 결과와 발견 링크, false-positive 정보 읽기전용 | provider 불가/원본 만료/빈 결과/부분 실패 각각 구분, mock 결과를 실결과로 표시 금지 |
| 변경 추적 | 변경 기록에서 관리자/대상명 검색 또는 사용자/대상 상세의 변경 기록 탭 → 기록 펼침 | 누가·언제·무엇·전후 값을 이해, 대상 이름 링크 | 대상 삭제·legacy 유형은 링크 깨짐 없이 설명, JSON/ID 이해 요구 없음 |
| 운영 암호 변경 | 상단 비밀번호 변경 → 현재/새/확인 → admin-sign-in으로 한 번 다시 로그인 | 별칭 유지, 모든 옛 세션 차단, bootstrap 재실행해도 새 암호 보존 | 불일치/길이/현재 암호 오류는 필드 안내, 메일 disabled 분실은 서버 명시 복구 명령; 실제 메일 전달은 이번 가용 기능 아님 |

다음 공통 상태 정책은 모든 목록·상세·신규·번역·언어 모달·재확인에 적용한다.

| 상태 | 확정 처리 |
|---|---|
| 로딩 | 제목·안내·skeleton/‘불러오는 중’, aria-busy/status, 완료 전 저장/위험작업 disabled. 오래된 조회 응답이 새 선택·새 언어 폼을 덮지 않음 |
| 빈 상태 | 데이터 없음/검색 결과 없음/권한 없음/원본 만료/아직 검사 안 함을 구분. 생성 가능한 파트너만 등록 CTA, 존재하지 않는 신규 route 링크 금지 |
| 성공 | ‘파트너를 저장했습니다’ 등 대상 행동 명시·aria-live, version baseline을 성공 응답으로 갱신, 신규는 실제 id 상세 route로 이동 |
| 필드 오류 | 입력을 보존하고 첫 잘못된 필드 focus, 한국어 등 현재 locale 이름/예시/길이 설명. fieldErrors raw key·INTERNAL_ERROR 출력 금지 |
| API/네트워크 오류 | 사용자 문장·지원정보 복사. 결과 불명은 자동 재전송 없이 4.1의 읽기/동일 키 확인. 자기 요청 성공 확인과 타인 변경 충돌을 구별; 409만으로 ‘다른 사람이 수정했습니다’라고 단정하지 않음 |
| 권한/세션 | 401 로그인, 403 안내+서비스 이동, ADMIN_REAUTH_REQUIRED만 재확인; 서버 거절을 빈 데이터나 무조건 성공으로 처리하지 않음 |
| 저장 중/중복 제출 | 화면/모달 저장 pending 하나, 버튼·Enter 중복 방지, 취소/뒤로가기 처리 일관. 위험작업 확인 당시 대상/version 유지 |
| 저장·이탈 | 프로젝트/파트너·파트너 번역·언어 모달 모두 baseline 대비 dirty. 앱이 제어하는 이동은 4.2 공용 가드; 브라우저 뒤로가기/종료에는 한계 명시. 성공 후 baseline 갱신·prompt 제거, 초안 저장 기능 추가 없음 |
| 개인정보·암호 폼 | 암호 localStorage/sessionStorage 저장 금지. 로그인·재확인 완료/취소 시 암호 state 폐기. 입력 복구는 현재 메모리만 사용 |
| 모바일/접근성 | 360/390px와 200% 확대, 메뉴 접힘·목록 카드 또는 의미 있는 가로스크롤, 핵심 이름/상태/액션 보이기, 44px 터치 목표, 모달 화면폭·높이 내 스크롤, 키보드 순서·focus trap/복귀·Esc 취소, form label/required/오류 연결 |
| 국제화 | ko/en/ja 전 화면·성공/오류/확인/필드명/자동사유 표시 mapping 검증, 단어 코드 fallback 금지. 지원하는 다른 pack도 동일 namespace/key/변수 수 충족. UI 언어와 콘텐츠 번역 대상은 독립 상태 |

### 4.1 mutation별 결과 불명·재시도 정책 (R1-12)

재확인/Origin/validation은 실행 전 거절과 네트워크 유실을 구분한다. 아래 규칙을 공용 pending 관리에서 적용하며 모든 mutation에 idempotency key가 있다는 포괄 약속은 하지 않는다. 폼 입력·대상·최초 version snapshot은 메모리에서만 유지, 불명 상태인 동안 편집/다른 mutation은 잠시 막고 ‘결과를 확인할 수 없습니다’와 다시 조회 제공. pending 종료·명시 새 시도 전까지 UUID를 새로 만들지 않는다.

| 분류 | 유실 응답 확인 수단 / 재전송 결정 | 성공·충돌 판단 |
|---|---|---|
| 파트너 신규 | 최초 저장 때 `creationKey` UUID와 정규화 전체 payload snapshot 생성. **새 P4 서버 생성 영수증**으로 같은 actor/key 재요청만 허용. 자동 재전송 없음, ‘저장 결과 확인’에서 같은 payload/key POST 명시 한 번 가능 | 트랜잭션 내 `(actor_id,creation_key)` unique 영수증의 payload_hash 비교. 같으면 같은 partner_id와 현재 version/sourceRevision 반환, create/syncOriginal/audit 반복 안 함. 다르면 IDEMPOTENCY_CONFLICT, 새 key 자동 생성 금지. 영수증 없으면 원래 key로 최초 생성; 서로 다른 key의 의도적 같은 이름 등록은 허용 |
| monitoring scan | 5절 key별 GET lookup으로 기존 job 확인; key/outputLocale/version 모두 고정. 실행 전 재확인 거절만 한 번 재개 | key 일치 job이 있어야 이 시도 완료, 없거나 lookup 실패면 불명/기존 미실행. 시간대/이름/최신 job만으로 판정 금지 |
| job.retry | 기존 작업 GET의 retryJobId와 child GET으로 확인, 응답 없을 때 자동 retry 없음 | 기존 retry child가 있으면 ‘재시도 작업이 있습니다’와 링크. 서버 retryLocked 재요청도 같은 child만 반환 |
| 번역 초안 저장/파일 적용 | 기존 get을 모든 대상·locale로 읽고 canonical content와 sourceRevision 비교(배열 순서 유지). 파일은 모든 entry 확인; import 자체가 원자적 | 모두 일치하면 ‘현재 저장된 내용이 입력과 같습니다’+dirty 해제/새 version. 실제 자기 요청 성공이라는 추측 없음. 불일치/일부 확인 불가면 입력 보존, 명시 비교·최신 불러오기; 자동 적용 없음 |
| 파트너 수정/보관, 프로젝트 수정/보관, 사용자 정지/복구, locale 수정/추가·활성, monitoring 보관, 번역 게시/중단, 이미지 제거, job cancel | 기존 상세/locale/번역 GET로 보낸 변경 필드와 관측 가능한 목표 상태 확인. cancel은 cancelRequested 또는 canceled; 게시/중단은 published 내용/상태; 신규 locale은 code와 설정 | 목표 일치이면 ‘현재 상태에 반영되어 있습니다’+baseline 갱신. 값 불일치면 전후 비교·최신 확인 후 새로운 명시 저장. 409/STATE_CONFLICT도 먼저 조회, 자기 요청 이미 성공할 수 있음 |
| 사용자 전체 세션 회수, 이미지 추가 | 기존 API만으로 특정 실행 완료를 정확히 증명할 수 없음(회수 여부는 상세 version만으로 불충분, 같은 이미지 여러 장 가능) | **불명 유지**, 성공 toast/자동 재전송 없음. 사용자 회수는 ‘이미 처리되었을 수 있습니다. 모든 기기 로그아웃을 다시 실행할까요?’ 명시 영향 확인 후 최신 version 새 시도. 이미지 추가는 최신 미리보기/개수 확인 안내 후 파일 재선택·명시 추가; hash/파일명으로 같은 실행 성공 단정 금지 |

**R2-04 기존 결정 유지:** 영수증은 응답유실 후 같은 actor/key/payload로 생성 결과를 확인하고 partner·ko 원문·감사의 중복 생성을 막는 데 필요하므로, 이름 중복을 허용하는 현재 정책에서 이름 검색만으로 대체하지 않는다. 파트너 생성에 한정한 기존 P4 범위를 유지하며 신규 mutation 설계로 확대하지 않는다.

새 `admin_partner_creation_receipts`는 actor_id FK→users, creation_key UUID, payload_hash, partner_id FK→partners, created_at 및 composite PK(actor_id,creation_key). actor/key advisory lock 후 영수증 확인·partner/ko 원문 생성·감사·영수증 저장을 같은 transaction으로 처리하며 rollback이면 모두 없음. hash는 default/trim/null 정규화한 실제 생성 필드와 선택 reason/note를 canonical 직렬화하여 계산, creationKey 제외. 응답 id/version/sourceRevision envelope는 기존과 동일. 기존 클라이언트 creationKey 생략은 허용하여 계약 호환, **새 UI는 항상 key 사용**; 생략 클라이언트까지 중복방지를 보장한다고 주장하지 않는다. 영수증은 해당 파트너가 유지되는 동안 삭제/TTL 만료하지 않으며 별도 전체 mutation 프레임워크로 확대하지 않는다. 세션 만료 시 UI snapshot 폐기(새 로그인 자동재실행 없음); 재로그인 후 신규 등록 전 목록 검색으로 기존 건 확인한다. 페이지 종료 뒤 자동 key 복원/정확한 미응답 판정은 제공하지 않는다.

### 4.2 이탈 유형별 수단·보장 수준 (R1-09, UI-03)

기존 detail-page의 a capture/confirm/beforeunload를 공용 guard로 옮겨 번역·언어모달에도 등록한다. Console은 폼을 버리는 path key 변경 **전에** 가드를 거친다. 독립 초안 저장/history 조작 기능은 추가하지 않는다. 설치 Next Link onNavigate는 same-origin SPA만 취소 가능함을 착수 시 다시 확인한다.

| 이탈 유형 | 구현 수단 | 관측 가능한 보장 / 한계 |
|---|---|---|
| 내부 Link·메뉴·목록·이름 링크 | 공용 Link `onNavigate.preventDefault()` 후 한 번 확인; 일반 same-tab a는 기존 capture preventDefault 활용 | 계속 편집이면 URL/폼/dirty 그대로, 버리기면 목적지 이동. 모든 admin 내부 Link를 가드 adapter로 통일, capture와 중복 confirm 금지 |
| 버튼 탭·콘텐츠 언어·모달 닫기·Esc·서비스 이동·비밀번호 변경·정상 로그아웃 | 공용 `confirmDiscard`를 상태 교체 또는 router/문서 이동/서버 sign-out **전에** 호출 | 취소 시 selection·payload·폼 유지, 허용 시 이동/닫기. 로그아웃 거절 시 서버 sign-out 호출 0회 |
| 프로그램적 push/replace·console replaceState | 공용 guardedNavigate 경유; 검색/page 변화로 폼이 교체될 때도 먼저 검사 | 미승인 폼 unmount 방지. 성공 저장/새 id 이동은 baseline 갱신 후 prompt 없음. 세션 만료/권한 상실의 인증 이동은 예외, 저장하지 않고 pending 폐기 |
| 새로고침·현재 탭 외부 이동·탭 닫기 | dirty 동안 beforeunload 등록, preventDefault와 호환 returnValue 사용; clean이면 해제 | 사용자 interaction이 있는 지원 브라우저에서 브라우저 기본 경고(문구는 브라우저가 결정). 모바일 강제종료/OS kill은 보장 불가, 초안 복원 없음 |
| 브라우저 뒤로/앞으로 | popstate에서 가능한 경우 확인 시도만, URL/history를 강제로 왕복시키는 sentinel 기법은 채택하지 않음 | App Router 취소 보장 불가. 취소해도 이미 route가 바뀌면 메모리 폼 소실 가능, 이를 T15의 허용 한계로 기록. ‘항상 보존’ 통과 조건 없음. 새로고침/뒤로가기용 초안 복원 없음 |
| 새 탭 열기·download | 현재 탭 폼을 버리지 않으므로 이탈 prompt 없음 | 기존 폼 유지; 새 탭에는 현재 초안을 복제하지 않음 |

## 5. 구현 단계·파일 범위·의존성·수용 기준

모든 단계가 이번 개편 출시의 필수 범위다. P1 로그인이나 목록 외 나머지 화면을 후속으로 미뤄 출시하지 않는다. 제품 구현은 별도 승인된 개발 작업에서 수행한다. 표의 새 파일은 아직 없는 예정 경로이며 실제 변경 목록이 아니다.

| 단계 / 요구 | 변경 파일 범위 | API·계약·DB 필요 여부 | 의존성·구체 수용 기준 | 필요한 향후 테스트 |
|---|---|---|---|---|
| P1 실제 관리자 인증·초기화·복구 (A01,A02,C01) | 새 `app/admin/login/page.tsx`, 새 `components/admin/login-form.tsx`, `app/admin/[[...path]]/page.tsx`, `app/login/page.tsx`, **`app/change-password/page.tsx`**, `components/domain/auth-flow-form.tsx`, `lib/server/auth/{http,service,policy}.ts`, `lib/server/admin/access.ts` 세션검증/감사 재사용, `lib/contracts/account.ts`, `lib/server/config/env.ts` 환경 변수 선언·관리자 전용 검증, 새 `lib/server/auth/admin-identity.ts`, 새 `deploy/remote/prepare-admin-auth-env.sh` 배포 secret 초기 생성·기존 값 유지, 새 `scripts/{bootstrap-admin,recover-admin-password}.ts`, `scripts/account.ts` 도움말, `package.json`, `db/schema.ts`·alias migration·journal, `messages/*/{auth,admin}.json`, **`deploy/remote/compose.yaml`, `deploy/README.md`, `scripts/README.md`, `db/README.md`**; `Dockerfile`은 현재 tools에 scripts/tsx가 있어 새 stage 불필요, tools copy 목록만 검증 | admin-sign-in 신규 action와 client 서명쿠키 정책, secret 누락/형식 오류는 이 action만 SERVICE_UNAVAILABLE 503; 일반 sign-in 계약 보존, change/reset nextStep만 서버 역할 분기. alias·표식 추가, 계정 생성/bind/복구는 명시 CLI; 기존 사용자 백필 없음 | **P1 첫 작업은 정적 `/admin/login` 최소 route를 추가한 뒤 T01의 빌드·실 HTTP로 optional catch-all보다 먼저 처리되는지 확인**하고 나머지 인증 구현을 진행한다(R2-06). 배포 secret 자동 준비 후 선행 DB migrate→seed→activate. T01~T05: 배포 admin/admin1234 단일 암호 입력·verified15분, 다른 클라이언트 실패에도 로그인, 반복 no-reset, secret 초기 자동 생성·재배포 기존 값 유지·누락503/일반로그인 유지, disabled 메일 복구, 일반 사용자 목적지 보존 | hash/alias/limit/return unit, 격리 DB 동시초기화·충돌·암호/복구·세션 integration, 실제 서버 로그인·역할 진입 e2e |
| P2 공통 UX·사유·pending·이탈 (U01,U02,Q01,C01) | `components/admin/{console,shared,list-page,detail-page,locale-editor,translation-editor}.tsx`, 새 `components/admin/unsaved-changes-guard.tsx`, 새 `lib/server/admin/reason.ts`, `lib/contracts/admin.ts`, `lib/server/admin/{service,images}.ts`, `lib/server/localized-contents/service.ts`, `lib/contracts/errors.ts`, `messages/*/{admin,auth,common}.json` | reason 선택/중립표식/메모, old reason 허용. 감사 DB 구조 불변. 4.1 mutation별 불명 상태 관리; Origin/access/version 유지 | P1. T06,T11,T15: 사유 필수 zero, auto locale 렌더, guard 유형별 결과·한계 준수, 실행 전 reauth 거절 한 번만 재개 | reason 경계 unit, old/new payload·감사 rollback integration, 재확인/불명/dirty/번역 언어·모달 e2e |
| P3 대시보드·사용자·프로젝트·가이드·자료·감사·검색 (U01,U03,U05) | `components/admin/{console,list-page,detail-page,shared}.tsx`, 새 `components/admin/record-summary.tsx`, **`lib/server/admin/{service,http}.ts`**, `lib/server/localized-contents/service.ts` 원문 조회, `lib/server/jobs/service.ts` canRetry 공유 predicate, `lib/contracts/admin.ts`, `app/admin/[[...path]]/page.tsx`, `messages/*/admin.json` | 기존 GET 표시 DTO/이름 join, **additive jobs `statuses/retryable`, audit `includeReads`**. 3.1 검색·탭과 홈 count 같은 predicate, guide 번역 UI 제거. 생성 프로젝트/가이드 POST 없음, DB schema 추가 없음 | P2. T07,T12,T17: 한글 사용자/프로젝트/대상 이름 검색·5상태·진행중 두 상태·조치가능 실패 count/링크·조회노이즈 기본 제외·가이드 원문/back | join/count/filter·scope·legacy 감사 integration, 전체탭/한글검색/URL 필터 e2e |
| P4 파트너 CRUD·이미지·신규 중복 방지 (U01,U04) | `components/admin/{detail-page,shared}.tsx`, 새 `components/admin/partner-form.tsx`, `lib/server/admin/{service,images}.ts`, **`lib/server/partners/service.ts`**, `lib/contracts/admin.ts`, **`db/schema.ts`·creation receipts migration·journal**, `messages/*/admin.json` | POST optional creationKey(UUID), 새 UI 필수 생성; actor/key lock+payload hash+receipt 원자성. 기존 PATCH/archive/image 보존. alt는 공개 DTO 조회 fallback, 기존 profile·sourceRevision 보존 | P2,P3. T08,T15: 최초 이름 한 개, 유실/동시 같은 key에도 partner/ko원문/create감사/영수증 각 1건, 다른 payload conflict, 접힌값·실이미지/공개/보관 정상 | receipt race/hash/rollback/legacy payload·alt integration, 생성 응답유실→같은 대상 확인·사진·공개 e2e |
| P5 파트너 번역·언어·작업·모니터링 완성 (U04,U05,U02) | `components/admin/{translation-editor,locale-editor,detail-page,list-page}.tsx`, `components/domain/monitoring-workspace.tsx` **admin 분기만** 표시 변경, 새 `lib/i18n/locale-catalog.ts`, `lib/server/admin/{service,http}.ts`, `lib/server/localized-contents/service.ts`, `lib/server/jobs/service.ts`, `lib/contracts/{admin,metadata}.ts`, `messages/*/{admin,monitoring,common}.json` | translation 기존 guide 포함 API 유지, UI partner만. locales availableCatalog, max+10/상한 거절. **GET scan attempt 조회** 추가, 기존 key replay는 권한/identity 확인 후 version/source 검사 전에 기존 job 반환; key/outputLocale/version snapshot. DB 추가 없음 | P2~P4. T09,T10,T13,T14: 기존 게시본 유지·최신 draft 재게시, 비활성 언어 준비 정책, scan 정확한 lookup·단일 job, source/provider unavailable 정직, 일반 사용자 표시 회귀 | import/guide API·locale cycle/upper bound·scan replay/current owner/access integration, admin/general ScanHistory ko/en/ja e2e, 실제 provider 격리검증 |
| P6 통합 수용·운영 전환 (모든 요구,D01) | 기존 `tests/unit/{auth-policy,auth-schema}.test.ts` 및 admin identity/reason, `tests/integration/{auth,admin,database}.test.ts` 및 bootstrap/receipt, `tests/e2e/{auth,admin}.spec.ts`, `tests/i18n`; **`tests/helpers/{auth-fixture,workspace-fixture}.ts`, `scripts/{phase12-migration-check,phase16-migration-check}.ts`, `scripts/backup-restore.py` 영향 대조**; 신규 운영 체크리스트 | 추가 제품 API 없음. 실제 최신 schema 테이블 명단/created_at 수 업데이트, FK fixture 정리, historical-prefix 검사는 고정 전제 보존, 백업 복구로 alias/receipt/표식 보존 확인 | P1~P5. T01~T18 결과를 실제로 기록한 후 출시 판단. 현재 계획 수정에서 이 테스트/스크립트는 실행·수정하지 않음 | package 실제 lint/typecheck/unit/integration/i18n/e2e/build 및 staging, empty/upgrade/replay/backup-restore; 필요한 실패 항목만 수정·재검증 |

### 표시 DTO·서버 경계의 구현 결정

사용자/프로젝트/작업/모니터링/감사 목록에 표시 이름이 필요하면 기존 GET 응답에 `ownerName`, `projectName`, `actorName`, `entityLabel` 등을 additive로 추가한다. 현재 lists.columns 문자열을 프런트 표시필드로 자동 재활용하지 않는다. enum·필드명 번역은 UI allowlist에 명시하고, 알 수 없는 legacy action/type는 ‘이전 운영 기록’ 같은 안전한 이름을 쓰며 원문 DB는 보존한다. 연결 정보가 없어도 ID를 대신 노출하지 않는다. names와 legacy entities의 조회는 요청별 제한된 join/batch로 처리하고 per-row N+1을 도입하지 않는다.

프로젝트 가이드 탭은 project ownership이 아닌 기존 AdminAccess의 관리자 접근을 유지하면서 가이드 규칙·evidence를 DTO로 읽는다. 가이드 번역 UI는 제거하되 API의 ruleId 원문 키·제목/설명 계약은 보존한다. `/admin/guides/:id` redirect에는 검증된 selected guide만 연결한다. 사용자 관련 목록의 ownerId, 프로젝트 jobs의 projectId, 각 history의 entityType/entityId는 UI 상태에서 scope로 별도 관리하여 검색/reset/페이지 이동이 범위를 지우지 않게 한다.

locale 카탈로그 추가 후보는 유효 deployed pack과 교집합만 제공한다. 화면에서 지원하지 않는 locale code를 입력받지 않는다. locale 생성/활성/비활성 서버 정책은 기존 advisory lock+version/fallback validation 유지, sortOrder는 같은 lock에서 max+10 산정, >10,000이면 무변경 STATE_CONFLICT. 다른 행/version/감사 재번호는 하지 않는다. 기존 PATCH의 전체 필드와 값을 보존하고 카탈로그 재적용으로 기존 운영 수정값을 덮지 않는다.

scan ‘같은 시도’는 확인 모달 실행부터 결과/명시 실패 확정까지다. 최초 `{key:UUID,outputLocale:실행 당시 UI locale,version:조회 snapshot}`를 메모리에 묶어 고정한다. UI 언어 변경·재확인·불명 응답에서 셋 중 하나만 새 값으로 교체하지 않는다. 실제 새 검사 확인에서만 새 UUID/locale/version을 만든다.

P5에 **`GET /api/admin/monitoring-records/:id/scans/attempt?key=<UUID>&outputLocale=<locale>`**를 추가한다. AdminAccess의 active/verified/admin+15분 확인 및 대상 row owner 조회 후, jobs의 `(owner_id,kind=monitoring,idempotency_key)`를 조회해 recordId/outputLocale가 snapshot과 같으면 `{job:JobDto}`, key 없음은 `{job:null}`. 다른 대상/locale 재사용은 IDEMPOTENCY_CONFLICT. 시간대·최신 실행 추측 판정 없음, 기술 key는 URL/API 내부에서만 사용. 읽기 감사 `admin.read`를 남기고 기본 변경 기록에서는 제외한다. provider/source unavailable·원본 version 갱신도 이미 존재하는 job 조회를 막지 않는다. 기존 scans pagination API는 그대로다.

AdminService scan POST도 같은 key existing-job 확인을 현재 **관리자 권한/재확인/대상 소유 관계 검사 후**, version/source/provider 검증 전에 수행한다. 기존 동일 job은 반환하되 추가 scan 감사·비용·job 생성 없음. key가 없을 때만 최초 version과 현재 version 비교 및 기존 source/owner-active/provider/scanAvailable 조건을 검사하고 실행한다. lookup null+version 동일이면 사용자가 같은 snapshot/key로 한 번 명시 재전송 가능; version 다르면 최신 상태를 비교하고 이전 시도 폐기→새 검사 영향 확인→새 snapshot/key, 자동 실행 없음. 불명 lookup 실패/null만으로 성공 toast 금지. 재확인 시 최초 payload로 한 번 재개, 이미 실행됐으면 기존 job 반환. jobs.retry는 기존 retryLocked child를 재사용하고 canRetry 서버 검사는 유지한다.

공용 `ScanHistory/ResultDetail`은 `viewMode="admin"`처럼 명시 admin 표시 분기를 받아 현재 path 기반 admin 권한/feedbackPath=null 처리를 유지한다. admin의 job.id 링크 텍스트는 ‘실행 작업 보기’; provider/engineVersion와 내부 source enum `s.name/i.source`는 안전한 번역 allowlist 이름, 미지원 source는 ‘기타 출처’. URL은 안전하게 그대로 읽기 가능. 비교요소/grade/feedback 설명은 유지, admin 피드백 mutation 버튼 없음. **일반 사용자 분기의 provider/engineVersion·출처·job 링크·report/withdraw 동작은 이번 개편으로 바꾸지 않는다**; T10/T17에서 두 view를 함께 검사한다.

### 기존 schema 검사·fixture·운영 스크립트 영향 (R1-16)

P1/P4 migration은 각각 alias와 receipt를 추가하므로 최신 전체 테이블 검사의 예상 명단은 20→22개다. `tests/integration/database.test.ts`의 created_at timestamp 수 17도 두 테이블의 실제 DDL에 맞춰 19로 검증한다(추정 통과 처리 금지). alias user FK와 receipt actor/partner FK는 ON DELETE CASCADE로 정하고, fixture는 여전히 부모 삭제 전 관련 감사·receipt·alias를 명시 정리해 각 테스트 재실행이 충돌하지 않게 한다. `tests/helpers/auth-fixture.ts`, workspace/partner fixture와 demo seed 재실행에서 기존 사용자·암호/alias 표식이 변경되지 않는지 대조한다.

phase12/phase16 migration scripts는 고정 과거 prefix와 기존 행 checksum 검사가 있어 ‘현재 22개’로 과거 schema 기대를 바꾸지 않는다. 최신 apply/empty/upgrade/replay에는 두 테이블 생성·기존 hash/게시 번역/version 무변경을 별도 assert한다. `backup-restore.py`는 전체 pg_dump/restore라 별도 명단 수정은 예상하지 않지만 격리 리허설에서 alias·receipt·표식 행 보존과 업로드 일치를 실제 확인한다. 영향이 없으면 해당 스크립트를 억지 수정하지 않고 근거를 P6 기록한다.

## 6. 향후 테스트·수용 기준 (아직 실행하지 않음)

| 테스트 ID | 통과 조건 / 필요한 증거 |
|---|---|
| T01 | **P1 첫 작업에서 정적 `/admin/login` 최소 route 추가→빌드→실 HTTP로 `/admin/login`은 로그인 페이지, `/admin`과 허용 상세는 catch-all 처리임을 확인한 후 나머지 인증 구현을 진행한다.** 이후 격리 빈 DB→migration→db:seed(ko/en/ja FK 행)→i18n:activate(유효 pack)→동일 릴리스 web/UI→tools 명시 bootstrap→admin/admin1234 한 번 입력→홈 API 200 및 신규 파트너 저장 성공. DB active/admin/verified/profile-complete·credential verify와 verifiedUntil 약 15분을 assert(암호/hash 로그 출력 금지). |
| T02 | 배포 준비에서 secret 누락 시 수동 비밀 입력 없이 유효한 32바이트 난수 값을 생성·보호된 env에 저장하고 web에 주입, 재배포/재시작은 기존 값을 그대로 유지하는지 확인(값 출력 없이 일치 검증); 기존 값 형식 오류는 값을 바꾸지 않고 배포 준비 실패로 보고. runtime secret 미설정/빈 값/형식 오류에서 admin-sign-in만 SERVICE_UNAVAILABLE 503·새 세션/쿠키 없음, 서버 기동·일반 로그인·기존 세션 유지; 올바른 값 주입 후 admin/admin1234 정상 로그인 확인. 별칭/이메일 admin-sign-in 같은 user_id·verified15분, 최초 재확인 모달 0회. client A의 잘못된 admin 로그인 11회 후 client B 정상 별칭/이메일 로그인 200, A도 요청량 100 미만의 정상 암호는 성공. 같은 A의 alias/email 실패 공유, admin 실패가 일반 sign-in 버킷에 영향 0. trusted IP 없음에서 서로 다른 cookie의 100회 한도 독립; IP 설정 시 서로 다른 IP 독립·위조 헤더 제외. 15분 만료 첫 GET에서 재확인, 잘못된 5회 후 6회 RATE_LIMITED, 취소/한 번 재개·일반 로그인 최초재확인 유지. |
| T03 | bootstrap 반복/동시·충돌 matrix, bind-email 정규화/불일치 검사. 정상 변경 후 already-configured가 새 hash·세션·initial_password_issued=false를 유지. created=true/bind=false 표식과 DML/감사 원자성. 정지/다른별칭/중복credential 무변경. |
| T04 | 관리자 change-password와 sandbox reset은 `/admin/login`, member 둘 다 `/login`, 쿠키 삭제/전세션·token 회수/별칭 유지·표식 false. admin 변경 취소는 `/admin`와 세션 유지. MAIL_ADAPTER=disabled에서 tools recover→새 암호 로그인 200→구 암호/구세션 거절, 미지정 stdin/email·member/정지/중복credential·감사 실패 rollback. sign-out 현재세션 삭제와 다른탭 다음요청 거절. active/verified/admin/자기정지/Origin 위조 직접HTTP 검사. |
| T05 | admin-sign-in next/back의 외부·//·역슬래시·CRLF·자기반복·위험 query는 `/admin`; 안전 deep link/query/back 유지. change-password/reset-password URL에 `next=https://example.test`, `next=//example.test`, `next=/admin/projects`를 넣어도 역할별 서버 nextStep 외로 이동 안 함. member 세션→/admin→로그인 폼→성공하면 이전 세션 행 제거/실패는 유지. 4가지 상태의 2.1 표 확인; 문서교체 후 이전 사용자 cache 없음. |
| T06 | 아래 검사 범위·금지 패턴으로 기본/추가설정/모달/열린 상세 DOM의 textContent와 접근성 이름·description을 검사, 의도적으로 데이터가 채워진 fixture 사용. UUID regex/raw JSON·기술 라벨 zero, reason required/빈 메모 제출 실패 zero. 신규 partner 이름만 제출, sort/order/pageSize 숫자 input zero. 업무상 ‘가이드 3차’는 허용. |
| T07 | users 기본+projects/jobs/monitoring/history, projects 기본+guides/assets/jobs/history, partners 기본+images/translations/history, jobs 기본/history, monitoring 기본/scans/history, locales/audit/overview route를 실 HTTP로 확인. 3.1 7 list API+locale 표 전부 검사: 한글 ‘김민수/봄 신상품/클랩스’ 이름 검색 결과·count, job 종류 ‘이미지 생성’은 종류 선택지로 generation 전송, queued/running fixture 둘 다 진행중에 포함, 5 사용자 상태 각 filter, 관련scope reset 보존. 감사 q 검색은 관리자 이름·대상 7종 대표 데이터로 실제 일치 집합과 페이지 결과/count의 일치를 integration에서 검증하고 데이터 규모·조건·응답시간을 관찰 기록한다(시간 SLO 신설 없음). 없는 신규/audit 상세 404와 guides redirect/back 유지. |
| T08 | partner 이름만 최소생성→수정→실파일 이미지 추가/제거→공개/비공개→보관/복원; 접힌값·사진·sourceRevision 보존. creationKey 생략 old client 호환 및 키 존재 new client 동시요청 2개에도 partner/ko원문/create감사/receipt 각 1개, 같은 key 다른 payload IDEMPOTENCY_CONFLICT·전체 rollback. alt 원문/게시 nonblank 보존, 빈/공백→공개명 resolvedLocale fallback으로 빈값 zero. |
| T09 | partner ko원문 읽기·en/ja 저장/게시/중단·fallback. 원문 수정 직후 이전 게시본 계속 공개/needsUpdate=true, stale draft 게시 VERSION_CONFLICT, 최신 원문 저장/게시 후 새 공개값. 비활성 deployed 언어는 ‘사용 중 아님’ 표시·준비 저장/게시 가능하되 공개 fallback 유지. guide 번역 버튼 없음·원문 읽기 유지, 기존 guide API get/save/import/export/publish/unpublish·ruleId 집합 호환(공개 효과 주장 없음). 파일UI partner만 preview/64KiB/100개/변경파일/스키마/version/원자성, guide 혼합파일 UI 적용 전 거절·DML 0. |
| T10 | 6 kind·5 status fixture의 작업 상세/retry/cancel/cost. scan 최초 key/outputLocale/version snapshot 후 locale 변경·15분 만료·응답유실·record version 변경에서도 정확한 attempt GET job과 단일 job·감사·비용, 다른 record/locale key 재사용 conflict, lookup null/실패 시 성공표시 없음. owner/source/provider 불가 검사. admin ScanHistory job 링크 이름·raw source enum/provider/engineVersion 숨김, 일반 사용자 기존 표시/feedback report/withdraw 유지. |
| T11 | old reason, 누락/공백 reason, note 각각 mutation 정상; 구 reason+note 우선순위/500·400 초과 거절. 자동 reason DB=`@admin:auto:v1`, note DB=원문만, en/ja UI 자동 설명은 해당 언어·한국어 메모는 원문, legacy 자유사유 보존·정확한 시스템 action/reason만 번역. 일반저장/파일 적용 둘 다 translation.import 설명 동일. schema/version/sourceRevision/ruleId/Origin/권한·실패 DML/감사 동시rollback. |
| T12 | 홈 retryable failed 수와 링크 목록 count 일치, retry child 생성 후 원래건 감소, retry불가 실패 제외·queued 링크 단일조건. 감사 기본에서 admin.read/translation.read/admin.reauthenticate 제외, includeReads=true에 나타남·DB 행 유지, en 자동설명/원문 메모, legacy/삭제 대상 safe label. cleanup 버튼 없음·guide 차수와 기술version 구별. |
| T13 | ko disable 금지·pack없는 enable 거절/기존 disable 정책·fallback cycle·이름 보존·카탈로그 선택, max=9990→신규10000 성공/max=9991→거절·기존행/version/감사 일괄변경 0. 동시 추가 order lock·PATCH conflict, 현재 locale 비활성 ko fallback·missing의 공개파트너 범위. |
| T14 | 실제 staging worker/provider/storage로 scan 성공/빈/부분실패/불가/원본삭제 확인, admin feedback 버튼 없음. 실제 제공자 검증 불가면 capability 불가·해당 항목 미검증; fixture/mock 통과와 실제 제공자 통과 별도. |
| T15 | 각 폼 4.2별 내부 Link/메뉴/버튼 탭/콘텐츠 언어/모달 Esc/서비스·암호 이동/로그아웃 취소는 URL·폼 보존·sign-out HTTP 0, 승인 이동/저장 baseline 갱신. Chromium interaction 후 refresh beforeunload 실제 dialog; 뒤로/앞으로는 popstate 확인 시도·route 이동 가능/초안 복원 없음을 기록(보존 pass 요구 없음). 서버 commit 후 응답을 끊는 fixture로 partner 재확인 같은 key→1건·이미 성공한 수정 GET→목표일치 안내(타인충돌 오안내 없음), revoke/image-add는 불명 안내·자동재전송 0. 401/403/reauth/409/500/timeout·중복Enter/Esc/focus·입력 보존 확인. |
| T16 | ko/en/ja·360/390/1280px·200% 확대(브라우저 zoom으로 실제 확인), 긴 일본어/이름/이메일/URL·칩·모달 화면내 scroll·44px 핵심action. Playwright getByRole/getByLabel로 로그인/reauth/partner/project/translation/locale 입력 accessible name, 오류 aria-describedby/invalid, tab 순서·modal trap/Esc/focus 복귀 확인; 실제 Chrome+NVDA 또는 Linux Firefox+Orca로 로그인→partner 저장→확인모달 한 흐름 낭독/오류연결 기록. 실제 reader 미실행은 미검증, DOM label 검사만으로 reader pass 주장 금지. |
| T17 | 기존 route/query q/page/pageSize/sort/order/status/kind/from/to/archived/back/tab/mode/entity와 추가 statuses/retryable/includeReads·attempt lookup 검증, guides redirect·locale/audit 이름 링크, API envelope/requestId 유지. ko/en/ja namespace/key/placeholder parity. 일반 로그인/partner 공개alt·ScanHistory/feedback 기능 회귀. UI 기술값 숨김은 일반 사용자 도메인 표시를 바꾸지 않음. |
| T18 | staging empty/upgrade/replay와 백업/빈타겟복구, alias/receipt/초기발급표식·구 hash·게시번역/업로드 보존, schema검사 22테이블/timestamps·fixture 2회재실행·historical scripts 전제 확인. tools bootstrap/bind/disabled 메일 recovery·실 admin 로그인/로그아웃·실데이터 대표시나리오·build/회귀 증거 기록. 아직 확인 안 한 값은 미검증, 현재 실제 메일은 disabled라고 기록. |

T06 검사 route는 `/admin`, `/admin/login`, `/admin/{users,projects,partners,jobs,monitoring,audit-logs,locales}`, 모든 지원 `/:id`, `/admin/partners/new`, 프로젝트 guides/assets 및 각 history/scans/translations 탭, 모든 확인/언어 모달이다. text/accessibility 금지 UUID는 `[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}`, 라벨/정적 설명 금지 패턴은 `schemaVersion|sourceRevision|source_revision|provider_request_id|engineVersion|idempotencyKey|creationKey|requestId|owner_id|entity_id|actor_id|retry_of_id|active_guide_id|cost_state|@admin:auto:v1`와 raw `JSON.stringify` 결과인 `{ "schemaVersion"... }`/객체 JSON 블록이다. status/kind raw enum은 각 생성된 라벨 allowlist와 비교. 사용자 메모·원문이 기술 단어를 실제 포함한 경우 데이터 자체를 검열하지 않으며 검사 fixture와 정적 UI 라벨을 분리한다. href/src/data attribute·API 내부 ID는 검사 대상 아님; 접근성 이름에는 raw 값이 없어야 한다. 업무 차수·공개 URL·사진 metadata 원본 보존은 별개다.

P1 첫 작업의 T01 route 빌드·실 HTTP 확인 이후 전체 회귀 실행 순서는 unit(사유·별칭·safe return) → 독립 테스트 DB integration → i18n → 인증·핵심 admin e2e → lint/typecheck/build → staging 실제 데이터 수용이다. 테스트 명령은 `package.json`의 `pnpm test:unit`, `pnpm test:integration`, `pnpm test:i18n`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`, `pnpm build`를 사용한다. 실제 제품 DB를 integration용으로 사용하거나 범용 seed를 현재 원본 DB에 실행하지 않는다. 테스트용 환경·메일·스토리지·DB가 없으면 실패/미검증으로 보고하고 완료로 바꾸지 않는다.

## 7. 호환·마이그레이션·되돌림·배포 전 체크

1. 개발 착수 직전 원본 미커밋 diff와 사용자 작업 소유권을 재확인한다. 전면 reset/clean·기존 문서 덮어쓰기 없이 변경 파일을 좁혀 리뷰하고 원본 소스 근거를 재대조한다.
2. DB는 P1 alias+초기발급표식, P4 partner creation receipts 두 additive migration으로 추가한다. 별칭 충돌·credential 중복·bootstrap 이메일 상태 사전 조회(해시 출력 없음)와 백업을 수행한다. 신규 계정 데이터는 명시 bootstrap 후에만 생긴다. 기존 사용자·감사·profile 데이터의 bulk backfill/삭제는 없다.
3. 배포 순서는 **migrate → db:seed → i18n:activate → 호환 서버 → 동일 릴리스 UI → 명시 tools bootstrap 또는 bind → 실제 수용**이다. 아래 tools 실행 절차를 운영 문서에 구현한다. 구 UI가 reason을 보내도 신 서버가 허용한다. 새 UI가 reason을 생략하므로 서버와 UI 버전을 섞은 배포는 금지한다. 배포 원자성 확보 또는 서버 선행 호환 구간을 사용한다.
4. route 이름·캐치올·API endpoint·query/back·guides redirect·i18n locale cookie와 preference는 유지한다. `/admin/login`만 추가하며 `/admin` 신규 로그인 redirect 대상이 바뀐다. 기존 `/login?next=/admin...`은 계속 동작한다. `/admin/guides/:id`는 project/guide 연결을 서버로 검사한다.
5. 되돌림은 UI+서버를 함께 이전 버전으로 복구한다. additive alias/receipt 테이블·표식/감사/생성계정은 **삭제하지 않고 유지**하여 이메일 로그인으로 복구한다. 신규 alias 로그인 기능은 이전 버전에 없으므로 운영자에게 bootstrap 이메일+현재 비밀번호 경로를 알려준다. rollback이 암호를 admin1234로 재설정하거나 admin role를 자동 회수하지 않는다. 필요한 계정 비활성화/별칭 해제는 독립 감사 운영명령으로 명시 수행한다. DB 복구는 백업 리허설 기준으로 별도 진행하고 운영 데이터 전체를 코드 rollback 때문에 되돌리지 않는다.
6. 릴리스 전 체크: T01~T18 증거, 정상 서버 로그인·role/verified/active/profile 검사, 실제 credential hash 검증, 충돌/재실행 안전성, 전 화면 사유·기술정보 제거, 번역/언어/가이드/작업/모니터링 필수범위 완료, API 권한/Origin/version 회귀, 관리자 암호 변경·메일 disabled 서버 분실복구·로그아웃, 실제 storage/worker/provider 준비 상태, 모바일/i18n·dirty guard, 데이터 보존 및 되돌림 리허설을 확인한다. 기능 미검증은 별도 상태로 기록하며 테스트 stub 성공을 실제 운영 완료로 쓰지 않는다.

### 7.1 tools 실행 위치·배포 선행 조건 (R1-03)

현재 web 이미지는 standalone이어서 scripts/tsx가 없다. 기존 Dockerfile **tools target**에는 scripts/lib/db/messages 및 pnpm/tsx가 있다. P1에 remote compose의 `admin-tools` one-shot profile(`profiles: [tools]`, tools target에서 만든 동일 릴리스 image, DB runtime 환경, restart=no)을 추가하고 db 건강 확인 후 명시 run으로만 사용한다. web/worker 시작 dependency에는 bootstrap/recover를 넣지 않는다. Dockerfile 새 stage 불필요, 빌드 배포에서 tools image tag를 동일 릴리스로 고정하고 package script까지 포함되는지 검사한다. `ADMIN_AUTH_CLIENT_SECRET`은 web 서버 env에만 지속 주입, bootstrap 암호는 지속 web env에 넣지 않는다.

**R2-02 배포 secret 준비:** P1의 새 `deploy/remote/prepare-admin-auth-env.sh`를 배포 시작 전 실행한다. 보호된 `deploy/remote/.env`에 값이 없거나 비어 있으면 암호학적 난수 32바이트를 base64url로 자동 생성해 저장(권한 0600)하고 `deploy/remote/compose.yaml`에서 web env로 주입한다. 운영자의 secret 수동 입력은 필요 없다. 기존 비어 있지 않은 값은 재배포/재시작에도 덮어쓰거나 회전하지 않고 형식만 검증한다; 형식 오류면 값을 유지한 채 준비 실패로 보고한다. 런타임에서 누락/형식 오류가 발견되면 2.1의 admin-sign-in 전용 503 정책을 따른다. 값은 출력·로그·소스에 남기지 않고, 검증은 `lib/server/config/env.ts`의 관리자 전용 함수 및 T02로 확인한다. 이 준비 절차와 누락 동작은 `deploy/README.md`에 기록한다.

**R2-03 운영 권고:** 신뢰 IP 미설정 또는 헤더 누락에서는 쿠키 삭제로 요청/실패 한도가 초기화되어 비밀번호 대입 억제를 보장할 수 없다. 프록시 배포는 프록시가 덮어쓰는 전용 헤더를 `AUTH_TRUSTED_IP_HEADER`에 지정하고 직접 web 접근을 차단하는 기존 신뢰 조건을 `deploy/README.md`에 권고한다. 임의 X-Forwarded-For는 신뢰하지 않는다. P1 리뷰는 이 운영 문구와 2.1의 cookie/IP 한계가 문서에 들어 있는지만 확인하며 추가 승인·상시 경고·신규 통제를 도입하지 않는다.

아래는 **구현 후 운영 문서에 넣을 절차 예시**, 이번에는 실행하지 않았다. 저장소 루트에서 보호된 `deploy/remote/.env`의 DB/APP_ORIGIN과 실제 이미지 tag를 준비한다. admin-tools 서비스 추가 후 다음 순서를 명시한다. 기존 migrate 서비스 default도 seed를 수행하지만 여기서는 단계를 분리하여 빈 DB FK 선행을 확실히 한다.

```sh
docker compose --env-file deploy/remote/.env -f deploy/remote/compose.yaml up -d --wait db
docker compose --env-file deploy/remote/.env -f deploy/remote/compose.yaml run --rm --no-deps -T admin-tools pnpm db:migrate
docker compose --env-file deploy/remote/.env -f deploy/remote/compose.yaml run --rm --no-deps -T admin-tools pnpm db:seed
docker compose --env-file deploy/remote/.env -f deploy/remote/compose.yaml run --rm --no-deps -T admin-tools pnpm i18n:activate
```

seed는 ko/en/ja를 onConflictDoNothing으로 등록하여 파트너 ko 원문 FK를 준비하고, activate는 검증된 pack/registry 초기 활성화이다. 기존 locale 운영값·기존 관리자 암호를 seed로 덮지 않는다. 이후 같은 릴리스 web/UI/worker를 시작·health 확인하고 tools에서 bootstrap한다. bootstrap shell은 `set -x` 없이 보호된 현재 터미널에서 `read -r ADMIN_BOOTSTRAP_EMAIL`, `read -rs ADMIN_BOOTSTRAP_PASSWORD`로 입력(신규 요구값은 admin1234), 두 변수를 export하고 run에 **이 두 env 이름만** `-e ADMIN_BOOTSTRAP_EMAIL -e ADMIN_BOOTSTRAP_PASSWORD`로 전달한다. 명령은 `docker compose --env-file deploy/remote/.env -f deploy/remote/compose.yaml run --rm --no-deps -T -e ADMIN_BOOTSTRAP_EMAIL -e ADMIN_BOOTSTRAP_PASSWORD admin-tools pnpm admin:bootstrap`; 성공/실패 뒤 모두 unset하도록 trap/cleanup을 운영 스크립트에 둔다. env 값은 command/history/출력에 넣지 않고 one-shot container는 --rm으로 제거. bind-existing는 같은 tools 실행에서 `pnpm admin:bootstrap --bind-existing <실제 이메일>`로 전환하며 암호 env는 필요 없다(신규 모드만 password 필수).

분실 복구는 같은 tools image에서 **`pnpm admin:recover-password --email <실제 이메일> --password-stdin`**으로 실행한다. 보호된 권한 0600 일회성 파일에 숨김 입력으로 받은 새 암호를 쓰고, `docker compose ... run --rm --no-deps -T admin-tools pnpm admin:recover-password --email <실제 이메일> --password-stdin < /secure/one-time-password`로 stdin 전달, 성공/실패 모두 파일 삭제. 예시의 이메일/보호 경로는 배포자가 실제 값으로 치환한다; 문서가 그대로 비밀번호를 shell 인자에 넣게 하지 않는다. 메일 도입을 선행조건으로 요구하지 않는다. T01은 이 순서로 **로그인과 파트너 최초 저장**까지 검증, T04는 disabled 메일 복구를 검증한다.

## 8. 구현 준비도와 리뷰 절차

이 문서는 로그인 별칭/초기 계정/충돌 정책, 각 입력의 유지·삭제·자동·고급 분류, 사유 중립 표식·locale 렌더, 검색/상태·조회노이즈, mutation별 불명 결과·creation receipt·scan snapshot, 유형별 이탈 한계, disabled 메일 복구·서버 역할 목적지, 신규 route 제공 여부, 관계 표시 DTO, 번역 파일 호환, 언어 카탈로그, 위험작업 확인, 이탈·모바일 처리, 단계와 수용 기준을 확정했다. 배포별 실제 이메일·서버 환경 변수·staging 접속 정보는 운영 입력이며(서명 secret은 7.1 자동 생성·유지) 개발자에게 정책 결정을 미루는 항목이 아니다. 현재 실제 DB·계정·외부 제공자·메일·실행 UI의 상태는 **아직 미검증**이고 개발/수용 단계에서 증거를 확보해야 한다.

1차 지적 R1-01~17·UI 보완 4건은 [독립 리뷰 2차](admin-simplification-review-round-2.md)에서 계획상 해소와 승인을 받았다. 그 보고서 4절의 비차단 R2-01~06만 이번 본문과 [수정 기록](admin-simplification-review-fixes.md) 하단에 반영했으며, reviewer가 재검토 불필요로 명시해 별도 전체 재검토를 요청하지 않는다. 남은 작업은 승인된 계획의 제품 구현 P1~P6 및 T01~T18 실행·증거 확보다. 계획 승인은 구현·DB 변경·배포 승인이나 기능 완료를 의미하지 않는다.
