# 관리자 초보자 사용성·통합 CRUD 수정 결과

- 담당: coder, 2026-09-30, task `task_e93e7ea60ab1`, dispatch `ctx_c2c358711ce2`.
- 실제 변경 위치: `/home/arcreation/orca/workspaces/claps-product/coder`, 브랜치 `coder`.
- 최초 clean HEAD `7f488bb`에는 관리 기능과 백엔드가 없었다. 부모 `c4d46f1`이 그 후속 커밋임을 merge-base로 확인했고 coordinator의 명시적 지시에 따라 `git merge --ff-only c4d46f1`로 맞췄다. 새 커밋, push, 배포, 부모 코드 편집/병합은 하지 않았다.
- 근거 원본: [초보자 리뷰](admin-beginner-review.md), [통합 CRUD 리뷰](admin-crud-review.md). 부모 보고서와 복사본의 SHA-256이 동일하다. CRUD 리뷰 7장의 충돌 규칙과 8장의 합본 순서를 적용했다.
- AGENTS.md와 설치된 Next 16.3.3 로컬 문서의 page/비동기 params, useSearchParams, useRouter, Route Handlers, Native History API 안내를 읽었다. URL 필터의 연속 변경은 Next와 통합되는 `history.replaceState`로 즉시 반영한다.

## 제품 변화

메뉴는 **대시보드 / 회원 / 프로젝트 / 파트너 / 운영** 5개다. 운영은 기존 URL을 유지하는 작업·모니터링·감사·언어 링크 탭이며, 가이드는 프로젝트 상세로 통합했다. 목록과 상세는 공통 컴포넌트를 사용하고 수정 가능한 프로젝트·파트너는 같은 상세에서 보기↔수정한다. 운영 액션과 보관/복구는 영향과 사유를 확인한 다음 실행하며, 보관 후 이전 목록 URL과 필터로 돌아가 복구 링크를 보여 준다.

관리자 권한·세션·15분 재확인·사유·version 및 감사 transaction 계약을 유지했다. API 추가는 파트너 보관/복구, 이미지 제거, 번역 게시 중단, 확인 만료시각 조회이며, 기존 API를 제거하지 않았다. 물리 삭제는 만들지 않았다. 파일 제거는 기존 cleanup 티켓 예약에 연결하고 공유 데이터는 변경하지 않았다.

## ID별 결과

**완료**는 합본 리뷰가 정한 구현 범위를 코드에 반영했다는 뜻이다. 테스트가 모든 조합을 자동 검증한다는 뜻은 아니다. 각 행의 검증과 아래 한계를 함께 읽어야 한다.

| ID | 상태 | 변경 파일 | 개선 내용·검증 근거 |
| --- | --- | --- | --- |
| ADM-01 | 완료 | `components/admin/{console,detail-page,translation-editor}.tsx`, `tests/e2e/admin.spec.ts` | 본문을 유지하고 재확인을 별도 native dialog로 표시한다. 실패 mutation을 보관해 확인 후 1회 재실행하고 취소할 수 있다. 비밀번호 확인과 실제 저장 메시지를 분리했다. E2E는 만료 후 입력 유지, DB version 2, update 감사 1회를 확인했다. |
| ADM-02 | 완료 | `components/admin/{shared,detail-page,locale-editor,translation-editor}.tsx`, `lib/server/admin/service.ts` | 공통 ConfirmAction에 대상·영향·사유·실행/취소를 표시한다. 보관·세션 폐기·정지·취소·공개 범위·언어 비활성·게시 중단·이미지 삭제에 적용했다. 자기 revoke/suspend와 탈퇴 대기 변경을 서버에서도 거절한다. Enter 제출도 확인 절차를 거친다. 통합 테스트의 자기 revoke 거절, E2E의 Esc 취소와 확인 실행 검증. |
| ADM-03 | 완료 | `lib/server/admin/service.ts`, `components/admin/{console,detail-page}.tsx`, `messages/{ko,en}/admin.json` | 상세에 canRetry/canCancel/기존 retry 링크를 제공한다. 완료 또는 이미 취소 요청한 작업은 409이며 audit를 추가하지 않는다. 액션별 성공 메시지와 불가 사유를 표시한다. 통합 테스트에서 완료 취소 거절·감사 불변·retry 자식 재사용 검증. |
| ADM-04 | 완료 | `components/admin/{console,list-page}.tsx` | loading/status와 aria-busy, 요청 실패 재시도, 완료 후 빈 상태를 구분한다. 지연된 목록 요청의 loading 표시와 완료된 table을 E2E 검증. |
| ADM-05 | 완료 | `components/admin/{console,list-page}.tsx`, `lib/server/admin/service.ts`, 메시지 | 오늘 확인할 실패 작업, 설명과 목록 링크, 자동 파일 정리 안내, 사용량 빈 상태. 프로젝트 수는 미보관 기준이다. 필터를 URL에 둔다. CRUD-06에 따라 감사·언어 대시보드 탭 제안은 운영으로 대체했다. E2E URL 필터·목록 복귀 검증. |
| ADM-06 | 완료 | `components/admin/list-page.tsx`, `lib/server/admin/service.ts`, 메시지·i18n 테스트 | 도메인별 열, 회원 이메일·소속·가입일, 작업 종류·오류 번역, 모니터링 수치·보관 상태, 감사 작업·대상·사유를 표시한다. 가이드 UUID 목록은 버전 표로 대체했다. 통합 테스트 이메일 노출 계약과 i18n 동적 열/상태/감사 키 커버리지 검증. |
| ADM-07 | 완료 | `components/admin/{shared,detail-page,translation-editor,locale-editor}.tsx` | 사유 500자 제한·감사 안내와 aria-describedby, 사유 누락 인라인/브라우저 검증과 포커스 이동. 운영·번역·이미지 작업에서 사유 없으면 요청하지 않는다. E2E의 실제 사유 입력과 action 흐름 및 UI/접근성 검사. |
| ADM-08 | 완료 | `components/admin/{console,shared,detail-page,translation-editor}.tsx`, `lib/server/errors/http.ts` | ApiClientError의 requestId·fieldErrors를 보존한다. 공통 FieldErrors로 필드 오류 표시, VERSION_CONFLICT 최신 조회, 자기 계정·정지 해제 불가 설명, JSON 64KiB/문법 오류 구체 안내. 관리자 입력 필드 allowlist를 확장하되 원시 검증 메시지는 반사하지 않는다. 기존 충돌/불량 import 통합·E2E 검증. |
| ADM-09 | 완료(합본 범위) | `app/admin/[[...path]]/page.tsx`, `components/admin/detail-page.tsx`, 메시지 | 내부 Phase 용어 제거. 가이드 버전·현재 여부·규칙 설명 번역을 프로젝트 상세에서 제공한다. PDF 업로드·규칙 조건 편집·게시·현재 가이드 연결 해제는 CRUD-03이 명시한 향후 사용자 기능으로 남긴다. 기존 guide URL redirect와 번역 저장 E2E 통과. |
| ADM-10 | 완료 | `app/(app)/layout.tsx`, `components/layout/app-header.tsx`, `app/admin/[[...path]]/page.tsx`, `components/domain/auth-flow-form.tsx` | 서버에서 판단한 활성 관리자에게만 관리 진입 링크. 비로그인 admin URL을 로그인/이메일 lookup/sign-in에 전달하고 엄격한 admin 경로 allowlist로 복귀한다. E2E 관리자/회원 링크, jobs 복귀, `//evil.example` 무시 검증. |
| ADM-11 | 완료 | `components/admin/{shared,detail-page,list-page}.tsx`, 메시지 | 날짜·boolean·상태·작업·오류를 표시용 문구로 변환하고 UUID·version·revision·공급자 요청 번호를 고급 정보로 이동했다. 연관 ID는 고급 정보 안 상세 링크로 제공한다. 세션/에셋은 머리글·빈 안내·기존 verdict 번역을 사용한다. i18n과 E2E 보기/가이드/관련 작업, UI 캡처로 검증. |
| ADM-12 | 완료 | `components/admin/list-page.tsx`, `lib/contracts/admin.ts`, `playwright.config.ts` | 날짜를 브라우저 로컬 일 시작/끝으로 변환하고 페이지 1로 복귀한다. 역순 입력은 요청하지 않으며 서버도 거절한다. KST E2E에서 UTC 9/29 15:00~9/30 14:59:59.999 및 URL 상태 검증. 빠른 연속 입력의 필터 유실도 수정했다. |
| ADM-13 | 완료 | `components/admin/{shared,list-page,console}.tsx` | 미완성 role=tab 패턴을 링크+aria-current로 대체, 키보드 Tab/Enter 사용. 명시적 검색·select·입력 label, 도움말, 진행/성공/오류 알림·포커스, 표 머리글과 native dialog 포커스 관리. E2E 키보드 진입·Esc 및 axe 검사(아래 결과). |
| ADM-14 | 완료 | `components/admin/console.tsx`, E2E·캡처 | 모바일 5개 메뉴를 wrap해 모두 표시한다. 390px에서 메뉴 진입과 document.scrollWidth≤innerWidth E2E 검증. 역사적 Phase6 캡처를 덮어쓰지 않고 새 evidence 경로에 저장했다. |
| ADM-15 | 완료 | `components/admin/{shared,detail-page,locale-editor}.tsx` | 이메일 type=email, 태그/IP 목록 쉼표·50개 도움말과 칩, 이미지 대체 텍스트 설명, 저장 후 이미지 추가 안내. 대체 언어는 등록 언어 select, ko/미배포 팩 활성화 제한. E2E ko 제한·미배포 fr 안내·편집 취소 검증. |
| ADM-16 | 완료 | `components/admin/console.tsx`, `lib/server/admin/http.ts`, 메시지 | 현재 관리자·초기/재확인 만료시각, 2분 전/만료 경고, 기존 sign-out 경로를 사용하는 로그아웃. 세션 조회도 AdminAccess.run. E2E 초기·만료·재확인 흐름, 정적 코드 및 UI 검사. 15분 실제 경과 대기는 DB 만료 fixture로 대체했다. |
| ADM-17 | 완료 | `components/admin/translation-editor.tsx`, 메시지 | 비-ko 첫 활성 언어 선택, 초안 저장→게시 단계·현재 상태·저장 전 게시 불가 이유, import 필드별 이전/이후 표. 원문 변경 경고와 초안/게시 refresh 유지. E2E ko/en 전환 중 폼 보존, 저장·게시·import/export·게시 중단 검증. |
| CRUD-01 | 완료 | `db/schema.ts`, `db/migrations/0008_nebulous_midnight.sql`, migration meta, `lib/server/admin/{service,http,images}.ts`, `lib/server/{partners,matching}/service.ts`, 관리자 상세·API route | additive archived_at. 파트너 archive→private/공개·추천 제외, restore→private, 보관 중 public 409, FK 유지. 이미지 제거+cleanup_pending 예약+audit/version. 통합 테스트 atomic 제거·revision 불변·연결 유지·version 충돌, E2E 보관·복구/공개 이미지 404·확인 실행 검증. |
| CRUD-02 | 완료 | `components/admin/detail-page.tsx`, `tests/integration/admin.test.ts`, E2E | 보관 checkbox 제거. 위험 구역 확인 버튼으로 현재 서버 이름/설명을 그대로 보관하며 목록 복귀·복구 경로 제공. 관리자 보관 후 실행 중 generation의 apply가 실행되지 않고 PARENT_INACTIVE가 되는 통합 테스트 추가. E2E 체크박스 부재·프로젝트 보관·이름 보존 검증. |
| CRUD-03 | 완료(합본 범위) | admin page·detail·translation, `lib/server/admin/service.ts`, E2E | guide 메뉴 제거, 목록은 projects, guide id는 소속 프로젝트 ?tab=guides로 redirect. 버전/상태/생성일/현재 버전 표와 선택한 버전 번역. guide 업로드/규칙 수정/게시/연결 해제는 리뷰가 명시한 향후 범위로 보존. E2E 실제 guide 번역 저장 통과. |
| CRUD-04 | 완료 | `components/admin/{detail-page,shared,console}.tsx` | 보기 기본, 같은 자리 수정, 변경 없으면 저장 비활성, 취소 시 원본 복원과 dirty 확인, 링크/새로고침 이탈 경고. 회원·작업·모니터링은 가짜 수정 없음. E2E 보기→수정→취소·재확인 저장 검증. |
| CRUD-05 | 완료 | `lib/contracts/admin.ts`, `lib/server/admin/service.ts`, list·메시지 | projects/partners/monitoring의 기본 active·archived·all 서버 필터와 URL/보관 표시. archive enum 오류 422. 통합 세 값·E2E archived 목록과 잘못된 값 검증. |
| CRUD-06 | 완료 | console·shared·detail·admin page, E2E | 5개 메뉴·운영 4탭과 legacy jobs URL 유지. 회원의 프로젝트/작업/모니터링 및 프로젝트 작업을 ownerId/projectId 기반 공통 paginated 목록으로 제공. E2E 5메뉴·390px·회원 작업 범위·가이드 통합 검증. |
| CRUD-07 | 완료 | console·list·detail | 목록 검색·상태·종류·기간·보관·페이지·크기·정렬 URL 유지. 상세에 allowlist로 제한한 back URL 전달, 보관/복구 후 같은 URL 복귀. E2E 검색/정렬/크기 복귀와 URL 필터 변경 검증. |
| CRUD-08 | 완료 | admin contracts/service·list·detail·메시지 | entityType/entityId/actorId/action/기간 필터 API, 리소스 변경 기록 탭, 전역 audit 대상 링크·변경 JSON 펼침, 읽기 전용 안내. 감사 수정/삭제 route는 없다. 통합 partner archive/image 이력 필터 및 E2E 변경/삭제 API 404 검증. |
| CRUD-09 | 완료 | `components/admin/locale-editor.tsx`, 메시지 | 운영 언어 목록 행 편집 dialog·언어 추가·확인 후 활성/비활성. disabled/ko 제한·미배포 팩 안내. 비활성 변경의 폼 저장/Enter도 확인을 거친다. E2E dialog 취소·ko/fallback/팩 제한·삭제 API 부재와 기존 locale 통합 테스트. |
| CRUD-10 | 완료 | localized-contents service·admin http·translation | unpublish의 version/사유/ko 금지, published/sourceRevision/published_at NULL, draft 유지·audit. 통합 ko·stale 거절/fallback, E2E 확인 후 게시 중단·초안 보존. |
| CRUD-11 | 완료 | admin service·detail·list·메시지 | withdrawal_pending 상태 필터·로그인 불가/정책 대기 설명과 변경 액션 숨김. 서버도 해당 상태의 정지/복구/폐기를 막는다. 기존 withdrawal 복구 거절 통합 테스트와 UI 분기 점검. 물리 삭제/익명화는 정책 승인 전 의도적으로 없다. |
| CRUD-12 | 완료(현행 유지) | `components/admin/detail-page.tsx` | 리뷰 권고대로 관리자 모니터링 이름 변경 API와 가짜 수정 버튼을 만들지 않았다. 조회/탐지/보관/복구만 제공한다. 모니터링 목록 E2E·코드 검사. |
| CRUD-13 | 완료 | admin contracts/service·list | pageSize 20/50/100, created_at/name allowlist 정렬·asc/desc, URL 보존. 이름이 없는 리소스의 name 정렬과 비허용 키는 422. 통합 정렬/보관 입력 검증·E2E 크기/이름 정렬 복귀 검증. |

## 검증 환경과 결과

- 전용 컨테이너 `claps-coder-test`, PostgreSQL 17.11, loopback 55439, 별도 `claps_test` DB. 기존 55433 테스트 DB, 55436 데모 DB, 데모 서버 3193은 쓰지 않았다.
- 마이그레이션과 seed는 이 전용 DB에만 적용했다. fixture가 발급한 계정·세션·파트너·프로젝트·가이드·작업만 사용했다. 영어 활성 상태는 E2E fixture 안에서 저장/원복한다.
- `corepack pnpm install --frozen-lockfile` 통과. 시스템 pnpm 9는 workspace 구성 오류였고 packageManager에 지정된 Corepack pnpm 10.34.5로 재실행했다. lockfile/package.json 의존성 변경은 없다.
- `pnpm db:generate` 통과. migration 0008은 nullable archived_at 한 열만 추가한다.
- `pnpm typecheck` 통과(next typegen + tsc).
- `pnpm lint` 통과, error 0. 기존 apple-icon/opengraph-image의 unused eslint-disable warning 2개는 그대로다.
- `pnpm build` 통과(Next 16.3.3 production build). 최종 UI 검증은 `.next/standalone/server.js`와 복사된 static/public asset으로 기동한 loopback 3199 서버에서 수행했다.
- `pnpm test:unit`: 12 파일, 43 테스트 통과.
- `pnpm test:integration`: 10 파일, 120 테스트 통과. 이후 관리자 늦은 작업 결과 테스트 1개를 추가한 최종 admin 파일 재실행: **22/22 통과**. 기존 전체 테스트와 새 테스트를 구분해 기록한다.
- `pnpm test:i18n`: 2 파일, 9 테스트 통과(동적 admin 표시 키 포함).
- `TEST_DATABASE_URL=…55439/claps_test E2E_BASE_URL=http://127.0.0.1:3199 pnpm exec playwright test tests/e2e/admin.spec.ts`: **11/11 통과**, KST Chromium, 32.0초. 실제 DB/API를 사용했다.
- 초기 E2E 실패 원인: 미활성 영어 fixture, 도움말이 label 이름에 포함됨, 연속 URL 필터 갱신의 값 유실, 완료 전 DB assertion. fixture/제품/테스트를 각각 보완한 최종 재실행 결과다. 개발 서버와 production build를 동시에 실행한 회차는 검증 증거로 사용하지 않았다.

- axe-core/playwright 4.10.2: 목록 8개·회원 상세·파트너 생성·공개 전환 확인 모달 **11회 검사, serious/critical 0, 전체 위반 0**. 기본 테마 기준이며 실제 결과 JSON을 저장했다. 초기 translucent destructive 버튼의 색 대비 위반 2개를 공통 확인 버튼 스타일에서 수정한 후 재검사했다. axe 의존성은 `/tmp/claps-admin-a11y`에만 설치했고 제품 의존성은 바꾸지 않았다.
- `git diff --check` 통과.

## 잔여 ID 및 명시적 예외

- 합본 범위 안 **미해결 ADM/CRUD ID 없음**. ADM-09/CRUD-03은 리뷰가 합의한 기존 가이드 번역·프로젝트 통합 범위로 완료다. 신규 PDF 처리·규칙 조건 수정·가이드 게시·연결 해제는 기존 Phase7 작업으로 남아 있으며, 대안은 현재 프로젝트 가이드 탭에서 이어 구현하는 것이다. CRUD-12는 리뷰 권고대로 이름 변경 기능을 추가하지 않은 완료 상태다.
- 사용자 실데이터 삭제·익명화·파일 물리 삭제와 가이드 과거 버전 삭제는 승인 범위에 없고 리뷰가 유지하도록 한 예외다. 해당 버튼을 만들지 않았다.
- migration 0008은 전용 검증 DB에만 적용했다. 실제 환경 반영은 별도 검토·운영 적용 단계이며 이번 작업에서 수행하지 않았다.

## 증거와 한계

- [모바일 캡처](evidence/admin-fixes/admin-mobile.png), [번역 편집 캡처](evidence/admin-fixes/translation-editor.png), [확인 모달](evidence/admin-fixes/confirm-dialog.png), [axe 결과](evidence/admin-fixes/a11y-results.json).
- 아래 검증 로그는 credential 없는 전용 synthetic DB만 사용한 실행 결과다. [typecheck](evidence/admin-fixes/typecheck.log), [lint](evidence/admin-fixes/lint.log), [build](evidence/admin-fixes/build.log), [단위](evidence/admin-fixes/unit.log), [전체 통합](evidence/admin-fixes/integration-all.log), [최종 관리자 통합](evidence/admin-fixes/integration-admin.log), [언어팩](evidence/admin-fixes/i18n.log), [E2E](evidence/admin-fixes/e2e.log).
- 회원 실명/이메일은 기존 계획의 관리 열 요구에 따라 권한 있는 관리자 목록에만 표시한다. 별도의 마스킹 제품 정책은 추가하지 않았다.
- 가이드 PDF 추출·규칙 조건 편집·게시·연결 해제는 합본 리뷰가 이번 범위에서 제외한 기능이다. 해당 동선의 안내와 기존 버전 번역 관리는 제공한다. 별도 페이지를 추가하는 대신 이 프로젝트 가이드 탭을 향후 기능의 위치로 유지한다.
- 작업·감사·회원·언어·에셋 물리 삭제는 리뷰의 명시적인 예외다. 모니터링 이름 수정도 CRUD-12의 권고대로 추가하지 않았다. 이는 잔여 버그가 아니다.
- 파일의 실제 물리 정리 실행, 외부 탐지/생성 공급자, 공유 환경의 migration 적용, 실제 15분 경과, 전체 사용자 앱 E2E, 배포는 실행하지 않았다. 이미지 제거는 cleanup_pending 생성까지만 검증했다.
- E2E와 axe는 Chromium 기준이다. 모든 도움말·오류·상태 조합을 키보드/스크린리더로 수동 검증한 것은 아니다. OS 스크린리더 실제 발화 검증도 수행하지 않았다.

검증 종료 후 coder가 기동한 loopback 3199 standalone 서버와 `claps-coder-test` 컨테이너를 종료/정지했다. 격리 테스트 컨테이너는 필요하면 재개할 수 있도록 남겼고, 기존 서비스는 변경하지 않았다. 변경 사항은 모두 미커밋 상태로 coordinator 검토를 기다린다.
