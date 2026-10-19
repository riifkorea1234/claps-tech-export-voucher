# Phase15 samecoder 수정·종료 — localCOMPLETED

2026-10-01, live task_77e6f02cf8a5 / ctx_67c2216408be. 실제 /mnt/f/claps-product. 원본 [review](phase15-review.md) **CHANGES_REQUESTED C0/M1/m1/n5**를 보존했다. 원본 SHA256 `31c60c989dcd4a2eccb5336482e61248663ec6da06062638300118dce92c2f48`. 원본 review/evidence rewrite 0, 독립 APPROVED 주장 0. 사용자 1회 review→samecoder closure 위임을 root의 새 live TASK가 적용해 blocking+선택 nit 수정/PASS/조건 인계 시 localCOMPLETED를 허가했다. 직접 사용자 발언을 새로 만들어 인용하지 않았다.

| 지적 | 실제 처리 | 검증/상태 |
| --- | --- | --- |
| M1 | attempt에 baseSequence 결속; action/reason/sequence가 같을 때만 key replay | CLOSED: 실제 두 탭 A/B에서 원장 +1행/새 key/UI 일치, success receipt와 reload 경합, 정상 성공 뒤 다른 reason, 기존 reply loss/rapid click PASS |
| m1 | 공용 regex DB 이름 가드 + 127.0.0.1:55437/protocol/query/hash/63자 검사; migration target/prefix/predecessor 명시 env | CLOSED: claps_test_fix15 실제 helper, 새 clone 5경로 apply/replay/행 보존/old Auth; 기존 이름 충돌 및 unsafe prefix 사전 거절 PASS |
| n1 | locale NumberFormat 최대 소수 1자리, 정수는 정수 표시 | CLOSED: 33.3333333→33.3%, 저장/aria numeric 원값 불변, raw 79.9999/89.9999 등급 유지 PASS |
| n2 | 신고↔철회 라벨 전환, aria-pressed 제거 | CLOSED: 지역화 title/aria-label, role=status의 live 상태, 숨긴 svg, Enter/focus/재로드 PASS |
| n4 | POST/DELETE 인증→CSRF→strict no-query→bounded JSON→원장 write; 명시 GET/HEAD/PUT/PATCH/OPTIONS405 | CLOSED: 비인증 malformed/nonJSON/70KiB401, query422, CSRF403, authorized malformed/nonJSON/70KiB400, HEAD body0/Allow POST, DELETE/private no-store PASS |
| n3 | rate/원장 규모 정책을 Phase17 조건으로 문서 인계 | **HANDOFF, 미구현**: 임의 길이 제한/원장 삭제 0 |
| n5 | 운영 migration owner≠app role을 Phase17 조건으로 문서 인계 | **HANDOFF, 미충족**: 현재 owner는 trigger 우회 가능; 운영 role 분리/Phase17 local fixture 증명은 예정 |

기술 필수 미해결 0, 수정 CLOSED 5(M1/m1/n1/n2/n4), nonblocking [Phase17 조건 인계 2](evidence/phase15/fixes/phase17-conditions.md). 이 두 건을 코드 수정/운영 충족으로 집계하지 않는다. 원본 0012/SQL/meta/서버 request hash/serial lock/immutable jobs.output 변경 0. 수정 core8(기존6/신규2), report 문서6; 실제 [SHA manifest](evidence/phase15/fixes/files-modified.json).

고유 자동시험 **314 PASS** = unit67/integration168/i18n9/productionE2E69/demo1. 이번 fix 신규7(3unit/4E2E), Phase15 전체 신규26(7unit/10integration/9E2E); 반복 PASS를 추가 집계하지 않았다. 전체 첫 production 실행68PASS/1FAIL→raw Buffer HTTP 복구1PASS, 최종3팩 release의 관련9PASS. 모든69건이 마지막 build에서 실행됐다고 주장하지 않는다. migration/guard/실제 두 재시작/직접 UI 검수는 별도 검증이다.

최초 실패/복구: own DB bootstrap .ts의 top-level await CJS 오류로 bootstrap/migrate/seed 실패→.mts 형식 복구, 모두 exit0. 새 HTTP 시험의 JSON Content-Type 문자열을 Playwright가 유효 JSON 문자열로 직렬화하여 기대400 대비422→raw Buffer로 실제 malformed 본문 전달, 상태 코드 기대를 완화하지 않고 PASS. 제품 소스 추가 수정 없이 fixture만 바로잡았다. 최초 로그/trace 보존. Phase12 native exit139 원인은 계속 미확정.

[결과 MD](phase15-result.md)/[동일 HTML](phase15-result.html), [체크리스트](phase15-test-checklist.md), [계획 §18](phase15-plan.md#18-samecoder-review-fixclosure-executed), [handoff](phase15-handoff.md), [actual ledger](evidence/phase15/fixes/execution.jsonl). Phase11 전체 IN_PROGRESS/외부 BLOCKED 유지. Phase16/clear 실행0/root만 관리.

실제 execution.jsonl SHA256 `a2350e368546bf5dfdd05c759bf4eeb272879d217f3026bb3368dc358e3e2e94`([SHA 기록](evidence/phase15/fixes/execution-sha256.txt)). 별도 증거 수집 자체 오류도 보존했다: Sharp의 옛 lib/index.js 경로 부재→package resolver로 복구, 결과 폴더의 .last-run.json을 directory로 가정한 ENOTDIR→Dirent 검사로 복구, 최종 screenshots-final exit0. 제품/시험 PASS 수에는 추가하지 않았다.

최초 report audit은 실행 ledger/manifest를 생성하기 전에 링크 존재를 검사해 실패했다. 출력 생성 후 링크 검사를 하도록 순서를 복구했으며 최초 실패는 [별도 audit 기록](evidence/phase15/fixes/audit-execution.jsonl)에 보존했다. 시험·제품 실패나 신규고유수로 집계하지 않았다.
