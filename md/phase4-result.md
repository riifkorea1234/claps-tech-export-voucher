# Phase 4 결과 보고서 — 프로젝트·세션 CRUD·영속 파일

## 1. 판정

| 항목 | 결과 |
| --- | --- |
| 상태 | COMPLETED — 승인된 Phase 4 개발 범위 |
| 작업일·담당 | 2026-09-23 · Codex 단독 수행 |
| 선행 조건 | Phase 3 COMPLETED, 필수 4 PASS·자동 73 PASS 확인 |
| 자동 테스트 | 16 files / 93 tests / 93 passed / 0 failed / 0 skipped |
| 구성 | 단위 24 + i18n 6 + PostgreSQL 통합 39 + Chromium E2E 24 |
| 필수 검증 | 5 PASS / 0 FAIL / 0 BLOCKED / 0 PENDING |
| Docker smoke | 4 checks / 4 PASS, 자동 테스트 수와 별도 |
| 정적·빌드 | lint 0 errors / 6 기존 warnings, typecheck/tsc/build exit 0 |
| 언어팩 | ko/en 각각 558 key, 11 namespace |

프로젝트·생성 세션과 에셋 조회/채택을 계정별 서버 저장으로 전환했다. 커버 원본과 썸네일을 private 공유 볼륨에 저장하며, 인증·소유권·만료를 검사한 URL로 내려준다. 새로고침과 PostgreSQL/web 재시작 뒤 데이터와 파일이 유지된다. 이 판정은 AI 엔진이나 운영 배포 완료를 뜻하지 않는다.

## 2. 실제 완료 범위

- 프로젝트 생성/조회/수정/보관/복구, 이름·IP 검색, 최신/오래된 순 정렬, 기본 30건 서버 페이지, 보관 제외 KPI와 세션/이미지 집계.
- 서버 UUID·UTC 시각·공통 DTO, strict 입력, 계정 상태/소유권 검증, 필수 version과 동시 편집 409. PATCH에서 생략한 IP·설명·상태는 보존한다. 없는 ID와 타인 ID에 동일한 404를 반환하고 샘플 fallback을 제거했다.
- 세션 CRUD·프로젝트 연결, 페이지/검색/날짜 그룹·정렬, 세 단계에서 동일 서버 제목 표시. 생성 job/에셋 이력이 있으면 프로젝트 이동을 거절한다.
- 에셋 원본/썸네일 조회·채택·삭제 표시 기반. 최종/검증/참조 중 에셋은 삭제를 막고 기록과 물리 파일을 보존한다. 라이브러리는 실제 최종본만 반환한다.
- PNG/JPEG/WebP 최대 10MiB, 확장자/MIME/실제 디코딩·40MP·단일 프레임 검사. 원본과 최대 320px WebP 썸네일을 별도 저장한다.
- 업로드 ticket 15분, 다운로드 링크 5분. 임의 경로를 받지 않고 소유 부모를 검사한 뒤 DB 파일 메타를 읽는다. token digest 저장, private/no-store, nosniff, attachment 다운로드를 적용했다.
- 수동 커버 > 최근 최종본 > 기본 커버, 세션 최신 최종본 썸네일. 업로드 연결/교체는 프로젝트 version과 같은 transaction에서 처리한다.
- 비동기 로딩/빈 상태/실패/재시도·입력 보존·중복 제출 잠금. 실제 서버 성공 뒤 화면을 갱신하고 ko/en 문구를 함께 추가했다.
- 계정 행 잠금과 lifecycle 가드, reserved/ready/claimed/cleanup_pending ledger, 파일 참조 검사. 부모 보관/탈퇴로 자식 접근을 막고 복구 시 데이터를 다시 표시한다.

브라우저 localStorage 업무 데이터는 자동 이관하지 않았다. 생성·검증·최종화 목업 쓰기를 없애고 준비 중 상태로 표시했다. 합성 에셋은 격리 테스트 helper에서만 만들며 공개 생성 우회 endpoint는 없다.

## 3. 계획 대비 결정과 차이

| 항목 | 실제 결정·근거 |
| --- | --- |
| 파일 정책 | 사용자 승인: PNG/JPEG/WebP·10MiB·업로드 15분/다운로드 5분. 영구 삭제 비활성 유지 |
| CRUD 구성 | 공통 WorkspaceService에 계정 transaction/소유권/DTO를 모아 중복 방지; storage와 worker lifecycle은 별도 모듈 |
| DB | 기존 projects/asset_sessions/assets의 version/FK 활용. 0002 additive storage_tickets ledger만 추가, 기존 테이블 파괴적 변경 없음 |
| 파일 메타 | 연결 파일의 원본은 소유 레코드 JSONB. storage_tickets는 임시 capability/정리 상태이며 영구 files 엔티티가 아님 |
| UI | 프로젝트 20건 클라이언트 페이지를 30건 서버 페이지로 변경. 세부 화면은 서버 데이터·준비 중 기능 표시로 정리, 모바일 제목 폭 보완 |
| 모니터링 호환 | 프로젝트/라이브러리 선택만 async API로 호환 수정. 모니터링 기록/탐지 자체는 후속 범위 유지 |
| 검증 fixture | Phase 2 언어 E2E의 localStorage를 실제 계정/서버 데이터/합성 에셋으로 전환, 기존 검증 유지 |
| lint | 전환이 끝난 업무 화면의 hydration 예외 제거, 기존 경고 18→6. 남은 monitoring/아이콘 경고는 후속 범위 |

## 4. 생성·변경 파일

| 영역 | 파일·범위 |
| --- | --- |
| 계약/클라이언트 | lib/contracts/workspace.ts, lib/api/workspace.ts, projects-store/assets-store/session-assets-store/project-cover |
| 서버 | lib/server/projects/{service,http,page}.ts, storage/service.ts, assets/lifecycle.ts, authorization/guards.ts |
| API | projects 및 stats/library/sessions, asset-sessions 및 assets, assets/:id, uploads 및 :token, files/:token |
| DB/런타임 | db/schema.ts, 0002_grey_santa_claus.sql 및 meta snapshot/journal, sharp 0.35.3·lockfile, compose.yaml, .env.example |
| 화면 | projects/assets 목록·상세·세션·3단계 page/page-content, server-session-list/project-picker/asset-gallery/workspace-data, 관련 dialog/row/workspace 컴포넌트 |
| 호환/언어 | monitoring 상세의 서버 선택 호출, lib/i18n/format.ts의 ISO 시각 표시, messages/{ko,en}/{common,projects,assets}.json, eslint.config.mjs |
| 테스트 | integration/workspace.test.ts, e2e/workspace.spec.ts, helpers/workspace-fixture.ts 및 phase4-persistence.ts, 기존 DB/i18n/auth fixture |
| 문서 | 이 보고서 MD/HTML·체크리스트·계획·증거, 전체 계획·Phase 5 인수인계, README/HANDOFF/scripts/DB 안내 |

이전 Phase의 미커밋/미추적 파일을 보존했다. 전체 git diff에는 이전 작업도 포함되므로 이번 Phase 변경 통계로 취급하지 않는다. 커밋·브랜치 변경·운영 배포는 하지 않았다.

## 5. 검증 결과

실제 명령, 종료 코드, 초기 실패와 수정 내역은 [테스트 체크리스트](phase4-test-checklist.md), 요약은 [검증 증거](evidence/phase4/verification.txt)에 있다.

| 분류 | 최종 결과 |
| --- | --- |
| 단위·번역·PostgreSQL | 12 files / 69 PASS: 단위 24·i18n 6·통합 39, 최종 11.05초 |
| Chromium | 전체 4 files / 24 PASS; 세션 썸네일 보완 후 workspace 6/6 재검증, 마지막 PATCH 보완 후 전체 24개 재검증, 중복 합산 제외 |
| 정적·빌드 | lint/typecheck/직접 tsc/production build exit 0, 신규 오류·경고 없음 |
| Docker persistence | 인증 세션·프로젝트/세션/에셋 ID 및 원본/썸네일 SHA-256이 재시작 전후 동일 |
| 파일 lifecycle | 보관 시 기존 파일 링크 404, 복구 후 200 및 checksum 동일. 영구 삭제 없음 |
| 반응형·언어 | 390/1280px·ko/en·입력/URL 보존 검증, PC/모바일 캡처 직접 확인 |
| 설정·공백 | compose config --quiet, git diff --check exit 0 |

[모바일 화면](evidence/phase4/project-mobile.png) · [PC 화면](evidence/phase4/project-desktop.png). 첫 파일 테스트의 저장 키 규약 오류·비동기 검증 계약·DB fixture 수치와 모바일 제목 레이아웃 문제를 수정했다. 마지막 코드 검토에서 확인한 Zod 4 partial/default 동작도 독립 PATCH schema로 수정하고 생략 필드 보존 검증을 보강했다. 실패/재실행 수는 성공 총계에 중복 합산하지 않았다.

## 6. 완료 게이트

| 조건 | 판정 |
| --- | --- |
| 계정별 업무 CRUD·저장 실패 표시 | 충족 |
| 타인 업무/파일 접근 및 version 충돌 강제 | 충족 |
| 원본/썸네일 재시작 보존·정리 대상 추적 | 충족 |
| 필수 검증·정적/build·실행 증거 | 충족: 필수 5 PASS, 자동 93 PASS, smoke 4 PASS |
| 계획 대비 차이·변경 파일·이월 기록 | 충족 |
| Markdown/HTML·체크리스트·문서 검증 | 아래 마무리 기록 참조 |
| Phase 5 착수 기반 | 인수 가능, 개발 범위의 기술 차단 없음 |

## 7. 이월·운영 한계

- 실제 가이드 추출/이미지 생성/검증/최종화/ZIP은 Phase 6~8 범위다. 준비 중 UI를 엔진 완료로 취급하지 않는다.
- worker 실행·재시도·만료 ticket 정리·정리 예약 소비는 Phase 5 범위다. 현재 다운로드 조회도 만료 capability 행을 생성하므로 만료 레코드 청소가 운영 활성화 전에 필요하다.
- 영구 파일/계정/감사/백업 삭제와 보존 기간은 미확정이며 비활성이다. cleanup_pending 및 참조 없음은 삭제 승인이 아니다.
- 운영 ingress의 10MiB body 제한·TLS·스토리지 용량/백업/부하·실제 복원 훈련은 배포 준비 단계에서 검증한다. 이번에는 named volume 재시작 보존만 검증했다.
- 모니터링 데이터·공급자는 아직 mock이다. 모니터링에서 선택한 private 이미지 URL의 장기 참조·재발급은 Phase 10에서 sourceAssetId 기반으로 전환한다.
- 실제 메일·OAuth·공개 관리자 추가 인증의 Phase 3 이월 정책을 유지한다.

## 8. Phase 5 인수인계

[서버 연동 가이드](../HANDOFF.md)에 endpoint/DTO/파일 상태를 기록했다. `lockActiveSession`으로 같은 transaction에서 users→세션→프로젝트를 잠그고 늦은 결과 연결을 막는다. web의 보관/정지/탈퇴도 users 잠금으로 직렬화한다. 거절된 결과 파일은 cleanup_pending으로만 남기고 부모를 부활시키지 않는다.

파일 IO 전에 reserved ledger를 commit한다. IO 시작 시 cleanup_pending, 성공 시 ready, 프로젝트 연결 시 claimed다. 만료 reserved/ready와 실패/교체 cleanup_pending을 worker가 구분해서 인수한다. 실제 삭제를 활성화하기 전 `hasStoredFileReferences` 및 보존 정책을 재검사한다. 소유 레코드 JSONB·업무 이력·job output을 무조건 삭제하지 않는다.

[Phase 4 계획](phase4-plan.md) · [Phase 5 계획](phase5-plan.md) · [실행 안내](../scripts/README.md)

## 9. 마무리 기록

합성 DB의 users/projects/sessions/assets/tickets/jobs 각각 0건을 확인했다. 테스트 전용 rate bucket, 파일, sandbox 메일 및 private 세션 파일을 정리했다. PATCH 보완 이후 재검증 fixture도 정리했다. 테스트 web/DB는 중지했고 named volume·migration·이미지는 보존했다. 실제 서비스의 영구 삭제 기능은 구현하지 않았다.

Markdown을 원본으로 standalone HTML을 생성했다. 문서 검증 3/3 PASS: Markdown 로컬 링크 43개, HTML 링크 8개·표 5개·태그 구조, MD/HTML 본문·완료 수치 일치를 검증했다. HTML은 외부 CDN·런타임 JavaScript 없이 반응형/인쇄 CSS를 포함한다.
