# 서버 연동 가이드

> 최신 후속 작업: [콘텐츠 검수·가상 샘플 시드](md/content-seed-result.md). 로컬 체험은 `http://127.0.0.1:3193`, 계정은 비공개 `.env.seed.local`에 있다. 아래 Phase별 설명은 당시 범위를 보존한 이력이며, 현재 구현 상태는 Phase 11 및 후속 결과를 참고한다.

Phase 5는 공통 job·큐·worker·실패 복구를 추가한다. Phase 4의 계정별 프로젝트·생성 세션·에셋 조회/채택/보관 및 영속 이미지 파일 서버 연동을 유지한다. 인증은 Phase 3 구현을 사용하며, 실제 생성·검증·최종화·ZIP은 후속 Phase다.

## 저장소와 API

| 클라이언트 | 계약·동작 |
| --- | --- |
| lib/account-store.ts | 인증된 /api/me 및 /api/auth/* |
| lib/projects-store.ts | 비동기 프로젝트 CRUD·stats·library·커버 업로드 |
| lib/assets-store.ts | 비동기 세션 CRUD·프로젝트 연결 |
| lib/session-assets-store.ts | 서버 에셋 단계별 조회·채택·삭제 표시 |
| lib/project-cover.ts | 서버가 계산한 커버를 표시; library는 서버 조회 |
| lib/monitoring-store.ts | 아직 브라우저 mock, Phase 10에서 전환 |

프로젝트·세션·에셋 localStorage 값을 서버로 자동 이관하지 않는다. 서버 UUID/UTC 시각과 version이 원본이다. DTO는 `lib/contracts/workspace.ts`다. 고정 문구는 `messages/{ko,en}/*.json`에 유지한다.

## 서버 경계

`lib/server/projects/service.ts`의 WorkspaceService는 AuthService.authenticated transaction과 users 행 잠금으로 계정 상태·세션·소유권·변경을 묶는다. 계정별 직렬화 아래에서 프로젝트/세션/에셋 행을 잠그며, UI가 읽은 version이 다르면 409 VERSION_CONFLICT다. 소유권 없는 ID와 없는 ID는 같은 404를 반환한다. 모든 mutation은 same-origin과 strict DTO를 강제한다. 계정·권한·파일 경로는 클라이언트 입력에서 받지 않는다.

| Endpoint | 설명 |
| --- | --- |
| GET/POST /api/projects | q(name/IP), page(기본 1), pageSize(기본 30, 최대 100), sort(recent/oldest), archived(true/false) |
| GET /api/projects/stats | 보관 제외 KPI |
| GET/PATCH/DELETE /api/projects/:id | version 필수 수정/보관, PATCH archived:false 복구 |
| GET /api/projects/:id/library 또는 /sessions | 최종 에셋/연결 세션 |
| GET/POST /api/asset-sessions | q/title·projectId·정렬·페이지·보관 조회 및 생성 |
| GET/PATCH/DELETE /api/asset-sessions/:id | 서버 제목·프로젝트 이동·보관/복구; 생성 job/에셋 이후 이동 불가 |
| GET /api/asset-sessions/:id/assets | 원본/썸네일 URL 포함 에셋 |
| GET/PATCH/DELETE /api/assets/:id | version 필수 채택/삭제 표시; 최종/검증/참조 중 에셋 삭제 거절 |
| POST /api/uploads | projectId/name/mime/size로 15분 업로드 ticket 예약 |
| PUT /api/uploads/:token | raw binary body; 성공 후 project PATCH cover:{kind:'upload',ticket}로 연결 |
| GET /api/files/:token | 5분·소유자·부모 상태 재검사; download=1이면 attachment |

리스트 envelope는 `{data:{items,page,pageSize,total,totalPages}}`다. 프로젝트 status의 DB needs_revision은 UI needs_fix로 매핑한다. 이름/IP 검색은 와일드카드가 아닌 대소문자 무시 리터럴 부분 검색이다. 프로젝트 보관은 자식 데이터를 지우지 않고 접근을 막는다. 부모 복구 시 개별 보관 세션은 계속 보관 상태다.

## 파일과 복구

- sharp 0.35.3. 커버는 PNG/JPEG/WebP만, 최대 10MiB, 실제 디코딩·40MP 이하·단일 프레임을 확인한다. 확장자와 선언 MIME/실제 형식도 일치해야 한다.
- UPLOADS_DIR은 public 밖의 절대 경로다. Compose web/worker는 `/app/uploads` 공유 볼륨을 사용한다. 운영 ingress body 제한도 10MiB로 설정해야 한다.
- 원본은 그대로, 회전/축소 썸네일은 WebP 320px 이내로 별도 저장한다. 메타는 소유 레코드 JSONB에 저장하며 외부 API에 storageKey를 노출하지 않는다.
- storage_tickets는 임시 capability/정리 ledger다. 토큰 digest만 DB에 저장한다. upload 상태는 reserved→cleanup_pending(IO claim)→ready→claimed다. 실패/늦은 결과는 cleanup_pending 또는 만료 reserved/ready로 추적한다. 업로드 예약을 먼저 commit하여 IO 중단 뒤에도 예정 경로가 남는다.
- 교체/삭제 표시 파일은 cleanup_pending 레코드를 추가하고 물리 삭제하지 않는다. 운영 영구 삭제·보존 기간은 미확정이다. 다운로드 ticket 만료 DB 행 정리도 Phase 5 worker에 인계한다.
- 수동 업로드/에셋 커버 > 최근 최종본 > 기본 커버 순서다. cover asset은 같은 프로젝트의 최종 에셋만 허용한다.
- 브라우저는 private 파일 URL에 인증 쿠키를 보내며 public 이미지 optimizer를 거치지 않는다. 다운로드 버튼은 새 URL을 발급받은 뒤 요청한다.

## Phase 5 worker 계약

`lib/server/assets/lifecycle.ts`의 lockActiveSession을 같은 transaction에서 호출하여 users→세션→프로젝트를 잠근 뒤 결과를 연결한다. web도 동일한 users 잠금으로 보관·정지·탈퇴와 충돌을 직렬화한다. 비활성/보관이면 결과 연결을 거절하고 정리 ledger에만 남긴다. worker가 계정/부모 상태를 다시 활성화하면 안 된다.

hasStoredFileReferences는 현재/과거 소유 레코드와 job 출력의 참조를 검사한다. 이 함수의 false는 삭제 승인이 아니다. 탈퇴는 withdrawal_pending 및 접근 차단만 수행하며 데이터/감사/백업/파일 영구 삭제는 기존 정책대로 비활성이다.

Better Auth 기본 handler를 현재 digest 세션 저장 방식과 함께 노출하지 않는다. 파일 처리에서 사용자 입력 저장 경로를 열지 않는다. 적용할 additive migration은 `0002_grey_santa_claus.sql`이며 이전 migration과 함께 실행한다.

[Phase 4 계획](md/phase4-plan.md) · [테스트 체크리스트](md/phase4-test-checklist.md) · [실행 안내](scripts/README.md)

## Phase 5 공통 큐 연동

`JobService.enqueue(rawSession, {input,idempotencyKey})`는 인증·계정/부모 소유권·요청 snapshot·멱등 hash·제한을 같은 transaction에서 처리한다. 반환 DTO를 `acceptedJobResponse`로 202 `{data:{jobId,status,statusUrl}}`로 변환한다. 멱등 재전송은 기존 상태를 반환하고 payload가 다르면 409다. 실제 생성 endpoint는 후속 Phase에서 추가한다.

- `lib/server/adapters/registry.ts`에 종류별 실제 handler를 명시적으로 등록한다. 운영 registry는 현재 비어 있으며 test adapter 자동 선택·공개 test 생성 API가 없다.
- handler의 `run(context)`은 외부 요청 **전에** `await context.dispatch(provider, requestId?)`를 호출한다. 나중에 받은 request ID는 `providerRequest`로 보완한다. 이 기록 뒤 timeout/중단은 PROVIDER_UNKNOWN으로 남으며 자동/일반 재시도를 금지한다.
- 파일은 IO **전에** `reserveFile`로 예정 메타를 commit한다. 성공/취소/중단 후에도 ledger를 남기고 승인되지 않은 물리 삭제를 하지 않는다. `apply(client, job, result)`는 DB 쓰기만 수행하며 완료 transaction 내부의 소유/부모·lease/deadline/cancel 가드 뒤 호출된다.
- `GET /api/jobs/:id`, `POST /api/jobs/:id/cancel`(빈 JSON), `/jobs/:id` 상태 페이지 및 `useJob` hook을 제공한다. API는 내부 input/output·공급자 ID·오류 원문을 노출하지 않는다. running 취소 요청과 canceled 종결을 구분한다.
- 안전 실패 재시도는 새 jobs 행, retry_of_id·attempt 연결 및 child UNIQUE를 사용한다. 최대 2회, 5초부터 지수 backoff, 원본 terminal 상태는 불변이다. `retry`는 인증된 소유자 서버 서비스이며 공개 retry endpoint나 관리자 권한 우회를 제공하지 않는다. Phase 6 관리자 action은 권한/추가 인증·감사 wrapper를 별도로 구현해야 한다.
- 기본값: 계정 실행 2/대기 10/시간당 신규 시도 60, timeout 5분, lease 30초·heartbeat 10초. 사용자 행을 잠근 뒤 동시성 수를 재확인한다. worker 하나는 한 번에 1개를 실행하므로 두 개 이상 실행하려면 worker를 증설한다.
- 비용 상태는 not_started/unknown/confirmed/none. 확인된 usage는 취소/timeout 이후 도착해도 보존한다. 취소가 외부 공급자의 실제 처리/과금 취소를 보장하지 않는다.
- `maintainStorage`는 30초마다 batch 100개씩 만료 다운로드 토큰 삭제·만료 reserved/ready 업로드의 cleanup_pending 전환을 수행한다. 파일/과거 job/감사 데이터는 지우지 않는다. 정리 ledger 적재량은 운영 정책 결정 전 관찰 대상이다.
- migration `0003_medical_tenebrous.sql`을 web/worker보다 먼저 적용한다. lease token·heartbeat/deadline·dispatch·cost 및 retry child UNIQUE, storage job target을 추가한다. 기존 16개 테이블을 유지한다.

## Phase 6 관리자·콘텐츠 계약

관리자 웹은 CLI로 지정한 active/admin 계정이 기존 로그인 후 `/admin`에서 비밀번호를 재확인한다. `POST /api/admin/reauthenticate`는 현재 DB 세션에 15분 만료를 저장하며 계정별 15분 5회로 제한한다. 새 로그인/다른 세션으로 승계되지 않고 비밀번호 변경·정지·세션 폐기 시 해제된다. 개발 인증이며 운영 공개/MFA는 별도 게이트다.

- `AdminAccess.run`은 actor/target 사용자 ID순 잠금 뒤 역할·계정·세션·추가 인증을 재검사한다. 운영 mutation과 감사 로그는 같은 transaction이다. requestId는 HTTP 응답과 감사에 연결한다. 소유자 세션 가장은 하지 않는다.
- `/api/admin/{overview,users,projects,partners,jobs,guides,monitoring-records,audit-logs,locales}`를 제공한다. 목록 q/page/pageSize, 지원 리소스별 status/kind/ownerId/projectId/from/to 필터. 사용자 이메일은 감사되는 상세에만 노출한다. 프로젝트 상세의 연결 목록은 각각 최근 100건이며 원본 파일 경로를 반환하지 않는다.
- users PATCH: version/action(suspend|restore|revoke)/reason. active만 정지, suspended만 복구, 탈퇴 대기를 부활시키지 않는다. 자기 정지는 거절한다. projects PATCH는 version/name/ipName/description/archived/reason이다.
- partners POST/PATCH는 name/description/contactEmail/visibility/tags/ipNames 및 선택 marketDescription/imageAlt, reason, 수정 시 version이다. 기본 ko 원문·게시본은 같은 transaction으로 동기화한다. 이미지는 별도 `POST /api/admin/partners/:id/images?version=&reason=&name=` raw PNG/JPEG/WebP, 10MiB/40MP/단일 프레임·20장까지다. IO 전 정리 ledger를 commit하고 완료 시 추가 인증/version을 다시 검사한다. 실패 파일도 물리 삭제하지 않는다.
- 파트너 이미지는 `/api/partners/:id/images/:index`가 active 로그인과 공개 여부를 매번 검사한다. `?admin=1`은 추가 인증과 감사가 필요하다. 관리 데이터와 사용자 응답에 storageKey를 노출하지 않는다. 공개 카탈로그 `/api/partners`는 게시 번역·fallback 메타만 사용한다. 기존 추천 시연은 Phase 9까지 별도 표시한다.
- jobs POST: action(cancel|retry)/reason. 안전 실패만 새로운 retry row를 연결하며 기존 상한·소유자/부모 검사를 유지한다. PROVIDER_UNKNOWN은 재시도 금지다. 조회에서 내부 input/output/오류 원문은 제외하고 공급자 요청 ID/usage는 감사된 상세만 제공한다.
- locales는 배포 파일팩·활성화 교집합과 fallback 순환을 검증한다. ko 비활성/대체 언어 설정, 미배포 언어 활성화를 거절한다. 공개 파트너별 게시 누락/갱신 필요 개수를 표시한다. 원문 ko fallback이 있으므로 모든 외국어 번역을 필수로 강제하지 않는다.
- `/api/admin/localized-contents/:type/:key/:locale`는 원문·초안·게시본·version/sourceRevision/needsUpdate 조회다. 같은 경로 `/export`는 `{schemaVersion:1,entries}`를 반환한다. import-preview/import는 `{schemaVersion:1,entries,reason}`를 받고 각 entry는 resourceType/resourceKey/locale/version/sourceRevision/content다. 최초 version은 0, 최대100행/64KiB다. 중복 키·미허용 필드·UI/email/landing·없는 ruleId·충돌은 거절하며 import는 원자적이다. 동일 내용 재적재는 no-op, 선택 필드 생략은 기존 값을 보존한다.
- `/api/admin/localized-contents/publish`는 entry+reason을 받고 저장된 draft만 게시한다. version과 원문 revision을 재검사한다. source_revision은 draft 기준, published_source_revision/published_version은 게시본 기준이다. ko는 직접 번역 저장하지 않고 원본 편집으로 동기화한다. guide 원문 편집을 구현하는 Phase 7은 `syncOriginal`을 원본 변경 transaction에서 호출한다.
- 모든 관리자/카탈로그 응답은 private,no-store이며 게시 후 요청은 DB 최신값을 읽는다. 공유 캐시가 없어 권한·locale 오염을 피하고 60초 이내 갱신 요구를 즉시 충족한다.
- migration `0004_marvelous_supreme_intelligence.sql`, `0005_talented_vision.sql`을 먼저 적용한다. 기존 게시본 revision backfill과 partner 이미지 ledger target을 포함하며 새 테이블은 없다. 기존 seed는 운영 partner/번역을 덮어쓰지 않는다.

가이드 추출/규칙 편집/버전 게시와 실제 탐지/재탐지는 각각 Phase 7/10이다. 운영 콘텐츠 등록·검수·게시, 실제 관리자 운영 공개, 영구 삭제/보존 정책은 기존 후속 게이트를 유지한다.


## Phase 7 임시 분석 UI

사용자 요청으로 실제 공급자 연동을 보류하고 프로젝트 상세에 `GuideAnalysisPanel`을 연결했다. PDF 선택(20MiB·확장자/헤더 확인) → 4초 진행 → `lib/mock/guide-analysis.ts`의 고정 6개 규칙을 표시한다. 화면에는 사용자 요청대로 시연 배지를 넣지 않는다. 이는 PDF 내용 추출/OCR 결과가 아니며 서버 API·brand_guides·jobs·검증 결과에 기록하지 않는다. 규칙 편집은 컴포넌트 메모리만 변경하고 새로고침/이탈 시 초기화한다. 실제 Phase 7 완료·규칙 게시로 해석하지 않는다. 실제 공급자 재개 시 이 패널을 영속 가이드/job 계약으로 전환해야 한다.

## Phase 8 독립 서버·다운로드 (실제 공급자 보류)

사용자가 Phase 7 실연동 보류 상태에서 독립 서버 구현을 승인했다. 실제 검증 handler는 운영에 등록하지 않는다. 검증 공급자 미연결 요청은 503이며 임시 분석 패널의 fixture가 서버 통과 근거로 사용되지 않는다.

- `POST /api/asset-sessions/:id/verifications`: `{assetIds,guideId,outputLocale,idempotencyKey}`, 최대 10개 같은 세션의 채택 에셋. 서버가 게시 규칙/guideVersion/에셋 version snapshot을 저장. `verificationHandler(auth,provider)`를 명시 등록할 때만 처리. provider는 외부 호출 전 dispatch, 규칙별 이유/evidence와 engineVersion을 반환해야 한다. 누락·중복·부분 결과는 실패하며 pass 이외는 최종화 불가.
- `GET /api/assets/:id/verification`: 근거/currentGuideId/stale/canFinalize. `PUT/DELETE /api/assets/:id/finalization`: `{version}`. 최신 active 게시 가이드, 해당 성공 job의 정확한 근거, 채택/현재 version, 진행 중 검증 없음을 검사. 동시 stale 요청은 409, 현재 version의 같은 상태 요청은 no-op. 취소는 원본/검증 이력을 보존하고 asset 지정 커버를 해제하며, 다시 확정하려면 재검증한다.
- `POST /api/exports`: `{assetIds,outputLocale,idempotencyKey}`, 동일 프로젝트 최종본 1~50개, 개별 10MiB/합계 100MiB. 운영 registry에는 외부 호출 없는 실제 ZIP handler만 추가. 무압축 ZIP32·서버 ID 파일명·CRC/checksum, IO 전 ledger 예약, 완료/다운로드에 snapshot version/계정/부모를 재검사.
- `GET /api/exports/:jobId`: 성공 후 `{downloadUrl,expiresAt}`. 결과 24시간, ticket 5분; ticket이 살아 있어도 ZIP 만료/최종 취소/보관/정지 시 거절한다. 단일 에셋 `?download=1`은 최종본만 허용하며 원본 checksum 검사. 이미지 preview 접근은 기존 소유권 계약 유지.
- 최종 페이지와 프로젝트 라이브러리에서 선택 ZIP, `/jobs/:id` 성공 시 다운로드. 검증/최종 페이지는 서버 근거와 최종 확정/취소를 사용. 공급자 연결 전 새 검증은 이용 불가. 갤러리 파일 다운로드는 최종본에 표시.
- 추가 SQL migration/seed/의존성 없음. JSONB는 legacy 입력/결과 파싱을 유지하되 새 최종화에 snapshot/정확한 성공 근거가 필요하다. 기존 레코드를 임의 통과로 보정하지 않는다.
- ZIP 물리 파일/과거 job은 기존 보존 정책대로 지우지 않는다. ledger와 접근 만료만 적용한다. 향후 삭제 정책 수립 시 원본/과거 참조 보존과 구분해야 한다.

실제 Phase 7 생성/게시·검증 공급자·품질 평가는 후속 작업이다. 독립 테스트 성공은 Phase 7/8 전체 COMPLETED 판정이 아니다.

## Phase 9 규칙 기반 매칭

사용자가 외부 공급자 없는 규칙 기반 추천을 선택했다. 운영 registry에는 실제 `matching` handler(`rules-v1`)를 추가한다. Phase 7·8 공급자 보류는 유지하며 목업 파트너·이메일을 운영 데이터로 seed하지 않는다.

- migration `0006_fluffy_overlord.sql`을 먼저 적용한다. 기존 storage ledger의 target에 `matching`만 추가하며 새 테이블/의존성은 없다.
- `GET/PUT /api/me/matching-criteria`: `{revision,criteria,referenceIds}`로 계정 선호 저장. revision 0부터 시작하며 stale 수정은 409. locale과 다른 preferences를 보존한다. criteria는 ipName/category/worldView/styles/licensee/industries/revenue/collaborationHistory다.
- `POST /api/me/matching-images`: `{name,mime,size}` → `{referenceId,ticket,uploadUrl}`. 기존 `PUT /api/uploads/:token`으로 raw 이미지 업로드 후 기준 저장 때 referenceIds로 연결한다. 최대 3장·개별 10MiB·40MP·단일 PNG/JPEG/WebP. `GET /api/me/matching-images/:id`는 소유자·현재 연결 또는 만료 전 ready ticket만 허용한다. 제거해도 원본/이전 job 파일은 보존하며 cleanup ledger만 추가한다.
- `POST /api/matches`: `{revision,outputLocale:'ko'|'en',idempotencyKey}` → 202 공통 job. 서버의 저장된 기준·참조·공개 후보 master/버전을 snapshot한다. 진행 추천 1개, 기존 시간당 60회, matching timeout 30초. 공개 후보 200개·metadata 64KiB 초과는 검증 오류다.
- 엔진은 NFKC/소문자·문자/숫자 정확한 토큰 일치율을 계산한다. IP/세계관/브랜드/업종 4항목, 입력된 항목만 동일 가중 평균. 미입력 null, 전체 0점 제외, 최대 20개, 동점 ID순. 참조 이미지·매출·이력은 저장하지만 점수에는 사용하지 않는다. 의미/시각 유사도·가격·팬덤·협업 성공 확률을 주장하지 않는다. 평가 대상은 master 원문이며 번역 언어 변경으로 점수를 재계산하지 않는다.
- `GET /api/matches/latest`: 최근 시도 상태와 최신 성공 결과를 별도로 반환. 실패/취소/대기 중 이전 성공 유지. 과거 결과라도 현재 공개 파트너만 응답하며 raw jobs 증거는 변경하지 않는다. 요청 언어는 snapshot에 보존하고 표시 문구·현재 파트너 정보는 게시 번역/fallback을 따른다.
- `GET /api/partners/:id`를 추가하고 목록/상세/추천에 원본 contactEmail을 반환한다. 비공개는 404. 클립보드 복사 직전 상세를 다시 조회한다. 메일 자동 발송은 없다.
- 기존 목업 파일/구형 카드 컴포넌트는 사용자 변경 보존을 위해 남겼지만 partners 런타임 화면은 이를 import하지 않는다. 완료 근거는 Phase 9 체크리스트/결과 문서를 확인한다. 실제 파트너 데이터의 사업 품질 검수는 합성 테스트와 별도다.

## Phase 10 독립 모니터링 (검색 공급자 보류)

사용자가 공급자 없는 원본·기록·실행 이력·관리자 구현을 선택했다. 운영 monitoring handler는 미등록이며 실제 검색/플랫폼 커버리지·품질은 미완료다. 기존 localStorage/목업 결과는 런타임에서 제거했으며 서버 증거로 이관하지 않는다.

- migration `0007_last_skreet.sql`은 storage_tickets target에 monitoring을 추가한다. 신규 테이블/외부 의존성 없음. web/worker 배포 전에 적용한다.
- `POST /api/monitoring-records/uploads`: `{name,mime,size}` → ticket/uploadUrl. 기존 PUT upload, 10MiB·40MP·단일 PNG/JPEG/WebP, 원본/320px 썸네일 별도 보관. 15분 ticket·계정당 시간당 20개 예약.
- `POST /api/monitoring-records`: `{name,source:{kind:'upload',ticket}}` 또는 `{name,source:{kind:'asset',assetId}}`. 같은 소유자의 active 에셋만 허용. 원본 변경은 새 기록으로 분리한다. UI 라이브러리는 프로젝트 최종본을 선택한다.
- `GET /api/monitoring-records`: q/page/archived/sort(recent|created), 20건 고정·UTC·리터럴 검색. `GET/PATCH/DELETE /:id`, PATCH `{version,name?,archived?}`, DELETE `{version}`는 보관이다. 보관/복구/version, 원본 checksum과 계정/에셋/부모를 검사한다. `GET /:id/image`는 소유자만 원본을 반환한다.
- `POST /:id/scans`: `{outputLocale,idempotencyKey}`, 공급자 미등록 503·job 생성 없음. 명시 handler 등록 시 공통 큐/제한·동일 기록 진행 1개. `GET /:id/scans?page=`는 jobs 기반 20건 실행별 이력. 과거 output은 불변이며 최근 성공 요약은 요청 생성 순서로 비교해 역행을 막는다.
- `monitoringHandler(auth,provider)`는 공급자 주입용 계약이다. 운영 등록/외부 호출 구현은 없다. 원본 checksum 확인 후 dispatch를 기록하고 search를 호출한다. bounded 결과는 results/empty/partial, 전체 장애는 failed job. 출처 최대10·결과50·metadata64KiB. 유사도 null 허용. HTTPS 링크 검증과 정규화된 URL 중복 거절. 서버 외부 이미지/페이지 fetch는 없으며 DNS/redirect SSRF 방어를 구현한 것으로 해석하지 않는다.
- 관리자 monitoring 상세와 `/api/admin/monitoring-records/:id/scans`는 추가 인증·감사 후 이력 조회. `POST /api/admin/monitoring-records/:id`: `{action:'archive'|'restore'|'scan',version,reason,outputLocale?,idempotencyKey?}`. scan은 key 필수이며 공급자 없으면 503. owner/actor 잠금·비활성 계정 차단·감사 transaction. 응답 불명은 공통 jobs 정책대로 자동/일반 재시도 금지.
- 보관은 queued 취소/running 취소 요청, 결과 완료 시 기존 계정/부모/lease/cancel 가드. 파일/과거 jobs/감사는 삭제하지 않는다. source_file 원본/썸네일의 참조 검사 유지.

실제 검색·원본 외부 전달/보존 조건·결과 썸네일 수집·커버리지·비용/품질 평가는 후속 공급자 선정 단계다. 전체 Phase 완료와 독립 검증은 결과 보고서에서 구분한다.

## Phase 11 통합·언어·복구 인수인계

로컬 고유 자동196 PASS(단위42+i18n8+통합111+브라우저35), production build/typecheck/lint 통과. [결과](md/phase11-result.md)와 [체크리스트](md/phase11-test-checklist.md)에 실제 복구 실측·이미지 ID·실패 수정·T-01~24 판정을 기록했다. 실제 공급자/운영 출시 조건은 여전히 BLOCKED다.

- WorkspaceError가 사용하는 errors 파일팩을 uiNamespaces에 포함한다. 고정 UI/메일은 DB로 옮기지 않는다. 파일 로더는 `lib/i18n/packs.ts`, DB registry/SSR은 `server.ts`다. HTTP 오류와 sandbox 메일은 배포된 파일팩을 사용하며 API 파일팩 실패는 bundled ko/en 오류로 fallback한다.
- 브라우저 API 헤더와 매칭/탐지 outputLocale은 선택 locale을 유지한다. ko/en enum 대신 기존 canonical localeCodeSchema를 사용하고 snapshot에 보존한다. 클라이언트 네트워크 장애 fallback은 ko/en 내 regional 매칭을 사용한다. DB migration/seed 변경은 없다.
- en-GB는 영어 기반 확장 시험용이며 운영 파일팩/seed에는 추가하지 않았다. 생성 script와 격리 E2E로 재현한다. 이전 이미지에 팩이 없으면 언어 선택에서 제외되고 SSR en/콘텐츠 원문으로 fallback한다. DB 게시본과 계정 선호는 보존된다.
- `scripts/backup-restore.py`는 web/worker/migrate 정지를 요구하고 신규 디렉터리에 dump+tar+SHA-256+이미지 ID를 저장한다. 복구는 빈 DB·빈 uploads 볼륨만 허용하며 checksum/압축 경로를 검사한다. 외부 writer 중지·별도 백업 보관·RPO/RTO·보존 정책은 운영자 결정이다. 상세 절차는 scripts/README.md를 따른다.
- 랜딩 미연결 링크는 비활성 텍스트다. 실제 대상/법무 문서를 임의 생성하지 않았다. 가이드 분석 시연은 기존 사용자 결정대로 유지하며 실제 추출로 간주하지 않는다.
