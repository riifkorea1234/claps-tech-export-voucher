# Phase 7 상세 개발 플랜 — 가이드 PDF·규칙 버전·실제 이미지 생성

## 1. 기본 정보

| 항목 | 내용 |
| --- | --- |
| Phase | 7 |
| 상태 | `PAUSED` — 요청된 임시 분석 UI 완료; 실제 공급자 연동은 보류 |
| 작성일 | 2026-09-22 |
| 예상 기간 | 6~9 작업일; 1명 순차 수행 기준 초기 추정, 외부 결정·계정 준비 대기 제외. 착수 조사 후 재산정 |
| 담당 | 백엔드·프론트엔드·AI 연동·운영 (Codex 단독 수행) |
| 요구사항 추적 | GUIDE-01, GEN-01~04, PROJ-03 실제 이미지 |
| 전체 검증 연결 | T-07·T-08 생성/채택, T-05 PDF/이미지, T-06·T-16 공급자, T-19 가이드 번역 |

문서 작성은 구현 시작이나 Phase 완료를 의미하지 않는다. 선행 결과와 이 Phase의 필수 결정을 확인한 뒤 `READY`로 변경하고 계획을 공유한다. 이후 `IN_PROGRESS → EXECUTED`로 진행하며, `COMPLETED`는 완료 게이트를 충족한 결과 보고서의 판정이다. 미결정 사항으로 구현을 시작할 수 없으면 원인과 재개 조건을 적고 `BLOCKED`로 변경한다.

## 2. 배경과 목표

PDF를 실제로 저장/추출하고 검토된 가이드 버전으로 이미지를 생성해 채택할 수 있게 한다.

## 3. 입력 자료와 이전 Phase 인수인계

- [전체 개발 플랜](development-plan.md): 제품 범위·DB/API 계약·최종 완료 기준의 기준 문서.
- [Phase 진행 규칙](phase-development-process-rules.md): 시작·테스트·보고·완료 게이트.
- [기존 연동 가이드](../HANDOFF.md), [저장소 설명](../README.md), [AGENTS.md](../AGENTS.md).
- [Phase 6 계획](phase6-plan.md)과 [체크리스트](phase6-test-checklist.md), [결과](phase6-result.md), [HTML](phase6-result.html)을 확인했다. 2026-09-23 결과는 `COMPLETED`, 필수 5 PASS, 자동 고유 142 PASS/0 FAIL/0 skip이다. Phase 6 선행 완료 게이트는 충족되었고 Phase 7 자체 결정 게이트가 남아 있다.
- 필요한 인수인계: Phase 6 가이드 shell/번역 계약, Phase 5 job/adapter, Phase 4 파일/에셋/프로젝트 소유권.

후속 Phase를 미리 계획하는 것은 허용하되 구현은 번호 순서대로 진행한다. 이전 Phase의 실패·차단·이월 항목이 이 단계의 완료 기준에 영향을 주면 먼저 해결하거나 범위/계약 변경을 기록한다.

## 4. 현재 상태 조사

2026-09-23 착수 조사: 기존 Phase 1~6 미커밋·미추적 변경이 다수 존재하며 보존한다. 프로젝트 화면의 가이드 영역과 생성 버튼은 후속 기능으로 비활성화되어 있다. 과거의 임의 점수/gradient 생성 설명은 현재 화면 상태와 다르다.

- `package.json`: Next 16.3.3, Node 22.22.0/pnpm 10.34.5 요구, lint/typecheck/build 및 unit/integration/i18n/E2E·migration·seed 스크립트가 존재한다. 설치된 Next 로컬 route-handlers 및 data-security 가이드를 확인했다.
- `brand_guides`는 파일·규칙·status·version·row_version·source_revision 및 프로젝트별 버전 유일성이 있고 projects.active_guide_id는 같은 프로젝트 가이드 FK를 사용한다. 새 migration 필요 여부는 구현 계약 확정 시 판단한다.
- `lib/server/adapters/registry.ts`의 운영 handler registry는 비어 있다. jobs는 dispatch 기록, 파일 IO 전 reserveFile, 결과 commit 시 소유자/부모/lease/cancel 검사와 DB-only apply 계약을 제공한다.
- 현재 generation 입력은 sessionId/prompt/guideId/outputLocale뿐이다. 스타일·비율·장수·모델·게시 규칙 snapshot 계약을 보완해야 한다. 현재 output assetIds만으로는 부분 실패 정보를 표현하지 못한다.
- `syncOriginal`과 관리자 `AdminAccess.run`·감사를 재사용한다. 규칙의 조건·근거는 원본에 유지하고 번역에는 ruleId/title/description만 허용한다.
- `.env.example`에는 추출/생성 공급자 설정이 없다. 실제 계정·모델·평가 데이터·예산의 준비 여부는 아직 확인되지 않았다. 비밀 값은 조사 출력이나 문서에 기록하지 않는다.

## 5. 구현 범위

PDF 업로드/해제/다운로드, 추출/OCR job, 규칙 초안/검토/새 버전 게시, 가이드 번역 연결, 생성 공급자 adapter, 입력 snapshot·outputLocale·실제 이미지/썸네일·채택, 생성 UI와 어드민 가이드 실기능을 구현한다.

이 단계에서 추가·변경하는 사용자/관리자 문구는 ko/en 파일 언어팩에 함께 반영한다. 업무 데이터 번역은 `localized_contents`만 사용하고, 고정 UI·랜딩·메일 문구는 DB로 옮기지 않는다.

## 6. 제외 범위

검증 판정·최종 확정·ZIP은 Phase 8. 신규 AI 모델 학습, 공급자가 지원하지 않는 DSL/VLM 기능을 임의 주장하지 않는다.

결제·구독, 조직 협업, 범용 CMS, 자동 침해 신고는 전체 초기 범위에서 제외한다. 새로운 비용·제품 정책·공개 계약이 필요하면 구현 전에 전체 플랜과 이 문서의 변경 이력을 갱신한다.

## 7. 결정·가정·질문

추출/생성 공급자·모델·비용/품질 기준·sandbox/운영 계정, 무가이드 생성 허용, 4장 요청의 상한/부분 실패 정책을 확정한다. 게시 가이드 덮어쓰기 금지·진행 중 input snapshot 불변·생성 후 프로젝트 이동 제약을 적용한다.

2026-09-23 결정 요청: 공급자·모델/기존 엔진 유무, 실제 테스트 계정 준비 여부·허용 예산, 무가이드 생성 허용과 4장 중 부분 성공 처리를 사용자에게 질문했다. 공급자가 정해지지 않았다면 공식 자료 기반 후보·비용 비교부터 제안하는 선택지를 제공했다. 답변 전 공급자 선택이나 유료 호출을 확정하지 않는다.

- 사용자 확정(2026-09-23): 무가이드 생성 허용, 성공 이미지 보존과 부분 실패 명시. 게시본 불변과 생성 후 프로젝트 이동 차단은 기존 계약 유지. 무가이드 생성 허용은 Phase 8 검증/최종화 허용을 의미하지 않는다.
- 사용자 요청: 공급자·모델·비용 기준을 먼저 비교 제안한다. [공급자 제안](phase7-provider-proposal.md)을 작성했으며 공급자 선정·예산·유료 호출은 아직 승인되지 않았다.
- 공급자 선택 후 확정할 수치: PDF 크기/페이지 제한, 결과 이미지 용량·장수 상한, 요청별 비용 제한, 품질/지연 합격 기준 및 승인된 평가 fixture. 기존 Phase 5 공통 제한은 그대로 인수한다.
- 재개: D-05/06/07의 해당 구현 결정을 기록하고 구체 adapter/API 계약·평가 기준을 보완한 뒤 `READY` 계획을 공유하여 P7-01부터 실행한다. 계정/유료 평가만 준비되지 않은 경우 독립 개발 가능 범위를 명시하고, P7-T05는 실제 평가 전까지 BLOCKED로 유지한다.

권장안과 확정 사항을 구분한다. 이 문서 작성에는 추가 승인이 필요하지 않으며, 미결정 항목은 해당 구현의 시작 게이트에서 해결한다. 실제 과금·메일 발송·외부 데이터 변경 검증은 진행 규칙 8.6에 따라 승인된 대상과 환경에서만 수행한다.

## 8. 작업 분해와 실행 순서

위에서 아래 순서로 진행한다. 각 작업의 선행 산출물을 확인하고 담당 영역이 산출물·검증 증거를 남긴다.

| 작업 ID | 작업 | 산출물 | 의존성 | 담당 영역 | 검증 |
| --- | --- | --- | --- | --- | --- |
| P7-01 | 추출/생성 adapter 계약과 평가 fixture 확정 | 엔진/모델/출력/오류 계약 | Phase 6 및 공급자 결정 | AI/백엔드 | P7-T01 |
| P7-02 | PDF 보관·추출·초안·버전 게시·번역 연결 | brand_guides·가이드 관리 실기능 | P7-01 | 백엔드/프론트 | P7-T02 |
| P7-03 | 생성 요청·snapshot·이미지 저장·부분 실패 처리 | 실제 assets·job 증거 | P7-01~02 | 백엔드 | P7-T03 |
| P7-04 | 프롬프트/스타일/비율·이미지/채택 UI 연결 | 실제 카드·lightbox·상태 | P7-03 | 프론트 | P7-T04 |
| P7-05 | 실제 공급자 평가와 장애/버전 회귀 검증 | 비용/품질/실패 보고 | P7-02~04 | AI/검증 | P7-T05 |

## 9. 예상 파일/API/DB/화면 영향

다음은 예상 경로다. 아직 없는 경로는 생성 예정이며 도구 선택으로 경로가 달라지면 구현 전에 기록한다.

- 생성/변경: `lib/server/guides/`, `lib/server/generations/`, 공급자 adapter·worker handler·관련 `app/api/`.
- 변경: `app/(app)/projects/[id]/page.tsx`, `components/domain/asset-workspace-body.tsx`, `asset-result-card.tsx`, `image-lightbox.tsx`, `app/admin/guides/`.
- 변경: 가이드/생성 DTO·언어팩·fixture·provider contract/평가 테스트.

| 영역 | 영향 |
| --- | --- |
| DB migration | brand_guides 버전 유일성·active guide 참조, assets generation_job_id/file·채택, jobs input/output/provider 증거. 필요 제약은 migration. |
| seed | 승인된 평가 PDF/규칙·생성 입력·가이드 ko/en fixture. 운영에 가짜 성공 결과 seed 금지. |
| API 계약 | /api/projects/:id/guides, /api/guides/:id, DELETE /api/projects/:id/guide, /api/asset-sessions/:id/generations, /assets 목록·채택, /api/admin/guides. |
| 화면 | 가이드 업로드/추출/검토/게시/해제·실제 생성 진행/실패/이미지/채택. 검증 전 통과 배지 제거·더보기 동작 구현 또는 제거. |
| 인프라 | PDF/OCR/이미지 처리는 worker, 공급자 설정·timeout·결과 수/파일 크기 제한. |
| 삭제 | 기본적으로 삭제 파일 없음. 기존 store/mock은 호출자 전환과 참조 검색이 끝난 뒤 해당 Phase 소유 범위에서만 제거한다. |

## 10. 테스트 계획

기본 검사: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`. Phase 1에서 제공할 목표 명령은 `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm test:i18n`, `pnpm db:migrate`, `pnpm db:seed`다. **위 scripts와 `pnpm typecheck`가 존재함을 확인했다. 이번 착수 조사에서는 테스트를 실행하지 않았다.** 구현 후 격리 DB/production web에서 실제 명령·필터·결과를 체크리스트에 기록한다. 테스트가 0개이거나 필수 suite가 skip이면 통과로 처리하지 않는다.

텍스트/스캔/손상/빈 규칙 PDF, 게시 v1/v2, A/B 프로젝트, timeout/부분 생성 fixture. test adapter 후 승인된 실제 공급자로 합의한 평가 데이터 검증.

아래는 **실행 전 검증 설계**다. 구현이 끝나면 `phase7-test-checklist.md`에 환경·명령/절차·실제 결과·종료 코드·suite/test 성공/실패/skip 수·실패 원인·수정·재검증을 기록한다. 해당 Phase에 적용하지 않는 테스트 범주는 삭제하지 말고 `NOT_APPLICABLE` 사유와 이후 검증 Phase를 기록한다.

| ID | 필수 여부 | 분류 | 명령 또는 실행 절차 | 기대 결과 | 현재 상태 |
| --- | --- | --- | --- | --- | --- |
| P7-T01 | 필수 | 계약/단위 | 허용 형식·입력·스타일/비율/프롬프트·출력 언어·엔진 버전 검증 | 무시되는 입력 0건·잘못된 응답 거절 | PENDING |
| P7-T02 | 필수 | 통합/E2E | PDF→추출→검토→게시→수정/재추출→새 버전·번역 | 원본/초안/게시 구분·과거 버전 보존·번역이 규칙 의미 변경 안 함 | PENDING |
| P7-T03 | 필수 | 생성/권한 | 생성 중 프로젝트/가이드 변경·부분 실패·파일 저장 실패·타인 접근 | snapshot 불변·실제 파일만 assets 반영·안전한 오류/권한 | PENDING |
| P7-T04 | 필수 | E2E | 프롬프트 입력→생성→실제 이미지/확대→채택→새로고침 | 입력 반영·파일 보존·채택 일관·검증 전 통과 표시 없음 | PENDING |
| P7-T05 | 필수 | 공급자/장애 | 승인된 실제 엔진 평가·timeout/응답 유실/worker 중단 | 합의 품질·비용/지연 충족·중복 재과금 방어·실제 증거 확보 | PENDING |

기본 코드 검사는 코드가 변경되는 Phase마다 필수다. 표의 필수 검증 중 하나라도 `FAIL/BLOCKED/PENDING`이면 완료할 수 없다. test adapter/sandbox 통과와 실제 공급자 품질 검증을 구분한다.

## 11. 완료 조건

- [ ] 가이드 원본/초안/게시/과거 버전이 보존되고 관리된다.
- [ ] 실제 공급자 이미지가 파일로 영속화되며 입력 snapshot과 연결된다.
- [ ] 실제 공급자 평가를 통과했다. test adapter만으로 완료하지 않는다.
- [ ] 작업별 필수 검증이 모두 `PASS`이고 미실행을 성공으로 기록하지 않았다.
- [ ] 상세 계획 대비 차이, 변경 파일, 실제 명령·결과 및 이월 항목을 기록했다.
- [ ] `phase7-test-checklist.md`, `phase7-result.md`, `phase7-result.html`을 실제 실행 후 작성했다.
- [ ] MD/HTML 상태·수치·미완료·인수인계가 일치하고 문서 링크/HTML 구조가 검증되었다.
- [ ] 다음 Phase를 막는 미해결 항목이 없다.

## 12. 위험과 대응

공급자 계정/품질이 준비되지 않으면 구현은 가능해도 필수 실제 검증은 BLOCKED다. PDF 추출 품질은 문서 유형별로 평가하고 빈/불명 규칙을 성공으로 게시하지 않는다.

## 13. rollback/복구

신규 생성/추출 등록을 중지·기존 job/비용 상태를 정리한 뒤 adapter/이미지 복원. 이전 게시 가이드로 활성 참조를 바꾸되 새/과거 버전과 생성 파일은 보존한다.

사용자 변경을 포함한 작업 트리를 통째로 초기화하지 않는다. 적용한 migration과 코드 버전의 호환성을 확인하며, 데이터가 존재하는 환경의 파괴적 되돌리기는 백업/복구 검증 없이 실행하지 않는다.

## 14. 결과 증거와 다음 Phase 인수인계

결과 증거: 원본 checksum·버전 이력·추출 검토·입력 snapshot·실제 이미지·공급자 평가/비용/실패 결과.

다음 단계: [Phase 8](phase8-plan.md)에 게시 규칙/가이드 버전·실제 에셋·채택 상태·검증 입력 계약·출력 언어를 전달한다.

구현·검증 후 생성할 파일은 `phase7-test-checklist.md`, `phase7-result.md`, `phase7-result.html`이다. 현재 미생성 파일은 완료 증거로 링크하지 않는다. HTML은 외부 CDN/런타임 JavaScript 없이 단일 파일·반응형·인쇄 CSS로 작성한다. 로그·화면 증거에서 secret, 세션 쿠키, 개인정보, 비공개 원문을 제거한다. MD를 원본으로 삼고 두 보고서에 같은 완료 판정과 수치를 기록한다.

## 15. 변경 이력

| 날짜 | 변경 | 근거/상태 |
| --- | --- | --- |
| 2026-09-22 | 전체 개발 플랜을 Phase별 상세 계획으로 분할 | 사용자 요청·Phase 진행 규칙 반영; `DRAFT`, 구현/테스트 미착수 |
| 2026-09-23 | Phase 6 완료·실제 코드/스크립트·Next 가이드 확인, 오래된 조사 수정, D-05/06/07 질문과 재개 조건 기록 | 선행 완료 충족; 자체 결정 대기 `BLOCKED`, 제품 코드/DB 변경·테스트 실행 없음 |

## Phase 6 구현 인수인계 (2026-09-23)

관리자 7개 메뉴의 guide 목록/상세와 표시 번역 편집 기반이 추가되었다. 실제 PDF 추출·규칙 조건 편집·가이드 버전 게시는 본 Phase 소유다. 원문 변경 transaction에서 `syncOriginal`로 ko 원문 게시본을 동기화하고 source_revision을 증가시킨다. 번역에는 원본의 ruleId/title/description만 허용하며 조건·판정은 수정하지 않는다. DB 게시 revision과 draft revision을 구분한다. 관리자 API는 `AdminAccess.run`의 15분 세션 재확인과 감사 경계를 재사용한다. 엔진 재시도는 안전 실패만 허용하고 PROVIDER_UNKNOWN을 재호출하지 않는다. 자세한 계약은 HANDOFF.md의 Phase 6 절을 따른다. Phase 6 최종 판정은 결과 보고서에서 확인한다.

### 2026-09-23 사용자 결정 및 공급자 조사

무가이드 생성/부분 성공 보존 정책을 확정했다. 공식 문서 기반 공급자 비교·평가 예산 제안은 별도 문서에 기록했다. D-06/07 결정 대기는 유지하며 실제 API 호출과 제품 구현은 수행하지 않았다.

### 2026-09-23 사용자 요청으로 보류

사용자가 실제 구현을 하지 않고 보류하도록 요청했다. Phase 7은 조사·제안 수준에서 중단한다. 제품 코드·DB 변경, 공급자 연동, 유료 호출 및 구현 테스트는 수행하지 않았다. 기존 정책 결정과 제안은 참고용으로 보존하며 완료로 판정하지 않는다. 사용자 재개 요청이 있을 때 이어서 진행한다.

### 2026-09-23 임시 분석 UI로 범위 변경

사용자가 실제 분석 대신 분석처럼 보이는 흐름을 요청했고 화면의 시연 표시는 생략하도록 지정했다. 승인 범위는 프로젝트 상세의 PDF 선택 → 단계별 진행 → 고정 규칙 결과 표시·수정·재분석·제거다. ko/en을 지원한다. 공급자 API, 실제 PDF 텍스트 추출/OCR, DB 가이드 저장/게시, 이미지 생성은 구현하지 않는다. 임시 규칙은 코드에서 fixture로 명시하며 실제 Phase 7 완료 증거로 사용하지 않는다. 재개 요청은 이 임시 UI에 한정하며 이전 공급자 선정/과금 제안을 승인한 것으로 해석하지 않는다.

구현 파일: `components/domain/guide-analysis-panel.tsx`, `lib/mock/guide-analysis.ts`, 프로젝트 상세 연결 및 ko/en projects 언어팩. PDF는 브라우저 메모리에서 이름·크기·헤더만 확인하고 업로드하지 않는다. 화면을 떠나거나 새로고침하면 초기화된다. 프로젝트별 컴포넌트 key로 결과 혼합을 막고 취소/교체/언마운트 시 진행 타이머와 늦은 파일 읽기 결과를 무효화한다.

검증: lint/typecheck/build, 기존 i18n 검사, 브라우저에서 선택·진행·완료·규칙 편집·재분석/취소·잘못된 파일·제거를 확인한다. 임시 UI 결과 보고는 별도로 남기며 원래 P7-T01~05 완료로 처리하지 않는다.

임시 UI 검증 완료: typecheck/lint/build 통과, i18n 7 PASS, Chromium smoke 10항목 PASS. [결과](phase7-result.md)와 [체크리스트](phase7-test-checklist.md)에 실제 범위와 한계를 기록했다. 원래 실연동 Phase 7 완료는 아니다.
