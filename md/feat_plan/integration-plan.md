# feature/backend 통합 실행계획

상태: **APPROVED / Round2 계획 승인, N1~N5 최종보완 — 구현 미착수**. 기준 SHA·계보는 [README](README.md), 커밋별 근거·48개 충돌 후보는 [branch-analysis](branch-analysis.md). 이 문서는 후속 구현자가 수행할 계획만 제시한다.

[Round 1 검토](review-round-1.md) → [Round 2 APPROVED](review-round-2.md). 승인은 계획 문서에 한정하며 코드 실행·테스트 PASS·운영 활성화·출시 승인과 별개다. N1~N5 최종보완과 Orca 작업 기록은 [README](README.md)에 기록했다.

## 1. 전략과 보존 경계

backend b4749eb를 기준으로 #4 84f6be1에 누적된 #1~#4 기능을 **선택적 포팅**한다. #4에 #1~#3 tip이 실제 ancestor로 포함되므로 네 브랜치를 별도 전체 merge할 필요가 없다. 일반 merge는 계보 보존 장점이 있지만 48개 병행 변경 파일에 backend의 인증·서버 페이지 분리·영속 API와 기능 브랜치 목업이 겹친다. 원본 전체 merge나 `theirs` 일괄 선택은 서버 기능을 퇴행시킬 위험이 커 채택하지 않는다.

branch-analysis §5의 T01~T34 추적표를 기준으로 이식 작업별 원본 SHA/경로/수용항목을 기록하고, UI·문구의 의도와 DTO/DB 연결 구현을 구분한 작은 변경 단위로 진행한다. 원본 commit을 무조건 cherry-pick하지 않는다. 미래에 원본 브랜치를 다시 통합할 때는 포팅 기록과 patch 차이를 대조한다. 현재 작업에서는 Git 통합·코드 수정·commit/push를 실행하지 않는다.

유지할 구현: `lib/server/auth`, `authorization`, `projects`, `storage`, `jobs`, `admin`, `verifications`, `finalizations`, `monitoring`, `exports`, `matching`; `app/api/**`; `db/schema.ts`와 기존 migration 0000~0008; `workers/index.ts`; `lib/i18n`의 서버 체계와 `messages`; b4749eb의 관리자 CRUD 동선. `account-store`/`projects-store`/`assets-store`/`session-assets-store`는 현재 실사용 API client이므로 backend 구현을 보존한다. `mock/projects`·`partners`·`assets`·`project-detail`·`guide-analysis`의 실사용 타입/상수는 backend 기준으로 수동 병합한다. importer 없는 localStorage `monitoring-store`와 `mock/monitoring`·`mock/verify`는 production에 연결하지 않는다(파일별 importer 근거는 branch-analysis §3).

### 1.1 후속 Git 작업 단위 (현재 실행하지 않음)

착수 시 README의 6개 origin ref SHA와 HEAD를 `git rev-parse`로 대조한다. 하나라도 다르면 작업을 중단하고 merge-base·비merge 목록·diff/교집합·T01~T34를 재산정하여 리뷰를 갱신한다. backend에서 분기한 `integrate/feat-1-4`를 통합 기준 브랜치로 삼고 `integrate/feat-1-4-stage-{1..6}`에서 단계당 PR 하나를 만든다. 단계0은 계획/기준 검토이며 별도 코드 PR은 없다. 각 단계 PR은 앞 단계가 반영된 통합 브랜치를 대상으로 하고 마지막에 feature/backend로 통합 PR을 만든다. 실제 원격 쓰기는 후속 구현 권한 범위에서만 한다.

단계 내부 커밋은 한 계약/화면/검증을 단위로 원자적으로 나눈다. 이식 커밋의 trailer는 아래 형식이며, 한 원본이 여러 커밋에 연결되어도 허용한다. 기존충족/폐기 행은 코드 변경 대신 단계 결과보고서에서 근거를 확인한다. 계보 기록용 `-s ours` merge는 하지 않는다(미이식 변경까지 반영된 것처럼 ancestor로 기록하지 않기 위해 추적표로 대체).

```text
Ported-from: <원본 full SHA>, <추가 원본 full SHA>
Plan-trace: T01, T14
Integration-stage: 1
```

실패 단계는 신규 동작을 제한한 뒤 **단계 PR 단위 `git revert`**로 되돌린다. merge commit으로 반영했다면 mainline을 확인한 `git revert -m 1 <단계 merge SHA>`, squash라면 해당 squash SHA를 사용한다. 후속 의존 단계가 이미 반영되었으면 역순 revert 또는 호환 forward-fix를 선택한다. migration 단계의 코드 revert는 추가 테이블/컬럼을 남겨도 구 코드가 동작하는지 검증한 경우만 허용하며 DB SQL/journal을 되감지 않는다(§6). 원격 feat/#1~#4와 고정 SHA는 기본 보존하고 삭제/강제 갱신하지 않는다. 완료 후 coordinator가 보관 태그·통합 완료 표시·추가 커밋 자제 안내를 결정하며 새 커밋은 자동 포함하지 않고 drift 리뷰를 거친다.

## 2. 기능별 현재 구현과 신규 갭

| 기능 | backend에 이미 구현됨 | 기능 tip에 있는 UI/설계 | 새로 필요한 구현 |
| --- | --- | --- | --- |
| locale | 서버 locale 판별·언어팩/fallback·DB 활성화·cookie/계정 선호, ko/en UI/메일·업무 번역 | ko/en/ja 사전·locale CSS·날짜·필수 배지·일본어 성명·소셜 버튼 (#1) | 전체 ja 파일팩과 게시 업무 번역, 키/placeholder 매핑, profile schema/저장, CSS 토큰, 일본어 검수; OAuth는 외부 활성화 게이트 |
| 증빙 | sessions/assets/jobs/guide version/file checksum, 실제 작업 snapshot·최종본 가드 | localStorage 사건·타임라인·증명서·인쇄 (#2) | 서버 사건 원장·정확한 provenance·읽기 API·집계·UI 연결·과거 데이터 구분 |
| 근거·오탐 | 영속 monitoring 원본/scans/jobs·안전 URL·nullable 유사도·최근 성공 유지 | 목업 factors·80/90 임계·reportedFalse toggle (#3) | provider 근거 DTO 확장, 안정 result ID, 서버 오탐 원장·취소·권한·API; 정책 검증 |
| 일본어 감수 패키지 | 최종본 검증/가이드 snapshot·인증 export 큐·이미지 ZIP·download TTL | ja 링크·자동/수동 항목·window.print (#4) | 체크 서버 영속·버전/대상 snapshot·readiness 재검사·불변 발급 snapshot·일본어 출력; 서버 PDF/문서 ZIP은 확장 범위 |

`productionHandlers`(`lib/server/adapters/registry.ts`)는 export와 matching만 등록한다. generation/guide_extraction/verification/monitoring의 실제 공급자 연동을 이 계획에서 구현 완료로 간주하지 않는다. [Phase8](../phase8-result.md)·[Phase10](../phase10-result.md)·[Phase11](../phase11-result.md)의 보류·품질 검수·출시 차단을 그대로 유지한다. 미연결 요청은 기존 503/UNAVAILABLE 계약을 유지하고 목업 성공을 표시하지 않는다.

### 2.1 locale 이식

`lib/i18n/{core,server,packs,provider,format,legacy}.ts[x]`와 `messages/{ko,en}/*.json`을 기준으로 원본 ko/en/ja의 키를 namespace별로 대응한다. 기본값은 `evidence`, `review` 신규 namespace이며 cert/export 증빙 키는 evidence에 넣는다. 기능 경계를 드러내고 assets 기존 키 충돌을 피하기 위해 `core.ts`의 namespaces/uiNamespaces·pack 로딩·i18n 테스트를 함께 갱신한다. 이후 namespace를 바꾸면 세 팩·모든 호출자·테스트 키를 동시 변경한다. 고정 UI/메일은 파일팩, partner/guide 업무 번역은 `localized_contents`의 published/sourceRevision 규칙으로 관리한다.

ja는 **일부 화면 사전 추가만으로 활성화하지 않는다**. backend 모든 namespace(관리자·인증·오류·메일 포함)의 키와 변수 일치, fallback cycle 검증, ja locale DB 행/명칭/방향/순서/활성화 version을 준비한다. 기존 `i18n:activate`는 ko/en만 취급하므로 실행만으로 ja가 켜지지 않는다. 활성화는 아래 단일 게이트 절차를 따른다. 기존 운영 enabled/version을 일괄 초기화하지 않는다.

`useLocale`/LocaleProvider를 그대로 추가하지 않고 useLanguage/useT로 연결한다. html lang/dir는 서버 값과 일치시키고 원본 data-locale CSS 표식이 필요하면 같은 서버 locale에서 제공한다. localStorage 초기화 스크립트를 삽입하지 않는다. ISO/timestamptz 저장·기존 formatter를 유지하며 원본 날짜 문자열을 DB에 복사하지 않는다. 정규화 허용목록은 성명(name 및 분리 이름/읽는 법)·조직명·검색 q뿐이며 trim/전각 영숫자·공백 정규화를 적용한다. 읽는 법에만 반각 kana→전각 kana와 결합음 정규화를 적용한다. 일본어 이름 폭 정리 기능을 유지하면서 원문 의미를 바꾸는 범용 NFKC는 금지한다. 비밀번호/토큰/이메일/URL/자유 prompt는 이 정규화에서 제외한다. 변경 시 검색 비교·성명 저장 회귀를 재검증한다.

일본어 성명은 기존 name을 유지하고 users에 nullable `family_name`, `given_name`, `family_name_kana`, `given_name_kana` 컬럼을 추가한다. 원본 #1처럼 ja 새 가입/프로필 명시 저장에서는 성/이름 필수, kana 두 항목은 선택이다. 기존 활성 계정은 언어 전환만으로 프로필 차단하지 않고 명시 편집에서 채우게 한다. ja 저장 때 name은 성+공백+이름으로 동기화하고 ko/en에서는 기존 name 계약을 유지한다. strict profile schema·DTO·client·관리자 표시를 동시에 확장하며 locale 검증은 서버에서 한다. 이름을 추정 분리하여 backfill하지 않는다. JSON 대안보다 조회/검증이 명확하며 필수성 변경은 가입·profile 검증/테스트 영향이 있다. 소셜 버튼만 존재하므로 Google/LINE/Kakao/Naver를 실제 인증으로 표시하지 않으며 OAuth 공급자·redirect/secrets·계정 연결 정책이 확정된 범위만 활성화한다.

#### 단계1 하드코딩 수정 및 ja 활성화 단일 게이트

모든 단계의 신규/변경 UI·오류 키는 **ko/en/ja의 키 집합·키 개수·변수 집합을 같은 변경에서 일치**시킨다. `test:i18n`과 deployedLocales()로 세 팩 모두 인정되고 기존 en이 계속 available임을 검사하지 못하면 단계 PR을 완료하지 않는다.

| 지점 | 단계1 처리 기본값 | 검증 ID |
| --- | --- | --- |
| `lib/server/errors/http.ts` | sync requestContext는 번들 errorLocales(ko/en/ja)로 match; withApi의 배포 팩 메시지 우선 유지, 실패 시 ja 번들 fallback | L02 |
| `lib/contracts/errors.ts` | ja/errors.json 추가, ErrorLocale은 errorMessages key에서 유도; locale 목록도 그 key에서 도출 | L02 |
| `lib/api/client.ts` | 명시 locale 우선, 없으면 브라우저 html lang(서버 문맥은 ko); errorLocales로 네트워크/비정상 envelope fallback | L02 |
| `lib/account-store.ts` | backend 인증 client 보존, html lang을 같은 errorLocales로 match하여 ja 네트워크 오류 지원 | L02 |
| `lib/server/demo/seed.ts` | 데모 업무 번역 생성 ko/en은 의도적으로 유지하되 seed 대상 locale 상수와 ja fallback 정책을 명시; 미검수 ja 콘텐츠 자동 복제 금지 | L06 |
| `lib/server/db/seed.ts` | ja 행을 enabled:false/fallbackCode:ko/ltr로 없을 때만 추가; 기존 행/선호/version 보존 | L06 |

`activateInitialLocales`는 기존 ko/en 초기 활성화 의미를 보존하고 ja 자동 활성화를 추가하지 않는다. **순서:** 단계1에 완전한 ja 팩 및 비활성 ja DB 행 배포 → 단계2~5의 키를 매 단계 세 팩 동시에 반영 → 단계5 기능 완료 → 단계6 원어민 검수·회귀·ja 가용성 smoke → 기존 관리자 추가인증/감사·version 절차로 ja 활성화. 단계1~5 ja E2E는 격리 DB에서만 활성화하고 끝나면 fixture를 정리한다. 운영 ja를 그 전에 활성화하지 않는다. 데모는 ko/en 게시본만 제공하며 ja UI에서 업무 콘텐츠의 ko fallback/revision을 확인하고 번역 완료로 표시하지 않는다.

원본 Inter(en)/Noto Sans JP(ja)와 --font-locale/ja font-weight·밀도 토큰은 유지한다. 기본은 라이선스가 확인된 파일을 `app/fonts/`에 포함해 `next/font/local`로 로딩(ko Pretendard 유지)하여 폐쇄망 빌드도 가능하게 한다. `next/font/google`을 사용하는 임시 환경에서는 CI의 Google Fonts 다운로드 조건을 명시한다. ja glyph 범위·subset 누락·가변 weight·폰트 용량과 print fallback을 L03에서 확인하며 글꼴 기능을 생략하지 않는다. `components/ui/table.tsx`의 --row-head-h/--pad-cell, `empty-state.tsx`의 whitespace-pre-line은 단계1 수동 이식한다. 랜딩 footer에는 기존 `language-switcher.tsx`를 배치하고 원본 locale-switcher는 이식하지 않는다.

### 2.2 증빙 이식

현재 jobs와 assets는 생성·검증 provenance 일부를 보관하지만 채택 반복이나 최종본 취소의 모든 과거 사건을 담지 않는다. 제안 `evidence_events`를 서버 append-only 원장으로 추가한다. UI addEntry를 권위 있는 API로 제공하지 않고 기존 업무 transaction 내부에서 기록한다.

- 세션 생성 → `lib/server/projects/service.ts`의 성공 transaction에서 session.created.
- generation 요청 수락/실제 성공/실패를 구분한다. 원본 generate.run은 요청과 결과를 혼합하므로 기본 사건 코드는 generate.requested(요청 수락), generate.succeeded(성공 apply), generate.failed/generate.canceled(터미널 확정)이며 원본 generate.run의 성공 집계는 succeeded에 대응한다. 요청/실패도 별도 표시하되 동일 job+kind dedupe를 적용한다. 결과 수는 worker 성공 apply의 실제 assets 수, 조건은 jobs.input snapshot에서 가져온다. 실패/취소를 완료 생성으로 집계하지 않는다.
- 채택/취소 → 실제 asset version 갱신과 같은 transaction; 상태 변화 없는 멱등 요청은 사건을 늘리지 않는다.
- 검증 → `verifications/handler.ts` 성공 apply와 같은 transaction, verification job/guideId/version/ruleResults/engineVersion 연결. 원본 pass/reject로 축소하지 않고 backend pass/warn/reject/unknown과 stale 상태를 표시한다.
- 자산 soft delete → `projects/service.ts`의 deleted_at 변경과 같은 transaction에서 `asset.deleted`; 중복 삭제 요청은 사건을 늘리지 않는다.
- 최종본 추가/제거 → `finalizations/service.ts`의 기존 canFinalize 검사·갱신과 같은 transaction. 취소 기록도 보존한다.

증명서는 최초/최신 사건을 session 전체로 무작정 집계하지 않고 asset.generation_job_id와 asset 전용 채택/검증/최종본 사건에 연결한다. 다른 생성 batch의 prompt/guide를 잘못 붙이지 않는다. guideName은 표시값이고 기준은 guideId/version/checksum이다. actor와 생성시간은 서버가 부여한다. 채택 횟수는 사용자 선택 횟수로 명명하며 실제 이미지 수정 횟수와 동일시하지 않는다.

기존 데이터는 저장된 jobs/asset/guide에서 확인 가능한 provenance만 `legacy-derived`로 읽거나 명시적인 backfill로 생성한다. 과거 채택/취소 이력이 없으면 0으로 꾸미지 말고 미기록/알 수 없음으로 표시한다. 브라우저 localStorage 증빙을 공식 원장으로 자동 수입하지 않는다. 타임라인 정렬은 서버 순번·created_at·id로 안정화하고 페이지네이션·접기 UI는 원본 사건을 삭제하지 않는다. 법적 효력·저작권 성립을 UI가 확정하는 문구는 제품/법무 검수 대상으로 남긴다.

원장 payload에 prompt 원문을 복제하지 않고 job_id를 참조한다. 증명서의 조건 조회는 해당 owner의 jobs.input에서 필요한 값만 읽으며 운영 로그/공개 출력에 원문을 자동 노출하지 않는다. 생성 화면 evidence badge(기록중/실패), 연속 동일 사건 접기·펼치기, certificate와 인쇄를 단계3에 명시 이식한다.

업무 보관/삭제 이후에도 출처를 확인할 수 있도록 읽기 기본값은 활성 owner에게 보관 세션/프로젝트 및 soft-deleted asset의 **증빙 metadata·기발급 snapshot**을 읽기 전용 제공한다. 현재 requireOwned의 active-parent 가드를 약화시키지 않고 별도 evidence read guard로 owner 관계를 검사한다. 파일 원문/썸네일 다운로드·새 사건/체크/발급은 기존 보관/삭제 차단을 유지한다. 타 계정/정지 계정은 읽기도 거절한다. 기발급본 조회는 `GET /api/asset-sessions/:id/review-package/snapshots/:snapshotId`로 소유 관계를 검사하며 최신 readiness GET과 분리한다.

제안 읽기 API: `GET /api/asset-sessions/:id/evidence`(cursor/limit), `GET /api/assets/:id/certificate`. DTO를 `lib/contracts`에 정의하고 `lib/api`를 통해 UI에 연결한다. routes·서비스·집계는 새로 필요하며 지금 존재하지 않는다.

### 2.3 근거·오탐 이식

`monitoring-result.ts`의 결과 계약은 외부 raw payload를 그대로 저장하지 않는 현재 제한을 유지한다. 새 근거는 key/value뿐 아니라 공급자/engineVersion·산출 의미·허용 범위·null/누락 처리와 schemaVersion 호환을 정의한다. 목업 character/color/composition/logo 숫자를 실제 응답인 것처럼 채우지 않는다. 유사도 null·근거 없음은 판단 불가로 표시한다. 80/90 임계는 원본 UX를 유지하는 **참고용 유사도 등급** 기본값으로 채택한다(90 이상 high, 80~90 미만 review, 미만 low). 배지에는 참고용/침해 판정 아님 문구를 붙이고 review를 확인 필요로 표시한다. null은 판단 불가이며 근거 수치를 생성하지 않는다. 운영 침해 판단·자동 조치 기준으로 활성화하지 않고 공급자 품질 승인 게이트를 둔다. 임계 변경 시 경계값 unit/E2E와 문구를 함께 변경한다.

결과 item ID는 읽을 때 `jobId:itemIndex`로 결정적으로 생성한다(저장된 items 배열 순서 기준, 서버 정렬/필터 이전에 부여). 이유는 불변 jobs.output과 jobs_schema_version=1 CHECK·64KiB 한도를 유지하기 위해서다. 과거 output은 수정하지 않는다. 근거 optional 확장도 schemaVersion=1의 bounded DTO로 명시하고 기존 output 읽기 호환을 유지한다. URL만으로 여러 scan 결과를 합치지 않는다. provider output 변경은 handler/parser/jobs metadata·64KiB 한도와 이전 output 읽기 호환까지 함께 검증한다.

제안 API: `POST /api/monitoring-records/:id/scans/:jobId/results/:resultId/feedback`(reason enum, idempotencyKey), `DELETE .../feedback`(idempotencyKey 본문, 신고 철회). API 경로의 resultId는 itemIndex **0~49 정수**로 검증하고 해당 job output의 items 범위도 검사한다. 서버가 path jobId와 itemIndex로 `jobId:itemIndex`를 조합해 원장 키로 사용하며 전체 복합 ID를 URL에 전달하지 않는다. 기존 요청 패턴을 재사용해 재전송/중복 클릭을 안전하게 처리하기 위해 scanRequest와 같은 1~128자 `[A-Za-z0-9_-]+` 패턴을 사용하고 owner+action+key unique/requestHash로 같은 요청 재전송은 기존 결과, 다른 payload는 IDEMPOTENCY_CONFLICT로 처리한다. 결과별 잠금·서버 순번으로 신고/철회 경쟁을 직렬화한다. 기존 결과/jobs.output은 불변 유지하고 사용자 판단은 별도 feedback 원장에 추가한다. 현재 신고 상태는 원장의 최신 유효 상태로 계산한다. 신고는 자동 점수 변경·결과 삭제·공급자 학습/외부 신고 전송을 유발하지 않는다. 재탐지 새 job은 별도 결과·판단이다.

원본의 상세 아이콘/aria-pressed·근거 bars·확인 필요 표현을 `components/domain/monitoring-workspace.tsx`의 실제 result DTO에 적용한다. 전체 실행 실패·부분 결과·0건·최근 성공은 기존 UI 의미를 유지한다. 재시도/worker 종료/부모 보관 시 늦은 결과가 이전 성공이나 신고 상태를 덮어쓰지 않아야 한다.

### 2.4 일본어 감수 패키지 이식

최초 범위는 세션의 최종본과 서버 증빙·검증·수동 점검을 합친 **일본어 제출 준비/출력 자료**다. 판권사 전송·심사 승인·계약 의무 판단을 구현했다고 표시하지 않는다. verify/final의 ja 링크와 실제 route/API 정책을 함께 정의한다. locale은 표시/가용성 선택이고 소유권이나 tenant 경계가 아니다. 기본값은 locale과 무관하게 인가된 owner가 직접 URL/API에 접근 가능하며 **출력은 ja 고정**, 진입 링크는 원본처럼 ja UI에서만 노출한다. 출력 locale과 권한을 분리하여 언어 변경으로 인가가 흔들리지 않게 한다. 비ja UI에는 일본어 출력 안내를 표시하며 정책 변경 시 route/API/E2E를 함께 바꾼다.

제안 API: `GET/PATCH /api/asset-sessions/:id/review-checks`, `GET /api/asset-sessions/:id/review-package`(현재 readiness), `POST .../review-package`(불변 발급 snapshot)를 **이번 범위에 포함**한다. 이유는 출력 시 기준을 재현하고 mutable 체크만으로 과거 제출 자료를 바꾸지 않기 위해서다. 발급은 readiness/version을 같은 transaction에서 검사하고 JSON manifest를 DB에 저장하는 동기 API이며 새 worker/job kind를 만들지 않는다. 수동 항목은 actor/at/version과 **대상 에셋 집합·가이드 version·검증 job·증빙 cutoff**를 연결한다. asset 채택/최종본·가이드·수신자 정보가 바뀌면 관련 체크를 stale로 보고 다시 확인시킨다. 세션별 boolean 세 개만 저장해서 모든 미래 결과에 승인 표시하지 않는다.

자동 항목은 서버에서 계산하며 PATCH로 true를 받지 않는다. finalized 상태, 현재 가이드 검증 pass와 stale 여부, 증빙 존재/누락을 검사한다. unknown/warn/공급자 없음은 통과 처리하지 않는다. 조회 후 발급 사이 변경은 asset/guide/check version 재검사로 충돌 처리한다. 발급 snapshot은 서버 발급시각·manifest checksum·출처 IDs/versions·수동 점검 actor와 기준을 포함하고 나중에 수정하지 않는다.

인쇄 화면은 발급 snapshot DTO를 읽어 원본 print CSS와 `window.print()`로 일본어 자료를 출력한다. 브라우저 인쇄 PDF는 서버 서명 파일로 표현하지 않는다. 서버 PDF/문서 ZIP·외부 전송은 원본에 없으므로 이번 범위를 확장하지 않는다. 이미지 ZIP은 기존 export kind/handler를 변경 없이 재사용한다. `jobs_kind` CHECK와 jobs.output version은 그대로이며 packet 발급을 export job에 억지로 넣지 않는다. 향후 문서 worker가 필요하면 별도 계약 리뷰·jobs_kind CHECK migration 또는 export 입력 확장·ZIP 허용목록/폰트/리소스 제한과 구 worker 호환 검증이 선행되어야 한다. snapshot 보존과 기존 24시간 download capability는 별개다.

## 3. DB·migration·보안·worker 공통 계약 (제안)

다음은 **신규 설계안**으로 기존 schema에 존재하지 않는다. 아래 기본 명칭/열을 기준으로 Drizzle과 strict Zod 계약을 같이 작성하며 세부 변경은 계획 리뷰에 기록한다. packet 동기 발급은 새 job kind가 없으므로 jobs_kind CHECK를 변경하지 않는다.

| 대상 | 최소 계약 | 무결성/조회 |
| --- | --- | --- |
| evidence_events | id, owner_id, session_id, asset_id(nullable), job_id(nullable), kind, actor_id, server created_at, sequence, payload.schemaVersion, dedupe key, origin/native 또는 legacy-derived | owner/session FK 또는 복합 참조; session+sequence 및 사건 dedupe unique; owner/session cursor index; bounded payload |
| monitoring_feedback_events | id, owner/actor, record_id, job_id, result_id, action reported/withdrawn, reason code, idempotencyKey, requestHash, created_at | job-owner-record-result를 transaction에서 검증; append-only; owner+job+result 최신 상태 index |
| review_checks | owner_id, session_id, 대상 snapshot/hash, 세 수동 항목, actor/at, version | session-owner unique/FK; version CAS; 자동 항목 저장/쓰기 금지 |
| review_package_snapshots (이번 범위) | owner/session, manifest.schemaVersion, snapshot/hash, locale/output format, issue time/actor, 참조 IDs/versions, 대상 checksum/증빙 cutoff | 불변 발급본; 참조 파일 보존 검사 추가; owner 인가 조회와 재발급 별도 ID |
| profile 확장 (단계1) | 기존 name 유지, family_name/given_name/family_name_kana/given_name_kana nullable 컬럼 | 기존 사용자 추정 분리 금지; DTO/strict schema·관리자·export 개인정보 최소화 |

현재 schema에는 조직 tenant_id가 없고 `owner_id`가 계정 단위 격리 경계다. org_name을 tenant 권한으로 사용하지 않는다. 조직 공유가 요구되면 별도 membership/tenant schema와 모든 guard 변경 설계가 선행되어야 하며 이번 기본 범위에서 제외한다. 신규 FK는 기존 NO ACTION/보관 정책과 맞추고 cascade 증빙 삭제를 넣지 않는다.

사용자 API는 활성 계정·본인 세션/프로젝트/에셋/record와 보관 상태를 검증한다. 타 계정 ID는 기존 NOT_FOUND 계약을 따른다. 부모가 보관되거나 계정이 정지되면 write·파일 발급을 차단한다. admin 기능 추가 시 role-only 통과를 금지하고 `AdminAccess.run`의 세션 추가 인증과 조회/변경 감사를 적용한다. Origin/CSRF·strict payload·API error envelope·requestId를 기존 HTTP 경로와 동일하게 유지한다.

업무 write·원장 write·필요한 admin 감사는 같은 transaction에서 성공/실패한다. DB 원장 오류를 무시하고 UI 성공을 반환하지 않는다. 잠금 순서는 기존 사용자→세션/프로젝트 등 서비스 순서를 재확인해 통일하고 version 경쟁·중복 요청을 검사한다. 이벤트 actor를 클라이언트 본문에서 신뢰하지 않는다. prompt는 jobs 참조만, 이름/수신자 등 민감정보는 원장 필요 최소량만 접근 제한 저장하며 `lib/server/errors/logger.ts`와 동일하게 운영 로그에 raw body·PII·token을 남기지 않는다.

worker는 기존 queued→running→succeeded/failed/canceled, lease fencing·dispatch boundary·cancel·unknown 응답 자동 재호출 금지를 유지한다. worker 재실행에도 동일 job의 evidence 사건은 dedupe되어야 한다. 이번 snapshot 발급은 DB metadata만 생성하고 파일 worker는 추가하지 않는다. 기존 이미지 export 자료는 storage_tickets ledger/checksum/shared private UPLOADS_DIR를 사용하고 public 경로에 두지 않는다. `hasStoredFileReferences`에 신규 snapshot 참조를 반영하며 다운로드 만료로 원본·증빙을 물리 삭제하지 않는다.

migration은 `db/schema.ts` 변경 후 `pnpm db:generate`로 **새 번호** SQL와 meta snapshot/journal을 함께 생성하고 기존 0000~0008을 수정하지 않는다. 새 FK/unique/check/index와 nullable profile backfill을 빈 DB 및 0008 데이터가 있는 복제 DB에서 검증한다. 원장 backfill은 native 사건과 구분·멱등 실행하며 모르는 행동을 만들어내지 않는다. web/worker는 migration을 자동 실행하지 않고 기존 advisory-lock runner로 적용 후 호환 이미지들을 배포한다.

## 4. 실행 순서와 단계별 수용기준

| 단계 | 구현 작업 | 종료 수용기준 |
| --- | --- | --- |
| 0 조사/결정 | SHA·status 재확인, 48개 경로 mapping, ja/profile/패키지 범위·결과 ID·임계정책·API 계약 결정, 기존 baseline 검증 | 독립 review 지적 해소; 승인된 계약·이식 추적표; baseline 실패를 분리 기록 |
| 1 locale 기반 | messages 키 대응·완전한 ja 팩, server locale/CSS 연결, 배지/날짜/성명 계약 | ko/en 기존 테스트 통과; ja 키/변수 전체 일치; SSR/새로고침/로그인·메일·관리자 ja; 미배포 팩 선택 불가; OAuth 미구현 성공 UI 없음; users 성명 migration은 빈 DB/0008 복제 DB 적용·기존 데이터 보존과 추가 컬럼을 남긴 구 코드 revert 호환 검증; L01~L06 |
| 2 DB/원장 기반 | additive migration, 사건 writers·idempotency·권한·certificate/evidence 조회 | 빈/기존 DB migration 통과; transaction rollback시 업무/사건 모두 미반영; replay 중복0; 타 계정/정지 읽기 거절·보관/삭제 metadata 읽기 및 write 차단; legacy 표시; L01 |
| 3 증빙 UI | badge/timeline/certificate/evidence 출력, 실제 API·asset provenance 연결 | 브라우저/서버 재시작 후 이력 유지; 실패 작업은 성공 집계 제외; 다른 batch 조건 혼합0; stale/unknown 표시; 출력 checksum/기준 version 확인; L01/E01/E02 |
| 4 근거·오탐 | result 계약·ID·feedback API/원장, monitoring 실제 UI 이식 | null/factors 누락 안전; 신고/철회 새로고침 유지; 같은 URL의 다른 job 분리; 재탐지/늦은 완료/503 회귀; 원본 job output 불변; L01/M01/M02 |
| 5 감수 패키지 | 수동 체크 API·snapshot·readiness, ja 동선/직접 URL 정책·print, 동기 snapshot 발급 | 자동 항목 조작 거절; 기준 변경시 stale; 발급 중 경쟁은 충돌; 다른 계정/보관 download 거절; 전송·심사 승인으로 오표시 없음; L01/R01/R02 |
| 6 회귀·복구/인수 | 전체 자동·production E2E·a11y·일본어 검수·DB/파일 백업복구 | 단계 결과/증거/미실행 분리; backend 관리자 CRUD/인증·matching/export 회귀; 이전 이미지 호환 또는 명시적 forward fix; 출시 미결정 목록 유지 |

**전 단계 공통 수용기준 L01:** ko/en/ja 키 집합·변수 동등성, deployedLocales 세 팩 인정, availableLocales의 en 활성 유지. 단계1~5의 모든 문구 변경 PR에서 test:i18n과 en 선택 회귀를 실행한다.

기존 Phase 문서 규칙을 적용하되 기존 phase0~11을 덮어쓰지 않는다. 통합 단계0~6은 후속 Phase12의 substage 0~6에 대응하고 `md/phase12-plan.md`, `phase12-test-checklist.md`, `phase12-result.md`, `phase12-result.html`에 단계별 범위/상태/증거를 구분한다. 구현 전 단계별 상세 계획을 plan의 해당 절에 공유하고 실행 후 체크리스트·MD/HTML 결과를 갱신하며 필수 게이트를 충족한 단계만 인계한다. Phase11 전체 BLOCKED의 승인 독립 통합 범위는 coordinator가 Phase12 plan에 근거를 기록한다(출시/공급자 완료로 승격하지 않음). 이번 수정 작업에서는 이 후속 산출물을 만들지 않는다.

단계1의 users 성명 컬럼 migration부터 빈/0008 복제 DB·구 코드 호환을 먼저 검증하고 locale/profile UI를 연결한다. 단계2의 증빙 원장도 DB/서버 계약을 먼저 구현한 뒤 단계3 UI를 연결한다. locale 팩과 화면의 대량 교체를 한 변경으로 묶지 않는다. test adapter는 격리 테스트에서만 주입하며 production registry에 넣지 않는다. 실제 공급자 도입이 승인되지 않아도 영속/권한/UI/503 계약은 검증할 수 있으나 탐지·생성 품질 합격으로 집계하지 않는다.

## 5. 검증 명령과 환경조건

아래 명령은 **후속 구현 검증용이며 이번 문서 작업에서는 실행하지 않았다**. Node 22.22.0/pnpm 10.34.5, 설치 lockfile, Next 16.3.3 로컬 가이드, PostgreSQL17 격리 DB, Chromium을 준비한다. `.env.example`은 환경 항목 참고이며 실제 secret 값을 보고서나 명령 출력에 기록하지 않는다.

```bash
cd /mnt/f/claps-product
node --version
corepack pnpm --version
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test:unit
corepack pnpm test:i18n
corepack pnpm test:db:up
TEST_DATABASE_URL=postgresql://claps_test:claps_test_local_only@127.0.0.1:55433/claps_test corepack pnpm test:integration
# E2E 시작 전 동일 격리 DB에 migration/기본 seed 적용
DATABASE_URL=postgresql://claps_test:claps_test_local_only@127.0.0.1:55433/claps_test corepack pnpm db:migrate
DATABASE_URL=postgresql://claps_test:claps_test_local_only@127.0.0.1:55433/claps_test corepack pnpm db:seed
corepack pnpm build
# 별도 실행 세션: 아래 환경조건을 먼저 충족하고 production web 시작
corepack pnpm start
# production web/worker 준비 완료 후
TEST_DATABASE_URL=postgresql://claps_test:claps_test_local_only@127.0.0.1:55433/claps_test E2E_BASE_URL=http://127.0.0.1:3000 corepack pnpm test:e2e
corepack pnpm worker:health
corepack pnpm test:db:stop
git -C /mnt/f/claps-product diff --check
```

`vitest.config.mts`에는 unit/integration/i18n 프로젝트가 있고 integration은 직렬이다. `playwright.config.ts`는 webServer 자동 실행이 없으므로 build 후 production web을 별도 기동한다. 테스트 helper의 DB/합성 계정·storage 초기화와 호스트/Compose 경로를 확인한다. E2E 서버 DATABASE_URL도 전용 테스트 DB로 지정하고 APP_ORIGIN은 실제 테스트 baseURL과 일치, MAIL_ADAPTER=sandbox·비공개 sandbox 디렉터리, web/worker 동일 UPLOADS_DIR를 사용한다. 기존 테스트 fixture와 실행 방법은 `scripts/README.md` 및 `md/phase*-test-checklist.md`를 따른다. 운영 DB/실제 사용자로 테스트하지 않는다.

migration 검증은 격리 환경에서 `corepack pnpm db:generate`의 생성 diff 리뷰 후 `DATABASE_URL=<격리 DB의 URL> corepack pnpm db:migrate`와 `db:seed`를 실행한다(표기 placeholder는 실제 안전한 환경변수로 주입). 수정 후 일반 seed는 ko/en/ja locale만 삽입하며 ja는 비활성이고 demo 사용자/콘텐츠/권한을 만들지 않는다. production worker는 `pnpm worker`로 별도 실행하거나 해당 E2E helper의 테스트 adapter 경로를 사용하고 둘의 성공 의미를 구분한다.

데모 회귀는 `scripts/README.md`의 별도 `.env.seed.local`·claps_demo/공유 uploads·승인된 합성 활성 계정으로 `corepack pnpm db:seed:demo`를 실행한 후 `DEMO_BASE_URL=<해당 APP_ORIGIN> corepack pnpm test:demo`를 실행한다(placeholder는 로컬 실제 origin으로 치환). 테스트가 이 비공개 파일과 `POSTGRES_DB=claps_demo` 일치를 검사하므로 일반 claps_test E2E와 분리한다. demo 시드 재실행 보존성과 ja 업무 콘텐츠 ko fallback을 L06에 추가하고 secret/trace를 공개하지 않는다.

추적표의 테스트 ID는 후속 체크리스트에 같은 ID로 구현한다. 현재 PASS를 의미하지 않는다.

| ID | 단계 | 검증 시나리오 |
| --- | --- | --- |
| L01 | 1~5 | 세 팩 키/변수·deployedLocales·en available 유지, 단계별 test:i18n |
| L02 | 1 | ko/en/ja 정상·네트워크 실패·API 팩 로딩 실패·fieldErrors/오류 3요소 |
| L03 | 1 | 폰트 glyph/weight/subset/용량·폐쇄망 build·table/empty-state·390px/200% |
| L04 | 1 | 상태/진행·스타일/날짜 그룹·판정/규칙·출처·근거/정렬 코드와 locale 라벨 매핑 회귀 |
| L05 | 1 | ja 성명 필수/kana 선택·정규화·기존 계정 호환·필수 배지·footer 전환·키보드/alt·hydration |
| L06 | 1,6 | seed ja 비활성/기존행 보존·관리자 활성 게이트·demo ko/en 및 ja 콘텐츠 fallback |
| E01 | 2,3 | 원자적 사건·job replay/dedupe·batch provenance·삭제/보관 metadata 읽기·write 차단 |
| E02 | 3 | 생성 badge·연속 접기/펼치기·certificate/인쇄·가이드 버전·실패/미기록 구분 |
| M01 | 4 | factors/null·참고용80/90 경계/확인 필요·결정적 result ID·output 불변 |
| M02 | 4 | 신고/철회 멱등/경쟁·상세 아이콘/aria·카드 여백·재탐지·503/권한 |
| R01 | 5 | 수동 체크 영속/stale·자동 항목 변경 거절·조치 안내·snapshot 경쟁/불변 |
| R02 | 5 | ja 링크·비ja 직접URL owner 인가·ja 고정출력/print·보관 읽기/발급 차단 |
| A01 | 1,6 | 이메일 인증 유지·소셜 provider 미설정 비활성/설명·LINE 자산/색·실제 OAuth 별도 게이트 |

신규 unit: certificate batch 연결·state aggregate·readiness·stale 체크·result ID·null/임계 경계. 신규 integration: 두 계정 격리/정지/보관, event write 실패 rollback, worker replay/lease/cancel, 가이드 revision 변경, version 충돌, feedback 철회/재신고, packet 발급 snapshot 재현, admin 추가인증/감사. 신규 E2E: ko/en/ja SSR·새로고침/언어 전환, 생성→채택→검증→최종본 실제 테스트 adapter 시나리오와 미연결503 시나리오, 증빙/오탐/체크 재기동 영속, ja 동선/직접URL·인쇄, 390px/200%/키보드·aria 오류/pending 상태. async 서버 page는 Vitest 단독으로 완료 판정하지 않고 production E2E로 확인한다.

검증 기록에는 명령·환경·exit code·고유 테스트 수·실패/재실행·skip·실제 공급자 미실행을 분리한다. 기존 phase 보고서의 PASS는 이번 통합 PASS로 재사용하지 않는다. 문서 링크·고정 SHA/경로·diff 수는 읽기 전용 검사로 대조하고 reviewer 결과는 별도 review 문서에 기록한다.

## 6. 배포/rollback 조건

이 계획은 운영 배포를 수행하지 않는다. 후속 배포는 DB와 UPLOADS_DIR를 같은 쓰기 중지 지점에서 백업하고 manifest/checksum·이전 web/worker 이미지·설정·SHA를 기록한 뒤 additive migration→호환 worker/web→언어팩 활성화→smoke 순서로 한다. DB만 복원해서 신규 파일 참조를 잃거나 파일만 되돌려 job/snapshot을 불일치시키지 않는다.

문제 발생 시 신규 snapshot 발급/감수/feedback write를 제한하고 기존 조회/자료를 보존한다. 이번 범위는 감수용 worker 등록을 추가하지 않는다. UI·ja 가용성을 이전 이미지/설정으로 되돌릴 수 있는지 사전 smoke한다. 이번 jobs kind/output version은 기존 값을 유지하므로 구 worker 호환을 회귀한다. 향후 새 kind/output를 도입하는 별도 변경이라면 jobs_kind CHECK migration·구 worker 처리 가능성을 확인하고 신규 kind 소비를 중지한 후 교체한다. 실패/불명 작업을 queued로 reset하지 않는다.

추가 테이블·컬럼·사건·감사·파일을 down migration으로 제거하지 않는다. 이전 이미지가 호환되지 않으면 검토된 forward fix 또는 정지 상태에서 별도 빈 DB+uploads로 백업 복원 리허설을 한다. 운영 데이터를 되돌릴 때는 그 이후 발생한 업무/증빙 손실을 먼저 평가한다. 단순 `git reset`·볼륨 삭제·#4 전체 덮어쓰기는 복구 전략이 아니다.

## 7. 범위 기본값과 외부 활성화 게이트

기술 기본값은 §1~3에 확정했다: 신규 evidence/review namespace, 결정적 jobId:itemIndex, feedback idempotencyKey, 참고용 80/90, owner 인가/ja 출력, 동기 snapshot 발급 포함, nullable 성명 컬럼과 ja 성/이름 필수·kana 선택, 정규화 허용목록, prompt job 참조, asset.deleted 및 보관/삭제 metadata 읽기. 이 기본값은 Round2에서 계획 승인되었으며 구현/외부 활성화 승인은 별도로 남는다. 변경 시 해당 DTO/schema/테스트/추적표/Phase12 plan을 같이 갱신한다. 특히 result ID 변경은 저장된 feedback 연결 재매핑, 멱등 키 변경은 unique/requestHash 호환, snapshot 제외/비동기화는 발급 API·경쟁 테스트·큐 migration, 읽기 정책 변경은 별도 guard·보관/삭제 E2E, prompt 복제는 개인정보·보존 검토를 추가로 요구한다.

범위 기본값: 증빙·오탐·ja 감수 목표를 전부 유지한다. 오탐은 본인 판단과 철회만 영속하며 외부 전송/점수 조작은 하지 않는다. 감수는 서버 snapshot과 일본어 인쇄를 포함하고 원본에 없는 판권사 전송/승인 workflow·서버 PDF/문서 ZIP은 확장 범위다. owner 격리를 유지하고 multi-tenant 협업은 기존 초기 범위 밖이다. 원격 기능 브랜치는 기본 보존하고 정리/보관 태그는 coordinator가 결정한다.

| 외부 조건 | 승인 전 구현/검증 범위 | 활성화/출시 게이트 |
| --- | --- | --- |
| 원어민/제품 문구 검수 | 세 팩 동등·ja 전체 UI/메일·데모 fallback·격리 E2E | §2.1 단일 게이트 후 운영 ja 활성화; 법적 효력 문구 확정 금지 |
| OAuth 자격증명/계정 정책 | locale별 버튼/LINE 자산·설명/비활성 UI·이메일 인증 유지 | 실제 공급자 credential/callback/계정 연결 승인 후 해당 버튼 활성화 |
| 실제 generation/verification/monitoring 공급자·품질·비용 | 영속/권한/원장/참고 등급·주입 테스트와 미연결503 | 실연동·데이터 평가/품질·비용 승인; 참고 유사도를 침해 판정으로 사용하지 않음 |
| 보존기간/삭제 요구·법무 | append-only·최소정보·접근제한·soft delete/read-only 이력 | 영구삭제/보존기간/증빙 효력/제출 문구 승인 |
| 운영 배포/RPO/RTO | 격리 백업·복구·이전 코드 호환 smoke | 호스트/secret/백업 보관·수치·출시 승인 |

외부 게이트는 기술 구현 완료와 별도로 상태를 보고하며 미승인을 앱 기능의 이유 없는 삭제로 처리하지 않는다. 실제 공급자·법적/사업 품질·출시 승인은 문서 검토 또는 fixture PASS로 충족되지 않는다.
