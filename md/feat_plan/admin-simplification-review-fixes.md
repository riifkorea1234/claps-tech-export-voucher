# 어드민 간소화 계획 — reviewer 수정 기록

- 작성일: 2026-10-09(KST)
- 대상: 원본 `admin-simplification-plan.md`; reviewer 원본 `admin-simplification-review-round-1.md` 및 [독립 리뷰 2차](admin-simplification-review-round-2.md)는 읽기 전용.
- 기준: `/mnt/f/claps-product` 현재 미커밋 코드/AGENTS/설치 Next 16.3.3 문서. planner checkout의 코드로 판단하지 않았다.
- 상태: **reviewer 2차 승인, 비차단 보완 반영본**. [2차 승인 보고서](admin-simplification-review-round-2.md) 4절 R2-01~06 반영, 재검토 불필요. 제품 구현·기능 테스트 통과 보고가 아니다.
- 변경 소유권: 원본 계획 직접 수정 + 이 수정 기록, own planner `md/feat_plan`에 두 파일 동일 사본. 제품 코드/DB/seed/커밋/배포/다른 기존 문서/reviewer 문서는 변경하지 않았다.

## 1. 필수 P0/P1 11건 및 P2 6건 처리

‘반영’은 구현 전 결정이 문서에 저장되었다는 의미다. 테스트는 전부 향후 실행이며 아직 통과했다고 기록하지 않는다.

| ID / 우선순위 | 결정·수정 또는 미채택 사유 | 계획 본문 절 / 구현 단계 | 향후 관측 가능한 수용 기준 |
|---|---|---|---|
| R1-01 / P0 | 반영. admin-sign-in 식별자 단독 차단 제거, 서명 클라이언트 쿠키 요청 100/15분 + 같은 client/identity 실패 10/15분, 정상 credential은 실패 누적만으로 거절하지 않음. 신뢰 IP 있을 때만 IP100, 없으면 unknown 전원 버킷 없음. 초기 발급 표식과 정상 변경 링크 유지. reviewer의 닫을 수 없는 배너·위험 수용 요구는 사용자 명시 요구에 어긋나 미채택; 로그인/홈에 배너·강제변경·로컬전용·접근불가 없음. 쿠키 초기화/공유 NAT의 한계도 기재 | 2.1 제한표·초기표식, 2.2, P1, 7.1 | T02 A11실패→B정상200·A도 100요청 미만 정상암호200, alias/email pair 공유와 일반로그인 버킷 독립; trusted-IP 미설정 다중 client 독립. T03/T04 표식 발급/유지/해제 |
| R1-02 / P0 | 반영. 현재 sandboxMail 고정/remote MAIL_ADAPTER=disabled 사실로 수정. 이번 P1 명시 admin:recover-password --email --password-stdin, hash 교체/전세션·token 회수/system 감사/표식해제 한 transaction. bootstrap no-reset과 구분; member/정지 승격·회생 없음. 메일은 현재 사용불가 보조계약 보존, 신규 메일 통합을 출시조건으로 안 둠 | 2.3 복구 하위절, P1, 7.1 | T04 disabled 메일→명령복구→새암호200·구암호/세션 거절·감사, 잘못된 인자/상태/감사실패 무변경. T18 실제 tools 복구 |
| R1-03 / P1 | 반영. migrate→seed→activate→서버→동일 UI→명시 tools bootstrap/bind. standalone web에서 tsx 실행 금지, 기존 Docker tools target의 one-shot admin-tools service/동일 tag. stdin/env 전달·삭제 절차, Dockerfile 새 stage 불필요 근거와 운영문서 경로 확정. seed가 ko원문 FK 선행 준비 | 2.2, P1/P6, 7.1 | T01 문서절차로 빈DB에서 로그인·최초 partner 저장까지, T18 image/scripts/pack 확인 |
| R1-04 / P1 | 반영. admin-sign-in 같은 credential 검증 transaction에서 verified_until=now+15분 발급·admin.reauthenticate 감사. 최초 두 번 암호 입력 제거. 일반 이메일 /login 세션 계약은 그대로 최초재확인 | 2.1, 2.3, 4 최초운영, P1 | T01/T02 로그인 모달0·암호1회, 15분 후 요구·5회 제한·일반로그인 최초재확인 |
| R1-05 / P1 | 반영. member /admin도 login redirect/계정선택. 미로그인/member/정지/정상 4상태 표 추가. admin-sign-in 성공 시 현재 cookie 세션 행만 transaction에서 교체, 실패 유지; API 권한은 별도 유지 | 2.1 상태표, P1 | T05 각상태 /admin과 /admin/login route, 회원 기존세션 성공 삭제/실패 유지, member API403 |
| R1-06 / P1 | 반영, 권고(b) 선택. 공개 guide 소비처 없음으로 효과 없는 가이드 번역 운영UI 제거, 원문/가이드규칙 조회 개선 유지. guide API/데이터/원문sync/ruleId/import/export 보존. 파일UI partner만, guide 포함 혼합파일 적용 전 거절(부분적용 없음); 새 소비처·무효 버튼·후속구현 약속 안 만듦 | 3.2/3.3/3.5, 4 번역, P3/P5 | T07 guide 원문·redirect, T09 번역버튼 없음·기존guide API integration 호환; 공개 guide 번역효과 pass 요구 제거 |
| R1-07 / P1 | 반영. 기존 list API7종+별도locale의 q 대상/기본탭/서버매핑 표, 이름 join과 count 동일. 작업 종류는 번역 선택지, q는 owner/project; 진행중 statuses=queued,running. 감사 상세 history scope만, 이름선택기 미추가. guide/locale 검색UI 제거, 기존API 호환. 사용자5상태 모두 매핑 | 3.1 매핑표, 5 DTO/P3 | T07 한글이름검색/count·jobkind 선택→generation·queued/running 동시반환·5상태·scope reset보존; T17 old query |
| R1-08 / P1 | 반영. 감사 기본 exclude .read/admin.reauthenticate, includeReads 고급조회에서만 노출하고 저장 유지. reason은 old reason→note 원문→중립 @admin:auto:v1, action을 현재 locale로 설명; 합성 한국어 저장 제거. legacy 자유사유 원문, exact action+system reason만 locale 렌더. 두 translation.import는 동일 ‘번역 초안 저장’ 문구(별도 action 없음) | 3.1 감사, 3.3/3.4, P2/P3 | T11/T12 en/ja 자동설명·ko메모원문·표식비노출·old payload/정확한system사유·기본조회제외/고급포함/DB보존 |
| R1-09 / P1 | 반영. 기존 a capture/confirm/beforeunload 공용화·Link onNavigate·프로그램적 이동가드·탭/언어/모달/sign-out 사전검사. 뒤로앞으로 popstate 확인 시도만, Next 취소보장/초안복원 약속 제거; sentinel history 새기능 미채택 | 4 공통, 4.2 유형표, P2 | T15 제어가능이동 취소 URL/폼유지·sign-out0·refresh native dialog, 뒤로가기는 시도/한계 기록(항상보존 pass 없음), 성공baseline |
| R1-10 / P1 | 반영. AuthService가 세션/소비token 사용자 role로 change/reset nextStep admin=/admin/login, member=/login. change/reset next query 미사용. app/change-password/page.tsx가 role에 맞는 돌아가기 링크 전달, 성공 cookie/전세션회수·문서교체. 취소 admin=/admin·세션유지 | 2.3, 4 암호, P1 파일표 | T04 역할별 change/reset 목적지/취소/세션; T05 next=https·//·admin경로 주입 모두 서버 역할목적지 유지 |
| R1-11 / P2 | 반영. scan key/outputLocale/version 최초snapshot 묶음, UI언어변경 무관. P5 정확한 attempt GET key조회, matching record+owner+locale job만 같은실행; 없으면 불명. 동일 POST replay를 권한/재확인 후 현재version/source 검사 전에 조회, 추가감사/job/비용 없음 | 3.2, 4.1, 5 scan, P5 | T10 locale변경·reauth·유실·recordversion변경 같은 job, 다른record/locale key conflict, null/lookup실패 success0 |
| R1-12 / P1 | 반영. 전mutation key 약속 제거·4.1 분류표. 실행전 reauth거절만1회재개, 유실은 자동재전송0. 최신 상태일치=현재반영 안내, 단순409 타인충돌 단정 금지. 신규 partner creationKey와 actor/key receipt 최소추가로 중복 방지. revoke/image-add 특정실행 판정 불가를 불명으로 표시하고 명시 재실행확인; 성공 가장 안 함 | 2.3, 4 오류, 4.1, P2/P4/P5, 7 DB | T08/T15 commit후응답유실→samekey partner/원문/감사/receipt1건·다른payload conflict·수정목표일치 안내·revoke/image-add 불명 유지·자동재전송0 |
| R1-13 / P2 | 반영. 홈 ‘다시 실행할 수 있는 실패’는 canRetry의 실패/미dispatch/취소없음/retrychild없음/maxRetries/error코드 predicate, 동일 retryable=true 목록 링크. provider/owner 불가는 상세 서버상태로 별도 설명. 전체기간을 오늘로 오표기 안 함 | 3.1 홈·매핑, P3 | T12 홈count=링크count·retry child 후원래실패감소·조치불가제외·queued 링크 |
| R1-14 / P2 | 반영. 원문변경 후 기존 게시본 계속 공개·needsUpdate, draft/게시만 최신revision 요구(현재정책 유지). alt 자동문구는 DB저장 아닌 공개DTO조회: nonblank 번역alt→nonblank 원문alt→공개명/resolvedLocale문구. 공백도fallback, 기존 사용자값/이미저장자동처럼보이는문구도 백필없음 | 3.3/3.5, P4/P5 | T08 alt 빈값zero/nonblank보존, T09 원문변경즉시구게시공개/stale게시거절/최신재게시 |
| R1-15 / P2 | 반영. 신규sort max+10/>10000거절로 단순화, 일괄재번호 없음. bind-existing는 정규화email로 account promote와 통일, env email mismatch conflict, 반복bind 완전no-op | 2.2, 3.3/5 locale, P1/P5 | T03 email bind/no-op, T13 9990→10000성공/9991거절·기존version/audit변경0 |
| R1-16 / P2 | 반영. alias/receipt 최신schema 22테이블·timestamp19로 기존검사 영향, FK fixture 정리. phase12/16 historical-prefix 고정전제 보존하며 empty/upgrade/replay 새schema 별도검증, 전체dump 백업은 명단변경예상없지만 복구행 검증. 테스트결과 먼저주장 안 함 | P6 파일표, 5 영향절, 7, T18 | T18 최신표/fixture2회·oldhash/번역보존·alias/receipt/표식backup-restore·필요없으면 script억지수정 없음 |
| R1-17 / P2 | 반영. T06 route/text/accessibility 금지UUID/기술키/json·enum allowlist, href/dataID 및 실제원문기술단어 예외. T16 Playwright role/label/aria·키보드 + 실제 NVDA또는Orca 낭독흐름, 미실행미검증. T02 수치는 새제한표로 재작성 | 6 T02/T06/T16 및 검사범위 단락 | 명시된 route/패턴·reader 도구·흐름 증거, 실제브라우저200% 확대. 지금은 미래기준만 |

## 2. 코디네이터 전달 UI 전수 보완 4건

코디네이터 follow-up의 reviewer 추가 점검 결과를 받아 해당 소스를 직접 읽고 함께 반영했다. 추가 P0/P1 없음이라는 reviewer의 정적 보고는 기능 pass 증거로 전환하지 않는다.

| ID | 처리 | 계획 절 / 향후 수용 기준 |
|---|---|---|
| UI-01 | 콘텐츠 언어는 deployed 등록언어·비활성은 ‘사용 중 아님’ 표기, 준비용 draft 저장/게시 가능하되 공개는 enabled+deployed; 미배포 선택불가·ko원문 읽기전용 | 3.3/3.5, T09 |
| UI-02 | 사용자 5상태 기본 전체 및 active/suspended 탭, email_unverified/profile_pending/withdrawal_pending 고급단일filter, raw enum입력 없음 | 3.1 매핑표, T07 |
| UI-03 | detail-page 기존 가드를 공용 확장·번역/locale모달 적용, history sentinel 미추가·뒤로가기한계 명시 | 4.2, P2, T15 |
| UI-04 | ScanHistory/ResultDetail admin분기만 변경: job.id 텍스트→실행작업보기, provider/engineVersion 비노출, s.name/i.source enum 번역safeallowlist; 일반사용자 표시/feedback 유지 | 5 scan DTO 및 P5, T10/T17 |

## 3. 1차 보완 당시 정적 검증과 구현 경계

직접 대조한 주요 근거는 `lib/server/auth/{http,service,policy}.ts`, `lib/server/admin/{access,http,service}.ts`, `lib/contracts/admin.ts`, `lib/server/{mail/sandbox,partners/service,monitoring/service,jobs/service,localized-contents/service}.ts`, `app/admin/[[...path]]/page.tsx`, `app/change-password/page.tsx`, `lib/server/authorization/guards.ts`, `components/domain/{auth-flow-form,monitoring-workspace}.tsx`, `components/admin/{detail-page,translation-editor,list-page}.tsx`, `Dockerfile`, `deploy/remote/compose.yaml`, `lib/server/db/seed.ts`, `scripts/{activate-locales,phase12-migration-check,phase16-migration-check}.ts`, `scripts/backup-restore.py`, `tests/integration/database.test.ts`, `tests/helpers/auth-fixture.ts`, `package.json`이다. 설치 Next authentication/Route Handler/cookies와 Link onNavigate 문서를 읽었다. 모든 경로는 원본 checkout 기준이며 제품파일을 수정하지 않았다.

수정 본문에서 기존 ‘한국어 자동사유 저장/재번호/포괄 idempotency/최초이중암호/분실메일필수/alias만 migration’ 문장을 교체하고 P1~P6 변경범위·T01~T18·7절 배포/rollback과 맞췄다. 이번 정적 확인에서 R1 17행·UI 4행·P1~P6 6단계·T01~T18 18행의 누락/중복 없음, Markdown 표 열수/코드펜스 일치, 불일치 이전 문구 제거, 원본/own 두 파일 byte 일치, reviewer 원본 SHA-256 불변을 확인했다. **로그인/DB/seed/migration/hash/KDF/메일/worker/provider/UI/e2e/lint/build 테스트는 실행하지 않았다.** 향후 기준을 현재 테스트 pass로 기록하지 않는다.

## 4. 잔여 항목

정책 미결로 남긴 R1 항목은 없다. reviewer 2차에서 계획이 승인되었고 비차단 6건은 아래 5절에 반영했다. 보고서 4절은 재검토 불필요로 명시하므로 별도 전체 재검토를 요청하지 않는다. 남은 작업은 승인된 제품 구현 P1~P6와 실제 T01~T18 실행/증거다. 현재 실제 admin/admin1234 로그인 가능 여부·메일 전달·외부 provider·DB계정은 여전히 미검증이다.

보장 한계는 미결이 아니라 본문에 닫힌 결정으로 남겼다: 신뢰IP없는 쿠키제한은 쿠키초기화/분산공격 방지 보장 없음, 동일NAT 요청량 제한 영향 가능; 브라우저 뒤로/종료의 이탈취소·초안복원 보장 없음; 응답유실된 revoke/image-add의 특정실행 완료는 불명 유지; key 미전송 구클라이언트 및 신규폼을 버린 뒤 재로그인은 중복판정 자동보장 없음. 이 한계를 해결한다며 강제초기암호변경·기본화면경고·대규모 새프레임워크·전체기능후속이관은 추가하지 않았다.

## 5. reviewer 2차 비차단 메모 6건 처리

승인된 [2차 보고서 4절](admin-simplification-review-round-2.md)의 R2-01~06만 보완했다. 기존 admin/admin1234 요구와 간소화를 유지하며 새 승인·상시 경고 흐름은 추가하지 않았다.

| ID | 처리 / 기존 결정 유지 이유 | 계획 본문 절 / 단계 | 향후 기준 |
|---|---|---|---|
| R2-01 | 처리. 프로젝트 상태 오기를 현행 enum `needs_revision`로 정정 | 3.1 projects 매핑표 / P3 | T07 상태 표시·번역 키는 실제 enum 기준 |
| R2-02 | 처리. secret 미설정/빈 값/형식 오류는 admin-sign-in만 SERVICE_UNAVAILABLE 503, 서버·일반 로그인·기존 세션 유지. `lib/server/config/env.ts`의 선택 env 선언·별도 검증을 `lib/server/auth/http.ts`의 관리자 action에서만 사용. 새 `deploy/remote/prepare-admin-auth-env.sh`로 초기 32바이트 난수 secret 자동 저장·compose web 주입, 수동 비밀 입력 불필요, 기존 값 유지 및 오류 시 무변경 | 2.1 제한표, 5절 P1 파일·계약·수용 범위, 6절 T02, 7.1 배포 절차 / P1 | T02 초기 생성·재배포/재시작 기존 secret 유지, 누락/오류503·세션/쿠키 발급0·일반 로그인 유지, 유효값 주입 뒤 admin/admin1234 로그인 |
| R2-03 | 기존 결정 유지. 신뢰 IP 없을 때 쿠키 초기화로 한도 초기화되는 한계를 명시하고 프록시가 덮어쓰는 전용 헤더/직접 web 접근 차단의 기존 신뢰 조건을 운영 권고로 위치 확정. 신규 통제 없음 | 2.1 cookie/IP 제한표, 7.1 운영 권고 / P1, 예정 `deploy/README.md` | P1 리뷰에서 운영 문구 반영 확인, T02 기존 trusted-IP/위조 헤더/쿠키 독립 기준 유지 |
| R2-04 | 기존 결정 유지. 이름 중복이 허용되므로 이름 검색으로는 특정 생성 성공을 확인할 수 없어 actor/key/payload 영수증으로 응답유실·동시 요청의 중복을 막음. 파트너 생성 한정 범위 유지 | 4.1 이유 문단·기존 영수증 설계, 5절 P4 / P4 | 기존 T08/T15 같은 key의 partner/ko 원문/create 감사/영수증 각 1건 및 다른 payload conflict; 설계 확대 없음 |
| R2-05 | 처리. 감사 검색 결과/count 일치와 관리자 이름·대상 7종 대표 데이터의 응답시간 관찰 문장 추가. 시간 SLO 신설 없음 | 6절 T07, 기존 3.1 감사 검색 매핑 / P3 | T07 integration 실제 일치 집합·페이지 결과/count 대조, 데이터 규모·조건·응답시간 기록 |
| R2-06 | 처리. 기존 T01 route 확인을 P1 첫 작업으로 순서 명시: 최소 정적 route 추가→빌드→실 HTTP→나머지 인증 구현 | 5절 P1 첫 작업, 6절 T01 / P1 | T01 `/admin/login`이 정적 로그인 페이지로 처리되고 `/admin`·허용 상세는 catch-all로 처리되는지 확인 |

## 6. 이번 비차단 보완 정적 확인 결과

- R2-01~06 처리표 정확히 6행, 누락/중복 없음. 각 행의 처리 또는 기존 결정 유지 이유·본문 절·향후 기준을 확인했다.
- 계획의 상태 오기 제거, secret 누락 동작·예정 파일·초기 자동 생성·기존 값 유지가 2.1/P1/T02/7.1에 연결됨을 확인했다. T07 관찰 문장과 P1/T01의 route 확인 순서가 일치한다.
- R1 17행·UI 4행·P1~P6 6행·T01~T18 18행은 유지했고, 두 문서 Markdown 표 열수·코드펜스 균형을 확인했다.
- 원본과 own planner 두 문서 사본은 각각 byte 일치. reviewer 2차 원본 SHA-256은 수정 전후 `59b455d8fac91fde01169472c067e0a2fd3a64d4354eefe40a5d7c75d78acc83`로 불변이다.
- 이번 확인은 위 6메모에 한정한 문서 정적 확인이다. 제품 코드/DB/seed/테스트/커밋/배포/reviewer 원본은 변경하지 않았고 제품 테스트·빌드·서버는 실행하지 않았다. 실제 제품 동작은 향후 T01~T18에서 검증한다.
