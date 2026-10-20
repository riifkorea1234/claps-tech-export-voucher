# 어드민 전체 간소화 계획 — 독립 리뷰 1차

- 대상: `md/feat_plan/admin-simplification-plan.md` (312행, planner 초안)
- 기준 코드: `/mnt/f/claps-product` 현재 미커밋 상태 (reviewer worktree의 과거 코드는 판단 근거로 쓰지 않음)
- 작성일: 2026-10-09 (KST)
- 리뷰 방식: 계획 전문 정독 + 원본 소스 정적 대조. **테스트·서버·DB·seed는 실행하지 않았다.** 아래 판단은 모두 코드 읽기 근거다.

## 1. 판정

**수정 필요.** P0 2건, P1 9건, P2 6건.

계획의 뼈대는 타당하다. `admin` 리터럴을 이메일 필드에 억지로 넣지 않고 별도 식별자 입력과 서버 action으로 처리한 점, 계정을 하드코딩 우회가 아닌 실제 `users`/`auth_accounts` 행으로 만드는 점, 재실행 시 비밀번호를 되돌리지 않는 점, 화면·필드를 표로 전수 분류한 점은 요구에 맞는다.

막히는 지점은 두 갈래다.

1. **로그인이 실제 배포에서 유지되지 않는다.** 누구나 아는 `admin` 식별자에 현재 rate limit 구조를 그대로 얹으면 외부인이 요청 10번으로 관리자 로그인을 계속 잠글 수 있고(R1-01), 배포 기본값에서는 메일이 꺼져 있어 분실 복구 경로가 없다(R1-02).
2. **몇몇 "유지" 결정이 현재 서버로는 동작하지 않거나 효과가 없다.** 가이드 번역은 게시해도 읽는 곳이 없고(R1-06), 작업·감사 목록 검색은 UUID와 영문 코드만 검색하며(R1-07), 변경 기록은 조회 로그로 채워진다(R1-08).

## 2. 확인되어 수정이 필요 없는 항목

| 검토 항목 | 확인 내용 | 근거 |
|---|---|---|
| `admin` 리터럴과 이메일 형식 제한 | 기존 폼은 `type="email"`, 서버는 `emailSchema`라 `admin`이 막힌다. 계획은 새 화면(text 입력)과 새 action `{identifier,password}`로 분리해 우회 없이 해결한다 | `components/domain/auth-flow-form.tsx:48`, `lib/server/auth/policy.ts:6`, `lib/server/auth/http.ts:38-40` / 계획 2.1 |
| `admin1234` 길이 정책 | 9자라 `passwordSchema`(8~128)를 로그인·재확인·비밀번호 변경 모두에서 통과한다 | `lib/server/auth/policy.ts:7`, `lib/server/admin/access.ts:49` |
| 하드코딩·로컬 전용 금지 | 프런트 문자열 비교·가짜 쿠키 금지, 실제 hash/verify 재사용, 운영 배포 지원을 명시 | 계획 2.1, 2.2 |
| 해시·role·active·verified·프로필 | 신규 계정 필드 값이 표로 확정됨. `status='active'`+`profile_completed_at`이 있어 `/profile-setup`으로 빠지지 않는다 | `lib/server/auth/service.ts:67`, `db/schema.ts:15-28` / 계획 2.2 |
| 비밀번호 변경 후 bootstrap 재실행 | already-configured는 무변경, 현재 비밀번호 보존 | 계획 2.2 충돌표, T03 |
| 범용 seed 재실행 | `db:seed`는 locale 3행을 `onConflictDoNothing`으로만 넣어 계정에 영향이 없다. 계획도 계정 생성을 seed에 섞지 않는다 | `lib/server/db/seed.ts:6-12` |
| 변경 후 전 세션 회수 | 기존 `changePassword`가 세션·토큰을 지운다 | `lib/server/auth/service.ts:165-174` |
| 필수 사유 제거 범위 | `reasonSchema`가 쓰이는 계약·서비스·이미지·번역을 "함께" 바꾼다고 명시했고 실제 사용처와 일치한다 | `lib/contracts/admin.ts:10,41,54,73`, `lib/server/admin/service.ts:301,356,418,551,582`, `lib/server/admin/images.ts:14,153`, `lib/server/localized-contents/service.ts:243,279` / 계획 3.4 |
| 스캔 idempotency 결함 인지 | 현재 UI는 실행 때마다 새 UUID를 만들어 재확인 후 재실행 시 키가 바뀐다. 계획이 최초 키 고정으로 바로잡는다 | `components/admin/detail-page.tsx:461`, `components/admin/console.tsx:134-136` / 계획 5 |
| 파트너 번역 fallback | 공개 조회가 fallback chain을 따라 원문으로 내려간다. 계획은 이 경로를 건드리지 않는다 | `lib/server/partners/service.ts:15-22` |
| 언어팩 parity | 키 수·변수가 ko와 다르면 그 언어가 통째로 사용 불가가 된다. 계획이 T17에 parity를 넣었다 | `lib/i18n/packs.ts:31-40` |
| 근거 인덱스 정확성 | S01~S04, S11~S13의 파일:행을 표본 대조했고 설명과 일치했다 | 계획 1 근거 인덱스 |
| 단계 완결성 | 모든 화면이 P1~P6에 배정되고 "후속으로 미루지 않는다"고 명시 | 계획 5 |

## 3. 발견 사항

### P0 — 이대로 구현하면 핵심 요구가 깨진다

#### R1-01 `admin` 별칭 도입으로 누구나 관리자 로그인을 잠글 수 있다

- **영향**: 외부인이 `admin`에 틀린 비밀번호를 15분마다 10번 보내면 정상 운영자도 `RATE_LIMITED`가 된다. 계획이 "별칭/이메일이 같은 계정이면 같은 rate-limit identity"로 정해 이메일 로그인까지 같이 잠긴다. 반대로 한도 안에서는 누구나 아는 `admin`/`admin1234` 조합을 공개 인터넷에서 그대로 시도할 수 있는데, 변경 유도 장치가 없다.
- **근거**:
  - 식별자 한도는 성공·실패 구분 없이 시도마다 증가하고 초과 시 전원 거절: `lib/server/auth/service.ts:27-33`, `lib/server/auth/http.ts:40`
  - 배포 기본값에서 `AUTH_TRUSTED_IP_HEADER`가 비어 IP가 전부 `"unknown"` 한 버킷(action당 100회/15분)이 된다: `lib/server/auth/http.ts:28-29`, `deploy/remote/compose.yaml:10`
  - 계획 2.1 "IP 한도와 Origin 검사는 기존 정책 그대로", 2.3 "강제 첫 변경으로 최초 로그인 요구를 무효화하지 않는다"
- **planner가 고칠 결정**:
  1. 2.1에 admin-sign-in 전용 제한 정책을 확정한다. 최소한 "식별자 단독 누적으로 정상 사용자를 잠그지 않는다"를 만족해야 한다(예: 실패만 집계, 식별자+클라이언트 조합 키, 점증 지연 중 택일하고 이유 기재).
  2. `AUTH_TRUSTED_IP_HEADER` 미설정 배포에서의 동작을 명시한다(설정을 출시 조건으로 둘지, 미설정 시 대체 키를 쓸지).
  3. 초기 비밀번호 사용 중임을 서버가 아는 방법과 UI 조치를 정한다. 비밀번호 비교가 아니라 별칭 행의 표식(bootstrap 시 설정, 변경·reset 시 해제) 같은 방식이어야 한다. 강제 변경을 하지 않는다면 "닫을 수 없는 변경 권고 배너"와 사용자의 위험 수용을 명시 결정으로 적는다.
- **통과 기준**: 틀린 비밀번호 N회 후에도 올바른 자격 증명의 로그인이 가능한 조건이 문장으로 정의되고, T02에 "제3자 실패 누적 후 정상 로그인" 케이스가 있다. 초기 비밀번호 상태의 감지·표시·해제 조건이 표에 있다.

#### R1-02 관리자 비밀번호 분실 시 복구 경로가 닫혀 있지 않다

- **영향**: 유일한 관리자가 비밀번호를 잊으면 로그인할 방법이 없다. 계획은 메일 복구를 유일한 경로로 두고 "준비되지 않으면 출시 체크를 통과시키지 않는다"고만 적었는데, 현재 코드에는 실제 메일 발송 구현이 없다. 즉 필수 항목이 범위 밖 미정으로 밀려 있다.
- **근거**:
  - `authService()`가 `sandboxMail`을 고정 주입: `lib/server/auth/service.ts:208-212`
  - sandbox가 아니면 `SERVICE_UNAVAILABLE`: `lib/server/mail/sandbox.ts:11`
  - 배포 기본 `MAIL_ADAPTER=disabled`: `deploy/remote/compose.yaml:8,68`
  - 계획 2.3 분실 복구 항, 2.2 "초기값으로 다시 reset하지 않음", 7.5 "rollback이 암호를 재설정하지 않는다"
- **planner가 고칠 결정**: 메일에 의존하지 않는 복구 절차를 이번 P1 범위에 넣는다. 예: 서버 운영자만 실행하는 명시 명령(`admin:bootstrap`과 분리된 reset 하위 명령)으로 새 비밀번호 설정 + 전 세션 회수 + system actor 감사. 이 명령이 재실행 no-reset 원칙과 충돌하지 않도록 "자동 실행 금지, 명시 인자 필수"를 적는다. 메일 복구는 "운영 메일 어댑터가 생기면 추가로 동작"하는 보조 경로로 내린다.
- **통과 기준**: 메일이 꺼진 배포에서 분실→복구→새 비밀번호 로그인→구 세션 거절이 T04로 검증 가능하고, 해당 파일(`scripts/…`, `lib/server/auth/service.ts`)이 P1 변경 범위에 있다.

### P1 — 구현 착수 전에 결정이 필요하다

#### R1-03 bootstrap 명령의 실제 실행 위치와 선행 조건이 빠졌다

- **영향**: 운영 web 이미지는 Next standalone이라 `scripts/`와 `tsx`가 없다. `pnpm admin:bootstrap`은 tools 계열 이미지에서만 돌 수 있는데 계획에 이 내용과 환경 변수 전달 방법이 없다. 또 T01은 "migration→bootstrap→로그인"인데, locale 행이 없으면 파트너 생성이 FK 위반으로 실패한다.
- **근거**:
  - web 단계는 `.next/standalone`·`messages`만 복사, scripts는 `tools` 단계에만 있음: `Dockerfile:14-23,25-34`
  - 배포는 `pnpm db:migrate && pnpm db:seed`만 실행: `deploy/remote/compose.yaml:33-36`
  - 파트너 저장 시 `localized_contents`에 `locale_code='ko'` 삽입, FK는 `locales.code`: `lib/server/localized-contents/service.ts:84-88`, `db/schema.ts:118`
  - locale은 seed에서 `enabled:false`로 들어가고 `i18n:activate`가 별도: `lib/server/db/seed.ts:8-10`, `scripts/activate-locales.ts`
  - 계획 5 P1 파일 범위, 6 T01, 7.3 배포 순서
- **planner가 고칠 결정**: 7.3 순서를 `migrate → db:seed → i18n:activate → 서버 → UI → bootstrap`으로 고치고, bootstrap을 어느 compose 서비스/이미지에서 어떤 방식으로 실행하는지(일회성 실행, env 주입 경로, 실행 후 env 제거 여부) 적는다. P1 파일 범위에 `Dockerfile`(필요 시), `deploy/remote/compose.yaml`, `deploy/README.md`, `scripts/README.md`, `db/README.md`를 추가한다.
- **통과 기준**: T01 절차를 문서만 보고 빈 DB에서 따라 하면 로그인과 파트너 최초 저장까지 성공한다.

#### R1-04 로그인 직후 같은 비밀번호를 한 번 더 요구한다

- **영향**: 초보 운영자가 `admin/admin1234`를 넣자마자 "비밀번호를 다시 확인해 주세요" 모달을 만난다. 새 세션은 `admin_verified_until`이 비어 있고 모든 admin API가 GET 포함 재확인을 요구하기 때문이다. 이번 개편의 목적과 정면으로 어긋나는 첫인상이다.
- **근거**: `lib/server/auth/service.ts:66`(세션 생성 시 미설정), `lib/server/admin/http.ts:25`, `lib/server/admin/access.ts:40-44` / 계획 2.3 첫 항 "다시 한 번 현재 비밀번호를 입력한다", 4 "최초 운영 진입"
- **planner가 고칠 결정**: admin-sign-in이 방금 같은 요청에서 비밀번호를 검증했으므로, 그 세션에 한해 `admin_verified_until = now()+15분`을 함께 설정하고 `admin.reauthenticate`와 동등한 감사를 남기는 안을 권고한다. 이는 15분 창을 늘리거나 우회하는 것이 아니다. 채택하지 않는다면 이유와 함께 이중 입력을 명시 수용으로 적는다. 일반 `/login` 이메일 경로에 같은 처리를 할지도 정한다(권고: 하지 않음 — 일반 사용자 로그인 계약 변경 회피).
- **통과 기준**: 4절 시나리오의 입력 횟수가 결정과 일치하고, T02에 "로그인 15분 후 재확인 요구, 5회 제한 유지"가 남아 있다.

#### R1-05 일반 회원 세션이 있는 브라우저에서 `/admin`이 막다른 404다

- **영향**: 일반 계정으로 로그인된 상태에서 `/admin`에 가면 로그인 화면이 아니라 404가 뜬다. 계획은 `/admin/login`에 "관리자 계정으로 로그인해야 합니다" 안내를 두지만 미로그인만 그리로 보내므로 이 안내에 도달할 길이 없다. 같은 절에서 "일반 회원의 next=/admin은 서버 권한 거절 그대로"라고도 적어 서로 어긋난다.
- **근거**: `app/admin/[[...path]]/page.tsx:13-17` / 계획 2.1 첫째·셋째 항
- **planner가 고칠 결정**: 비관리자 세션의 `/admin/*` 접근을 `/admin/login?next=…`으로 보낼지 404를 유지할지 하나로 정한다. 전자라면 admin-sign-in 성공 시 기존 쿠키의 세션 행을 삭제할지도 정한다(현재 sign-in은 쿠키만 덮고 이전 세션 행을 남긴다: `lib/server/auth/http.ts:43-44`).
- **통과 기준**: 미로그인/일반 회원/정지 관리자/정상 관리자 4가지에 대한 `/admin`과 `/admin/login` 동작표가 2.1에 있다.

#### R1-06 가이드 번역은 게시해도 반영되는 화면이 없다

- **영향**: 계획은 가이드 번역 저장·게시를 기본 노출로 유지하고 "해당 언어 공개 결과 확인"을 성공 기준으로 둔다. 그런데 `localized_contents`의 guide 행을 읽는 사용자 화면 코드가 없다. 운영자가 번역을 게시해도 아무 변화가 없는 기능을 "핵심 동작"으로 남기게 된다.
- **근거**: `localized_contents` 참조는 `lib/server/admin/service.ts`, `lib/server/localized-contents/service.ts`, `lib/server/partners/service.ts`(파트너만, `resource_type='partner'` 14행), `lib/server/demo/seed.ts`뿐이다 / 계획 3.3 "가이드 번역 rules.title/description 유지·기본 노출", 4 "번역 게시", T09
- **planner가 고칠 결정**: 셋 중 하나를 택한다. (a) 이번 범위에서 사용자 화면이 게시된 가이드 번역을 fallback과 함께 읽도록 한다 — 파일·단계·수용 기준 추가. (b) 가이드 번역 UI를 운영 화면에서 제거하고 데이터·API는 보존한다. (c) 유지하되 "현재 서비스 화면에는 표시되지 않습니다"를 화면에 밝힌다. 초보 운영자 기준으로는 (b)를 권고한다.
- **통과 기준**: T09의 가이드 번역 항목이 택한 안과 일치하고, 검증 불가능한 "공개 결과 확인" 문구가 남지 않는다.

#### R1-07 목록 검색·상태 탭이 현재 서버 의미와 맞지 않는다

- **영향**:
  - 작업 목록 `q`는 `kind`, `status`, `owner_id` 원문만 검색한다. 화면에 한글 종류명을 보여 주면 "이미지 생성"으로 검색해도 0건이다. 모니터링은 대상명+owner UUID, 감사는 `action`+`entity_id`만 검색한다.
  - UUID 입력을 없애면 4절 "변경 기록 → 사용자/대상 필터"를 수행할 방법이 없다. 이름으로 고르는 수단이 계획에 없다.
  - "진행 중" 탭은 queued+running인데 서버는 `status` 단일 일치만 지원한다.
- **근거**: `lib/server/admin/service.ts:50,61,67,98-115` / 계획 3.1 "모든 목록 q 유지", "상태 간단 탭", "ownerId… raw 입력 삭제", 4 "변경 추적", 5 표시 DTO 절(검색 언급 없음)
- **planner가 고칠 결정**: 목록별로 `q`가 무엇을 찾는지 표로 확정한다(예: 작업=소유자 이름·이메일·프로젝트명 join, 감사=관리자 이름·대상명). 의미를 만들 수 없는 목록은 검색을 빼고 필터만 둔다. 감사의 사용자/대상 필터는 "사용자·대상 상세의 변경 기록 탭 진입"으로 한정할지, 이름 선택기를 추가할지 정한다. 다중 상태는 서버 additive 파라미터로 할지 탭을 단일 상태로 쪼갤지 정하고 P3/P5 API 변경 칸에 적는다.
- **통과 기준**: 목록 7종 각각에 "검색 대상 / 기본 탭과 서버 파라미터 매핑"이 있고, T07에 한글 검색어 케이스가 있다.

#### R1-08 변경 기록이 조회 로그로 덮이고, 자동 사유의 저장 형식이 표시 요구와 충돌한다

- **영향**:
  - 상세·번역 편집기·모니터링 이력을 열 때마다, 그리고 15분마다 재확인할 때마다 감사 행이 생긴다. "누가 무엇을 바꿨는지"를 보려는 초보 운영자에게 목록 대부분이 "관리자 조회"다. 계획은 legacy 처리만 다루고 이 상시 생성 유형의 기본 표시를 정하지 않았다.
  - 자동 사유를 한국어 문자열로 저장하고 메모가 있으면 `자동설명: 메모`로 합친다. 저장 후에는 둘을 분리할 수 없어 en/ja 화면에서 한국어가 섞이고, "메모는 원문 표시"도 지킬 수 없다. 기존 시스템 사유는 영어 고정이라 세 언어가 섞인다.
- **근거**: `lib/server/admin/service.ts:249-256,282-289`, `lib/server/localized-contents/service.ts:113-120`, `lib/server/admin/access.ts:57`, `lib/server/auth/service.ts:190` / 계획 3.3 감사 행들, 3.4 둘째 문단
- **planner가 고칠 결정**: (1) 변경 기록 기본 목록에서 `*.read`·`admin.reauthenticate`를 제외하고 "조회 기록 포함" 고급 필터로만 보이게 할지 정한다(서버 필터 파라미터가 필요하면 API 칸에 추가). (2) 화면 문구는 항상 `action` 코드에서 현재 언어로 생성하고, `reason` 열에는 메모가 있으면 메모만, 없으면 언어 중립 고정 표식을 저장하는 방식을 권고한다. NOT NULL은 유지된다. 구 클라이언트의 reason 우선 규칙은 그대로 둘 수 있다.
- **통과 기준**: 감사 기본 목록의 포함/제외 action 목록이 있고, T11·T12에 "en UI에서 자동 사유가 영어로, 메모는 원문 그대로" 케이스가 있다.

#### R1-09 저장 전 이탈 보호의 구현 방법과 한계가 정해지지 않았다

- **영향**: 계획은 탭·메뉴 이동·뒤로가기·새로고침·로그아웃 모두에서 확인을 약속하고 T15가 이를 요구한다. App Router에는 범용 이동 차단 API가 없다. `<Link>` 이동은 `onNavigate`로 막을 수 있지만 브라우저 뒤로가기는 취소가 불가능해 history 조작이 필요하고, 실패하면 수용 기준을 못 맞춘다. 또 경로가 바뀌면 콘솔이 통째로 다시 마운트되어 폼 상태가 사라진다.
- **근거**: `node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md:453-490`(`onNavigate`), `app/admin/[[...path]]/page.tsx:47-48`(`key={path.join("/")}`), `components/admin/console.tsx:169-175`(replaceState 사용) / 계획 4 "저장·이탈" 행, 5 P2 `unsaved-changes-guard.tsx`, T15
- **planner가 고칠 결정**: 이탈 유형별 수단을 표로 적는다 — 내부 Link/메뉴(`onNavigate`), 프로그램적 이동(공용 가드 함수 경유), 새로고침·탭 닫기(`beforeunload`), 뒤로가기(채택 기법과 "보장 수준"). 뒤로가기를 확실히 막을 수 없다면 약속을 "확인 시도, 실패 시 초안 복원 없음"으로 낮추고 T15를 맞춘다. 착수 시 설치된 Next 문서 재확인도 명시한다.
- **통과 기준**: T15의 이탈 항목이 유형별로 관측 가능한 기대 결과를 갖는다.

#### R1-10 비밀번호 변경 후 `/admin/login` 복귀에 필요한 계약 결정이 없다

- **영향**: 계획은 `/change-password?next=/admin`으로 들어가 성공 시 `/admin/login`으로 문서 교체한다고 적었다. 현재는 서버가 `nextStep:"/login"`을 돌려주고 폼이 그대로 따라가며, `next`는 lookup·sign-in에서만 읽는다. 페이지도 `next`를 받지 않는다. 어느 쪽(서버 응답, 클라이언트 `next`)을 바꿀지, `next`를 어떤 규칙으로 검증할지가 없어 구현자마다 달라지고 open redirect 검증(T05) 대상에서도 빠진다. reset 후 목적지와, 변경 화면에서 관리자로 돌아가는 취소 링크(현재는 `/login`으로 가는 링크뿐)도 미정이다.
- **근거**: `lib/server/auth/service.ts:114,173`, `lib/server/auth/http.ts:55-60`, `components/domain/auth-flow-form.tsx:34-39,54`, `app/change-password/page.tsx` / 계획 2.3 넷째·다섯째 항, 5 P1 파일 범위(`app/change-password/page.tsx` 없음)
- **planner가 고칠 결정**: (1) 목적지 결정 주체를 하나로 정한다. 권고: 서버가 세션 사용자의 역할을 보고 admin이면 `/admin/login`, 아니면 기존 `/login`을 `nextStep`으로 반환 — 클라이언트 `next` 신뢰가 필요 없고 일반 사용자 계약이 그대로다. (2) reset-password 후 목적지도 같은 규칙인지 적는다. (3) 변경 화면의 취소/돌아가기 동작을 적는다. (4) 필요한 파일을 P1 범위에 추가한다.
- **통과 기준**: 2.3에 "누가 목적지를 정하는가"가 한 문장으로 있고, T04에 관리자/일반 사용자 각각의 변경 후 목적지, T05에 change-password `next` 조작 케이스(채택 시)가 있다.

#### R1-12 "모든 mutation의 payload·idempotency key 보존, 결과 불명 시 조회 확인"은 현재 API로 성립하지 않는다

- **영향**: idempotency key를 받는 admin mutation은 모니터링 스캔 하나뿐이다. 나머지는 key도, 결과 조회 수단도 없다. 계획의 포괄 약속을 그대로 구현 기준으로 삼으면 (a) 파트너 신규는 응답 유실 후 재시도 시 **중복 생성**되고, (b) 그 외 대부분은 재시도가 409로 떨어지는데 UI가 이를 "다른 사람이 수정했습니다"로 잘못 안내한다.
- **근거** (응답 유실 후 같은 payload 재전송 시 동작):

  | mutation | 재전송 결과 | 근거 |
  |---|---|---|
  | 모니터링 scan | 같은 key면 기존 job 반환. 단 그 전에 version 검사 | `lib/server/monitoring/service.ts:76-77`, `lib/server/admin/service.ts:324` |
  | 작업 retry | 기존 재시도 작업 반환(안전) | `lib/server/jobs/service.ts:81-83` |
  | 번역 저장(import) | 내용이 같으면 변경 없음 반환(안전) | `lib/server/localized-contents/service.ts:162-176` |
  | 파트너 신규 | **새 UUID로 또 생성** | `lib/server/admin/service.ts:474,499-503` |
  | 파트너 수정·보관, 프로젝트, 사용자, 이미지 추가·제거, 번역 게시·중단, 언어 수정 | `VERSION_CONFLICT`(중복은 없음, 실제로는 성공한 상태) | `service.ts:366,430,470,559,663`, `images.ts:59,108,163`, `localized-contents/service.ts:258,294-298` |
  | 언어 추가 | `VERSION_CONFLICT`(이미 존재) | `service.ts:661-665` |
  | 작업 cancel | `STATE_CONFLICT` | `service.ts:606-617` |

  계획 2.3 둘째 항 "원래 mutation payload와 idempotency key를 보존", 4 "API/네트워크 오류" 행
- **planner가 고칠 결정**: 포괄 문장을 위 분류에 맞는 규칙으로 바꾼다. 권고: (1) 재확인으로 인한 재실행은 서버가 실행 전에 거절한 것이므로 같은 payload 1회 재실행 — 전 mutation 공통. (2) 네트워크 결과 불명은 자동 재전송하지 않고 최신 상태를 다시 읽어 보여 준 뒤 사용자가 판단. (3) 재조회 결과가 보낸 값과 같으면 "저장되었습니다"로 처리해 409 오안내를 피한다. (4) 파트너 신규는 중복 방지 수단을 정한다(자동 재시도 금지+이름 검색 안내, 또는 클라이언트 생성 키 도입 — 후자는 API·계약 변경으로 P4에 기재). 아울러 일반 번역 저장과 파일 적용이 둘 다 `translation.import`로 기록되므로 감사에서 구분할지(action 추가 또는 같은 문구) 정한다.
- **통과 기준**: 4절 오류 행이 mutation 분류별 처리로 바뀌고, T15에 "응답 유실 후 파트너 신규가 2건 생기지 않음", "이미 성공한 수정의 재전송이 충돌 안내로 끝나지 않음" 케이스가 있다.

### P2 — 비차단, 다음 수정 때 함께 정리 권고

| ID | 내용 | 근거 | 권고 문장/결정 |
|---|---|---|---|
| R1-11 | 스캔 재시도 시 `outputLocale`이 최초와 다르면 `IDEMPOTENCY_CONFLICT`. 계획은 "현재 UI 언어"라 재시도 사이 언어를 바꾸면 깨진다. version 충돌 후 "조회로 기존 결과 확인"의 판정 규칙도 없다 | `lib/server/monitoring/service.ts:76-77`, `lib/server/admin/service.ts:324` / 계획 3.2, 5 | 최초 시도의 key·outputLocale·version을 한 묶음으로 고정. 기존 실행 판정 규칙(예: 응답의 job id 또는 시도 시각 이후 생성된 실행 1건) 명시 |
| R1-13 | 홈 "실패한 작업 N건"은 전체 기간 `status='failed'` 수라 재시도로 해결된 건도 영원히 남는다. 초보 운영자가 줄일 수 없는 숫자다 | `lib/server/admin/service.ts:82`, `lib/server/jobs/service.ts:22` / 계획 3.1 | "조치 가능한 실패(재시도 가능·재시도 작업 없음)" 또는 기간 한정으로 정의하고 링크 필터와 일치시킴 |
| R1-14 | 원문이 바뀌어도 이전 게시 번역은 revision 검사 없이 계속 공개된다. T09의 "게시차단 정책"이 무엇인지 계획에 없다. `imageAlt`는 빈 문자열이면 `??` fallback이 걸리지 않아 빈 alt가 나간다 | `lib/server/partners/service.ts:14-21` / 계획 3.3, T09 | "원문 변경 시 기존 게시본 유지, 편집기에 확인 필요 표시"를 현행 정책으로 명문화. 자동 imageAlt는 저장값으로 넣을지 조회 시 fallback으로 둘지 결정(원문 변경은 sourceRevision을 올려 번역 전체에 확인 필요를 건다: `service.ts:475-483`) |
| R1-15 | 언어 정렬 순서의 "10,000 초과 시 일괄 재번호"는 언어 3개 규모에 비해 과하고 감사·version 일괄 변경 위험만 늘린다. `--bind-existing <user-id>`는 기존 `account promote <email>`과 식별자가 달라 운영자가 UUID를 찾아야 한다 | `lib/contracts/admin.ts:53`, `scripts/account.ts:5-9` / 계획 3.3, 2.2 | 신규 max+10, 상한 도달 시 거절로 단순화. bind 인자는 이메일로 통일 |
| R1-16 | 변경 파일 범위 누락 가능: DB 테이블 목록을 검사하는 테스트·스크립트, 기존 fixture | `tests/integration/database.test.ts:35`, `scripts/phase12-migration-check.ts`, `scripts/phase16-migration-check.ts`, `scripts/backup-restore.py`, `tests/helpers/auth-fixture.ts` | P1/P6 범위에 "새 테이블로 인한 기존 스키마 검사·백업 스크립트 영향 확인"을 추가 |
| R1-17 | 수용 기준 일부가 판정 불가: T06 "스냅샷·실제 사용으로 … 보이지 않음"(검사 대상 문자열 미정), T16 "스크린리더 label smoke"(도구·범위 미정), T02 "rate limit 합산"(R1-01 결정에 종속) | 계획 6 | T06에 금지 패턴 목록(UUID 정규식, `schemaVersion`, `provider_request_id` 등)과 대상 route 목록을, T16에 검사 수단을 명시 |

## 4. 검토 항목별 결론

| 검토 항목 | 결론 | 관련 ID |
|---|---|---|
| admin 리터럴 vs 이메일 형식 | 적합 | — |
| provision / idempotency / collision / 해시·role·active·verified·프로필 | 적합 (실행 위치·선행 조건 보완 필요) | R1-03, R1-15 |
| 세션·재확인·로그아웃·비밀번호 변경·seed 재실행 | 재실행은 닫힘. 분실 복구, 로그인 직후 재확인, 잠금, 변경 후 복귀 계약은 미결 | R1-01, R1-02, R1-04, R1-10 |
| 하드코딩 우회·로컬 전용 배제 | 적합 | — |
| 화면·필드 전수 결정 | 대체로 닫힘. 가이드 번역, 목록 검색 의미, 감사 기본 표시가 미결 | R1-06, R1-07, R1-08 |
| 사유·JSON·UUID 제거와 내부 계약 보존 | 방향 적합. 자동 사유 저장 형식 재결정 필요 | R1-08 |
| 공개 화면 반영·번역 fallback | 파트너는 적합. 가이드는 반영처 없음 | R1-06, R1-14 |
| stale/version·15분 재확인·pending/form 보존·route/next/back | 원칙은 있음. 이탈 보호 수단, mutation별 재시도 규칙 보완 | R1-09, R1-11, R1-12 |
| 일반 사용자 로그인·i18n 회귀 | 적합 (일반 `/login` 계약 불변, parity 검증 포함) | R1-05 |
| 390px·키보드 UX | 기준 있음. 판정 수단 보완 | R1-17 |
| 단계 완결성 | 분실 복구만 범위 밖으로 밀림 | R1-02 |
| 파일/API/DB·migration/rollback | additive 방향 적합. 배포·검사 스크립트 범위 누락 | R1-03, R1-16 |
| 진행 보고 정확성 | "미실행·미검증"을 일관되게 표기. 근거 행 번호 표본 일치 | — |

## 5. 검증 한계

- 정적 읽기만 했다. 로그인, bootstrap, migration, e2e 어느 것도 실행하지 않았으므로 "현재 `admin/admin1234`가 된다/안 된다"는 판단하지 않는다.
- 전문을 읽은 파일: `app/admin/[[...path]]/page.tsx`, `lib/server/auth/{http,service,policy}.ts`, `lib/server/admin/{access,http,service}.ts`, `lib/contracts/admin.ts`, `lib/server/localized-contents/service.ts`, `lib/i18n/packs.ts`, `lib/server/db/seed.ts`, `components/domain/auth-flow-form.tsx`, `Dockerfile`.
- 부분만 읽은 파일: `components/admin/console.tsx`(40~260행), `components/admin/detail-page.tsx`(440~470행), `lib/server/monitoring/service.ts`, `lib/server/jobs/service.ts`, `lib/server/partners/service.ts`, `lib/server/admin/images.ts`, `db/schema.ts`. `components/admin/{list-page,shared,translation-editor,locale-editor}.tsx`와 `components/domain/monitoring-workspace.tsx`는 읽지 않았다. 따라서 3.1~3.3 표의 "현재 UI에 이 필드가 있다"는 서술은 서버 계약 쪽에서만 교차 확인했고, UI 쪽 누락 필드가 없는지는 검증하지 못했다.
- R1-06의 "소비처 없음"은 `lib`, `app` 대상 문자열 검색 결과다. 동적으로 조립된 쿼리가 있다면 놓쳤을 수 있다.
- Next 문서는 `link.md`의 `onNavigate`와 `dynamic-routes.md`만 확인했다. 정적 `app/admin/login`이 optional catch-all보다 우선한다는 계획의 전제는 설치된 문서에서 명시 문장을 찾지 못했다. 구현 착수 시 빌드로 확인해야 한다.
- 외부 메일·provider·storage·실제 배포 환경은 조회하지 않았다.

## 6. 재검토 요청 시 확인할 것

P0·P1 11건(R1-01~R1-10, R1-12)에 대해 계획의 해당 절에 결정 문장과 수용 기준이 들어갔는지 본다. P2는 반영 여부만 확인하고 미반영이어도 사유가 적혀 있으면 차단하지 않는다.
