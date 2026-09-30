# 검증 증거

2026-09-30 coder 워크트리, Next 16.3.3, synthetic PostgreSQL 17.11 전용 컨테이너의 `claps_test` (loopback 55439).

- `admin-mobile.png`: Chromium 390×844, 목록 로딩 완료 후 wrap 메뉴.
- `translation-editor.png`: 실제 DB에 저장/게시한 번역의 ko UI 상태.
- `confirm-dialog.png`: 공개 전환 확인; 실제 실행하지 않고 Esc로 취소.
- `a11y-results.json`: axe-core 4.10.2, 목록 8개·회원 상세·파트너 생성·확인 모달의 실제 검사 결과. 결과의 심각도·검사 수를 함께 확인할 것.
- `*.log`: 종료한 검증 명령의 결과. 실패 회차는 최종 통과 로그로 바뀌었으며 실패 원인과 수정은 상위 결과 보고서에 기록했다.

전체 ID별 결과와 한계는 [수정 보고서](../../admin-beginner-fixes.md)에 있다. 검사에 쓰는 계정, 세션, 리소스는 격리 fixture이며 공유 데이터는 사용하지 않는다. 원래 phase6 evidence는 보존했다.

재현: 저장소 루트에서 Corepack pnpm 10.34.5를 사용한다. 전용 `claps_test` DB와 localhost 3199의 standalone 서버를 준비하고 `TEST_DATABASE_URL`을 지정한다. axe 패키지는 임시 디렉터리에 `corepack pnpm --dir /tmp/claps-admin-a11y add @axe-core/playwright@4.10.2`로 설치한 뒤 `node md/evidence/admin-fixes/verify-a11y.cjs`를 실행한다. 다른 설치 위치는 `ADMIN_A11Y_AXE_MODULE`로 지정할 수 있다. 이 검사 스크립트는 synthetic 관리자·세션을 생성/정리하며 영어 활성 상태를 원복하므로, **반드시 전용 DB/서버에만** 실행한다.
