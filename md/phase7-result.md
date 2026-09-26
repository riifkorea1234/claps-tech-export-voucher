# Phase 7 결과 — 임시 가이드 분석 UI

상태: PAUSED — 사용자 요청의 임시 UI는 완료, 실제 Phase 7 공급자 연동은 보류.
작업일: 2026-09-23. 담당: Codex 단독.

## 구현

프로젝트 상세의 브랜드 가이드 영역에서 PDF 선택/드롭 → 약 4초 단계별 진행 → 고정 규칙 6개를 표시한다. 규칙 제목·설명 편집, 재분석, 취소, 교체와 제거를 제공한다. ko/en, 390px 화면, 진행률 접근성 속성을 지원한다. 사용자 요청대로 제품 화면의 시연 배지는 생략했다.

PDF는 확장자·최대 20MiB·헤더를 확인한다. 전체 PDF 구문/암호화/페이지 수 검사는 하지 않는다. 타이머와 늦은 파일 읽기는 취소·제거·언마운트 시 무효화한다. 잘못된 교체 파일은 기존 결과를 보존한다.

## 계획 대비 변경과 한계

사용자가 공급자 연동 대신 임시 분석 흐름을 요청했다. 실제 PDF 내용 추출/OCR·가이드 저장/게시·이미지 생성·유료 호출은 구현하지 않았다. 결과는 `lib/mock/guide-analysis.ts`의 fixture이며 PDF 내용과 관계없다. 파일과 수정 내용은 컴포넌트 메모리에만 있고 새로고침/이탈 시 초기화된다. DB·jobs·실제 검증 결과에는 연결하지 않는다. 기존 미커밋/미추적 변경을 보존했다.

## 변경 파일

- `components/domain/guide-analysis-panel.tsx`: 임시 분석 흐름.
- `lib/mock/guide-analysis.ts`: ko/en 고정 규칙 6개.
- `app/(app)/projects/[id]/page-content.tsx`: 프로젝트별 key로 패널 연결.
- `messages/{ko,en}/projects.json`: UI 문구 22개씩 추가.
- 계획/전체 개발 계획·HANDOFF·체크리스트·결과 MD/HTML 및 모바일 캡처.

새 의존성·migration·서버 API·seed 변경은 없다.

## 검증

[테스트 체크리스트](phase7-test-checklist.md)에 명령·환경·한계를 기록했다.

- `corepack pnpm typecheck`: exit 0.
- `corepack pnpm lint`: exit 0, 오류 0 / 기존 경고 6.
- `corepack pnpm test:i18n`: exit 0, 2 files / 7 PASS / 0 FAIL / 0 skip.
- `corepack pnpm build`: exit 0.
- 실제 컴포넌트를 사용한 Chromium 임시 harness: 10항목 PASS. 파일 오류·분석·편집·교체·취소·재분석·제거·영어·초기화·API 요청 없음 확인. 전체 앱의 로그인/DB E2E는 아니다.
- 최초 smoke의 중복 접근성 selector를 실제 button으로 제한한 뒤 재검증했다.
- `git diff --check`: exit 0. [모바일 캡처](evidence/phase7-ui/mobile.png)를 직접 확인했다.

## 다음 작업

추가 진행은 사용자 요청 시 수행한다. 실제 Phase 7 재개 시 공급자/예산을 확정하고 고정 fixture를 영속 가이드/job 계약으로 교체한다. 원래 필수 P7-T01~05는 미실행이며 Phase 7 COMPLETED 또는 Phase 8 착수 가능으로 판정하지 않는다.
