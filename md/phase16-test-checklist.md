# Phase16 체크리스트 — localCOMPLETED / EXECUTED

Live task_34c11baa35b4 / ctx_6f38125dfd5d. 원본CR C0/M0/m2/n4 보존, [별도 수정표](phase16-review-fixes.md)의 수정5/필수미해결0/총조건3. 독립APPROVED0.

| 항목 | 실제 현재 상태·증거 |
| --- | --- |
| unit/i18n | 전체70/9 PASS, fixes/unit.log·i18n.log |
| integration | 전체193 PASS, title optional legacy immutable·실제 reverify/new title2 신규 포함 |
| m1 keyboard | ko/en/ja 한 번focus 뒤 Space/Tab 연속3개, pending/응답 뒤 focus·aria-busy·추가Space PATCH3개 PASS |
| m2 immutable title/ja PDF | legacy checksum/불변, titleHash stale, 실제재검증 새title, 3ownerlocale ja 표/라벨/manualAtUTC/PDF PASS |
| n1 lost response | commit response drop→hardreload/consumedversion refresh→원래body/key/sameID DB1row, other-tab409·freshID·새intent PASS |
| n3 migration | 새ownclone6경로·replay·원래컬럼count+canonicalchecksum·역insert3행·fixedoldAuth PASS |
| n4 mitigation | limit20 표시·locale UTC일시·직접ID UI/URL·21stold owner/foreign/malformed/empty PASS; cursor미구현 |
| guards/regressions | 최종production 기존Phase16 6 +새2=8 PASS, readonly/owner/auth-first/CSRF/strict DTO/405/CAS/replay/archive/allsoftdeleted/file guards |
| quality/build | 최종lint0기존warning2/typegen/tsc0/fixed4519networknonebuild0, 새release-mobile flat57SHA·native fingerprint |
| visual | actual PDF3 ja directinspection, screenshot3locale, 390/root200 overflow0/pageerror0 |
| preservation | baseline1463 원본CR·review/초기evidence·Phase0~15·SQL/meta/seed/feat_plan·HEAD/refs SHA 보존 |
| cleanup | ownwebworker 직접PID stop/3301free/ja false/private600/enGB생성0, 사용자ports/DB 보존 |
| n2+선행2 | 현재미구현/미충족 총3, [재개조건](evidence/phase16/fixes/phase17-conditions.md) |

누적350 PASS=최초346+통합2+E2E2; 현재재시험280=70+193+9+8, 반복 가산0. reviewer 독립345와 coder demo1/최초2restart는 이전 근거이며 full75/demo/restart 현재재실행주장0. 최초 실패는 별도 fixes/failure-notes.md와 log에 보존하며 최종 필수FAIL/skip/empty suite0. [결과](phase16-result.md)/[actualledger](evidence/phase16/fixes/execution.jsonl). Phase17/clear 자동시작0.
