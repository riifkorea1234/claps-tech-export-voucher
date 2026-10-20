# Phase16 samecoder review-fixes — localCOMPLETED / EXECUTED

Live task_34c11baa35b4 / ctx_6f38125dfd5d, 실제 /mnt/f/claps-product, 2026-10-01. 근거는 새 live TASK의 root 위임 및 사용자 질문 권장안이다. 원본 [독립CR](phase16-review.md) task_1d1e30b970a7 / ctx_14652b954819는 수정하지 않았다. C0/M0/m2/n4 총6건 중 m1/m2/n1/n3/n4 mitigation을 수정·닫고 n2는 현재 미구현 Phase17 조건으로 인계한다. 필수미해결0·수정5·총조건3, 독립APPROVED0.

최초 T31/T32/L01/R01/R02 구현은 서버 수동3 체크/CAS/targetHash stale, 읽기전용 자동4 항목, 실제 generation/verification/final evidence·현재 guide/jobs 대조, owner 전용 동기 발급과 immutable schemaVersion1 manifest/checksum, exact-key replay·동일 version 다른 key 경쟁409, 보관/모든asset softdelete metadata-only·write/file차단이다. 일본어 UI 링크는 verify/final의 ja locale만, 직접 조회는 owner locale 무관, print는 선택한 immutable receipt의 ja 단일 자료이다. [원본 source trace](evidence/phase16/source-trace.md)와 [최초 보고서 보존본](evidence/phase16/fixes/initial-reports/phase16-result.md)에 최초 구현·346PASS와 실패/격리/실제2restart의 범위를 보존했다.

| Finding | 이번 변경 | 의미 수용시험·closure |
| --- | --- | --- |
| m1 minor | checkbox는 metadataOnly에만 real disabled, pending에는 aria-disabled/aria-busy와 busy.current onChange guard | ko/en/ja 각각 한 번 focus→Space/Tab/Space/Tab/Space, 매 단계 pending·응답 뒤 동일 input activeElement, 추가 pending Space 포함 PATCH 정확3개. CLOSED |
| m2 minor | review 전용 verification ruleResults.title optional을 현재 guide 규칙에서 고정, schemaVersion1/기존 job schema·SQL 보존. ja 표 머리·6 verdict 라벨3팩·reason/evidence wrap·작은 화면 세로표·rulesEmpty·manualAt ja/UTC 형식 | legacy title 없음 DB receipt 원형/체크섬 읽기, title drift hash/stale, 실제 writer 재검증 후 새 title 발급·이전본 불변. 실제 PDF3 locale direct inspection. CLOSED |
| n1 nit | 응답 불확실한 원래 payload/key를 version 변화·reload로 버리지 않음, tab sessionStorage는 요청 복구에만 사용. 성공/확정409 또는 명시 새 발급 intent에서 해제 | 서버 commit 후 응답 drop→hard reload+readiness refresh→동일 body/key/ID·DB1행. 다른 탭 consumed version409·fresh issuance 별도 ID·명시 새 intent 구분. random snapshots[0] 선택0. CLOSED |
| n3 nit | ORDER BY t::text COLLATE C, 원래 모든 컬럼 고정 ROW canonical checksum과 행별 대조 | 실제3행 역/정순 insert同checksum, 새 own clones blank/0008/P12/P13/P14/P15 적용·replay·기존 checksum 보존+fixed b4749eb Auth session/profile/logout. CLOSED |
| n4 nit | locale UTC 일시·최근20개 제한·이전 ID/URL 안내와 직접 ID 조회 UI | 21개 실제 발급의 21st oldest가 목록 밖이지만 owner 직접 조회·URL reload 가능, empty/malformed/foreign guards. root 권장 좁은 UI mitigation CLOSED; cursor 더보기 미구현 |
| n2 nit | readiness row lock/unbounded evidence 비용은 이번 필수 실패가 아니므로 보존 | Phase17 조건인계1, scale/rate 선행조건과 연계. 현재 최적화/benchmark 미구현·미실행 |

인쇄 규칙명은 현재 guide title을 발급 시 고정한 값이다. 현재 guide가 영문 title/reason/evidence를 제공한 경우 원문 의미를 일본어로 자동 번역했다고 주장하지 않는다. 일본어 표 머리·verdict·일시와 기존 title 없는 ruleId fallback은 고정된다. 권리자/원어민·제품·법무 검수는 외부 gate다. sessionStorage에는 version/hash/key만 있으며 체크/발급본의 권위는 DB이고 legacy snapshot은 재작성하지 않는다. 브라우저 storage가 제한되면 mounted retry는 유지되지만 hard reload 복구는 제한된다.


## local closure 근거

최종 actual unit70/integration193/i18n9/production8/lint/typecheck/build/migration/PDF·보존감사 PASS. 누적350=최초346+신규4, 현재 재시험280; full75/demo1/실제2restart는 이전 근거로 보존하며 현재 재실행이라고 하지 않는다. 초기 checkbox focus 시험은 매 항목 refocus로 결함을 가린 경로였고, 이번 연속 한 번focus+Tab/Space 시험은 pending/완료 activeElement와 중복write0를 실제로 검증했다.

n4의 전체 cursor 목록은 구현하지 않았다. root live 권장안은 limit20·날짜·older ID/URL·직접 UI를 이용한 좁은 mitigation CLOSED를 허가했고 21st older owner directread/foreign guards를 통과했다. 독립 리뷰 APPROVED 변경으로 해석하지 않는다. [총조건3](evidence/phase16/fixes/phase17-conditions.md)의 현 n2와 선행2는 미구현·미충족이다.

[현재 결과MD](phase16-result.md) / [동일HTML](phase16-result.html) / [체크리스트](phase16-test-checklist.md) / [인계](phase16-handoff.md) / [실제ledger](evidence/phase16/fixes/execution.jsonl) / [초기보고서](evidence/phase16/fixes/initial-reports/phase16-result.md). Phase11 전체IN_PROGRESS/외부BLOCKED, Phase17 및 clear root관리·자동시작0, 외부gate/사업자료/refs 보존.
