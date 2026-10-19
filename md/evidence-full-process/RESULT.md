# CLAPS 증빙 시드·전체 흐름 검증 결과

대상: https://claps.arcreation.work · 상태: **complete**

- 새 합성 계정 10개를 적용했다. 기존 실관리자의 비밀번호 해시·권한·상태 digest는 변경 전과 일치했다.
- DB·업로드는 변경 전 일관된 백업을 만들었다. 서버 `backup/pre-evidence-v1-20261020/`와 `backup-manifest.json`에서 확인한다.
- 서비스 시드 165단계를 실행했다. 1차 126단계 후 기존 단계를 재사용하고 페이지 나눔 39단계를 추가했다. 저장된 프로세스 검사 14건이 통과했다.
- 공개 Chromium에서 영어·일본어 각각 PDF→추출→공개→생성3후보→채택→검증3판정→최종화→ZIP→리뷰 발행→원본 업로드→모니터링을 실제 클릭해 완료했다.
- 캡처 **255장**: 언어 {'en': 121, 'ja': 106, 'ko': 28}, 기기 {'desktop': 206, 'mobile': 49}. HTML 인덱스는 `index.html`이다.
- 단위·언어팩 93개, production build, Next typegen 후 최종 TypeScript 검사가 통과했다. 최종 저장 파일 58개의 크기·SHA-256 검사 통과, 대기/실행 중 작업 0개다.
- 실제 ZIP 2개의 CRC·PNG 내용·SHA-256을 독립 Python reader로 검사했다. 리뷰 출력 PDF 2개도 보관했다.

최종 DB 집계: users 11, projects 49, asset_sessions 48, brand_guides 9, assets 21, jobs 43, partners 7, localized_contents 21, monitoring_records 16, monitoring_feedback_events 6, evidence_events 113, review_package_snapshots 4, admin_audit_logs 136.

새 계정과 비밀번호는 `ACCOUNTS.md`에만 기록하고 0600 및 해당 파일만 지정한 Git ignore로 보호했다. 서버/DB/API/기존 관리자 비밀은 문서에 넣지 않았다. 로컬 `private-state.json` 역시 0600·정확한 ignore로 보호한다. 부모 F: 드라이브는 POSIX 0600을 표현하지 않아 새 계정 파일 하나에만 상속을 끈 Windows 현재 사용자+SYSTEM ACL을 적용했다. 드라이브 mount나 다른 파일·사용자 권한은 변경하지 않았다. 실제 검증값은 `sync-receipt.json`에 있다.

실제 AI·외부 검색·메일·OAuth는 연결되지 않았다. 생성·추출·검증·모니터링은 정확히 지정된 증빙 계정에만 허용한 **합성 샘플 공급자**로 실행했고, 일반 사용자의 결과를 가짜 평가로 대체하지 않았다. 추천은 기존 `rules-v1` 엔진을 사용했다. 리뷰 문서 출력은 현재 제품 계약상 일본어다.

최초 관측(기대 HTTP값/일본어 선택자/비동기 checkbox/응답 본문 대기/재인증 제한)은 `HARNESS-OBSERVATIONS.md`와 원본 JSON에 남겼다. jobs 배경 RSC 502는 1회 관측됐고 서버에는 destination stream closed early 로그가 있었다. 원인은 확정하지 않았으며 동일 RSC 경로를 5회 다시 요청해 모두200을 확인하고 최종 화면을 캡처했다.

재실행: `RUNBOOK.md`. 상세 커버리지 및 미연동 범위: `COVERAGE.md`. 전체 판정: `verification.json`.

작업 위치: `/home/arcreation/orca/workspaces/claps-product/evidence-full-process` · branch `ARCreation/evidence-full-process`.
Run `run_5d77a4bd650f` / Task `task_8bc3e4c471a5` / Dispatch `ctx_01387ac4dab3`.
