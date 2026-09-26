# Phase 11 결과 — 통합 회귀·다국어 확장·Docker 백업/복구

상태: **IN_PROGRESS — 독립 로컬 범위 구현·검증 완료, 실제 공급자·운영 출시 게이트 BLOCKED.**
작업일: 2026-09-24, Codex 단독. 사용자 요청에 따라 로컬 검증을 수행했으며 Phase 7·8·10 공급자 보류와 Phase 9 사업 품질 검수 대기는 유지했다. 전체 제품 출시나 Phase 11 COMPLETED를 선언하지 않는다.

## 구현 결과

- 전체 회귀에서 실제 API 오류가 `Text unavailable`로 표시되는 문제를 수정했다. 공통 클라이언트 언어팩에 errors를 포함하여 화면과 언어 변경 응답에서 같은 번역을 사용한다.
- API 요청·추천/탐지 작업의 ko/en 고정값을 제거하고 선택한 canonical 언어 코드를 전달한다. 서버 오류와 sandbox 메일은 배포 파일팩을 읽는다. 파일팩 읽기를 독립 모듈로 분리했고, 파일 로드 장애 시 API 오류는 기존 ko/en 메시지로 안전하게 대체한다.
- 영어 기반 en-GB 시험 locale을 파일 생성→이미지 배포→관리자 등록→초안/게시→활성화→입력/계정 선호 유지→비활성화까지 검증했다. 메일 본문과 작업 snapshot의 언어도 검사했다. migration/컬럼 추가는0건이다. 시험 파일팩은 검증 후 작업 트리에서 제거했다.
- DB와 파일을 정지 시점에 함께 백업하고 빈 환경에만 복구하는 도구를 추가했다. 실행 중 서비스·기존 데이터 덮어쓰기·손상 checksum·위험 tar 경로를 거절하고 이미지 ID를 기록한다.
- 랜딩 푸터의 미연결 `href="#"`를 비활성 텍스트로 바꿨다. 실제 사이트/약관/문의 링크는 제공되지 않았으므로 임의 주소를 만들지 않았다.
- 구형 UI locator와 실제 worker에 경쟁하던 테스트 fixture를 수정했다. Docker test 이미지에 ZIP 검증용 Python3를 추가했다. 운영 web/worker의 Python 의존성은 추가하지 않았다.

## 실행 증거

**고유 자동 테스트 32 files / 196 PASS / 0 FAIL/skip**: 단위42+i18n8+통합111+Chromium35. 반복 실행을 중복 집계하지 않는다. production build/typecheck/lint exit0, lint 오류0·기존 경고2·신규 경고0. 상세 명령과 초기 실패·수정 기록은 [체크리스트](phase11-test-checklist.md)에 있다.

백업3.896초, 빈 환경 DB+파일 복구3.562초, 복구 시작부터 migration/seed·web/worker 기동·HTTP smoke까지17.574초. 파일34개 전체 SHA-256 일치, 합성 계정/선호·모니터링 원본·파트너·게시 번역 행 checksum 일치. source/recovery의 프로젝트/세션은 비어 있어 이들의 실데이터 복구 검증으로 확대 해석하지 않는다. [복구 대조](evidence/phase11/parity.json), [백업 manifest](evidence/phase11/backup-manifest.json).

이전 Phase10 web과 보존된 Phase10 코드 snapshot의 worker로 복원하여 health·인증·원본 접근과 미지원 en-GB fallback을 확인했다. SSR은 en, 해당 콘텐츠는 원문으로 대체되며 DB 번역/선호는 보존된다. 최신 시험 이미지로 돌아오면 en-GB 게시 번역이 다시 표시된다. 이전 worker 검증은 별도 production tag가 아닌 Phase10 test 이미지에서 production 명령을 실행한 범위다.

Readiness 부하 smoke: 100회·동시5·오류0, p95 173.76ms, 34.5req/s. 공급자 생성/검색 부하가 아니며 운영 성능 합격 기준으로 사용하지 않는다. RPO/RTO도 운영 목표가 미정이므로 충족 판정을 내리지 않는다.

## T-01~24 최종 대조

PASS는 아래 명시한 개발/격리 범위의 판정이다. 공급자 보류 영역을 포함한 전체 제품 검증 완료를 의미하지 않는다.

| ID | 판정 | 근거와 한계 |
| --- | --- | --- |
| T-01 | PASS | production build/typecheck/lint; 기존 경고2 |
| T-02 | PASS — 개발 | 인증·프로필·복구 E2E; 실제 메일은 보류, sandbox 검증 |
| T-03 | PASS — 구현 범위 | 사용자 A/B·일반/관리자·파일·jobs 권한 회귀 |
| T-04 | PASS | 서버 CRUD·검색·페이지·version·없는 ID |
| T-05 | PASS — 구현 범위 | 원본/썸네일/ZIP 권한·형식·경로·만료; 실제 PDF/외부 수집은 보류 |
| T-06 | PASS | 멱등·제한·worker SIGKILL/SIGTERM·lease·응답 불명 |
| T-07 | BLOCKED | 실제 PDF 추출·규칙 게시/생성 Phase7 보류, 시연 fixture 유지 |
| T-08 | BLOCKED | 최종화/ZIP 서버 회귀 PASS; 실제 생성→검증 전체 연결 없음 |
| T-09 | PASS — 주입 근거 | stale/반려/미검증/동시 확정 차단; 실제 검증 품질 아님 |
| T-10 | PASS — 규칙 기반 | 저장·재추천·비공개 제외·실제 로컬 worker; 사업 데이터 검수 대기 |
| T-11 | BLOCKED | 기록·원본·실행 이력/상태 계약 PASS, 실제 검색 공급자 없음 |
| T-12 | PASS — 개발 | 관리자 권한·추가 인증·CRUD·감사; 실가이드/검색 실행 보류 |
| T-13 | PASS — 보존 정책 | 보관/탈퇴·늦은 결과 차단; 물리 영구 삭제 비활성 유지 |
| T-14 | PASS — 로컬 | 새 Compose 볼륨·migration/seed 멱등·재시작·web/worker health |
| T-15 | PASS — 로컬 표본 | DB+파일 빈 환경 복구·원본/계정/번역·이전 이미지; 운영 RPO/RTO 미정 |
| T-16 | BLOCKED | 제한/장애 회귀 및 readiness 관측만 완료; 공급자/합의 성능·비용 기준 미정 |
| T-17 | PASS | 오류·빈 상태·새로고침·모바일 회귀 및 오류 번역 수정 |
| T-18 | PASS — 자동 검증 | ko/en key·변수·정적 호출·미추출 UI·메일·게시본; 사람 번역 검수 별도 |
| T-19 | PASS — 구현 범위 | 초안/게시·원문 revision·fallback·순환 거절 |
| T-20 | PASS | 콘텐츠 import/export·원자성·충돌·악성 필드/권한 |
| T-21 | PASS — 시험 locale | en-GB 배포·등록·게시·활성화/비활성·schema 변경0 |
| T-22 | PASS — 로컬 | 게시 후60초 내 반영·재시작/seed·백업·이전 파일팩 fallback |
| T-23 | PASS | PC/390px·키보드·입력/정렬/URL 유지·job 재실행 없음 |
| T-24 | PASS | SSR/cookie·새로고침·계정 선호·편집 대상 언어 분리 |

## 변경 범위와 운영 인수인계

주요 변경: `lib/i18n/{core,packs,server}.ts`, API client/계정 wrapper, 오류/메일 처리, 매칭/탐지 locale 계약, 해당 사용자/관리자 화면과 `app/page.tsx`, Dockerfile test stage. 신규 테스트: `tests/unit/phase11.test.ts`, `tests/e2e/phase11.spec.ts`; 기존 i18n/job/추천/workspace 회귀 보완.

새 운영 도구: [백업·복구](../scripts/backup-restore.py), [로컬 health 부하](../scripts/health-load.py), [시험 언어팩 생성](../scripts/phase11-locale.mjs), [합성 복구 smoke](../scripts/phase11-recovery-check.mjs). 재현 절차는 [실행 안내](../scripts/README.md), 계약은 [HANDOFF](../HANDOFF.md)를 따른다. 기존 사용자 변경은 되돌리지 않았다. SQL migration·운영 seed 변경은 없다.

백업은 전체 writer 중지와 신뢰한 저장소를 전제로 한다. 도구는 지정한 Compose 프로젝트의 실행 서비스만 확인하며 외부 DB writer까지 잠그지 않는다. 복구 실패 시 서비스를 자동 재개하거나 볼륨을 삭제하지 않는다. 이전 이미지 복원에는 기존 schema와의 호환 확인이 필요하며 강제 down migration은 하지 않는다.

## 남은 출시 조건

- Phase7 PDF/규칙 게시·이미지 생성과 Phase8 검증, Phase10 실제 검색 공급자·평가 데이터·원본 외부 전달 조건.
- 실제 파트너 사업 데이터/품질, ko/en 사람 번역 검수, 랜딩의 실제 외부 링크 대상.
- 배포 호스트·도메인/TLS·실메일·관리자 운영 공개 정책, 별도 백업 저장소/주기·RPO/RTO·성능/비용 목표·보존/영구 삭제 정책.
- 런타임의 `guide-analysis-panel`은 사용자 요청으로 고정 시연 규칙을 계속 사용한다. 따라서 핵심 mock 의존0건 조건은 미충족이다. `monitoring-store.ts`의 localStorage 코드는 남아 있지만 런타임 호출자는 없다. 다른 사용 중 store는 서버 API wrapper다.

이 항목을 보류 목록으로 숨겨 COMPLETED로 처리하지 않는다. 운영 공개는 아직 검증된 상태가 아니다.

최종 정리: 기본 ko/en web/worker 이미지 빌드와 복구 smoke도 PASS다. 두 복구 시험 DB의 합성 계정/기록/jobs/tickets는0건으로 정리하고 검증 서비스를 중지했다. 임시 메일·세션 파일·시험 언어팩은 제거했으며, 격리 볼륨/이미지와 접근 제한된 합성 백업은 보존했다. [정리 증거](evidence/phase11/cleanup.json). MD/HTML 본문·로컬 링크·1280/390px 렌더와 가로 넘침 검사를 통과했다.
