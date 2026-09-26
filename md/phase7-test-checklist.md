# Phase 7 임시 분석 UI 검증 체크리스트

실행일: 2026-09-23. 범위: 사용자가 요청한 임시 분석 화면. 원래 Phase 7 실연동 검증과 별도다.
환경: Node 22.22.0, pnpm 10.34.5, Next 16.3.3, Chromium, 390px.

| 항목 | 명령/방법 | 결과 |
| --- | --- | --- |
| 타입 | `corepack pnpm typecheck` | PASS, exit 0 |
| 린트 | `corepack pnpm lint` | PASS, 오류 0 / 기존 경고 6 |
| 언어팩 | `corepack pnpm test:i18n` | PASS, 2 files / 7 tests / 0 fail / 0 skip |
| production build | `corepack pnpm build` | PASS, exit 0 |
| UI 동작 | `/tmp/claps-guide-ui/check.cjs` Chromium smoke | PASS, 10개 확인 항목 |
| 변경 공백 | `git diff --check` | PASS |

UI 확인 10개: 잘못된 PDF 헤더 거절, 20MiB 초과 거절, 진행/완료/6규칙, 규칙 편집, 잘못된 교체 시 기존 결과 보존, 취소 후 늦은 완료 차단, 재분석/390px 가로 넘침 없음, 제거, 영어/새로고침 초기화, 브라우저 오류/API 요청 0건.

실제 컴포넌트·언어 provider·언어팩을 임시 esbuild harness로 묶고 `next/navigation`의 router만 stub했다. 앱 빌드 CSS를 사용했다. DB/로그인을 포함한 전체 앱 E2E 검증은 아니다. 최초 smoke에서 숨김 file input과 파일 선택 버튼이 같은 접근성 이름으로 검색되어 selector가 중복되었다. 검사 selector를 실제 button 요소로 한정한 뒤 10개 모두 통과했다. 제품 실패를 숨기거나 중간 성공을 중복 집계하지 않는다.

[모바일 캡처](evidence/phase7-ui/mobile.png)를 직접 열어 결과·버튼·줄바꿈을 확인했다. 사람의 별도 직접 클릭 검증은 수행하지 않았다.

원래 P7-T01~05(실제 추출/생성/영속 가이드/공급자 평가)는 PENDING, 사용자 요청으로 보류다. DB/API 변경이 없어 migration/DB 통합 검증은 이번 임시 UI 범위에 NOT_APPLICABLE이다. 실제 Phase 7 완료로 판정하지 않는다.
