# Phase15 결과 — localCOMPLETED

2026-10-01 로컬 기술 종료. Live task_77e6f02cf8a5 / ctx_67c2216408be, 실제 /mnt/f/claps-product, HEAD b4749eb851c6cfef28f207adfca5f3f1ee942f66 및 6 origin refs 보존. 선행 Phase14 localCOMPLETED/288PASS/9closed, 사용자 전부 권장안 위임과 B 승인승계는 [계획 §16](phase15-plan.md#16-실제-착수-기록-2026-10-01)을 따른다. root의 새 live TASK가 사용자 1review→samecoder fixclosure 위임에 따라 로컬 종료를 허가했다. 독립 reviewer의 원본 [CHANGES_REQUESTED C0/M1/m1/n5](phase15-review.md)는 보존했고 독립 APPROVED를 새로 주장하지 않는다.

**고유 자동시험 314 PASS, 최종 필수 FAIL0/skip0/empty suite0. 수정 CLOSED5, 기술 필수 미해결0, nonblocking Phase17 조건 인계2(n3/n5).** [수정표](phase15-review-fixes.md), [실제 체크리스트](phase15-test-checklist.md), [인계](phase15-handoff.md), [실제 실행 ledger](evidence/phase15/fixes/execution.jsonl).

## 구현과 수정

승인된 T28~T30 전체 구현은 앞선 coder의 [source trace](evidence/phase15/source-trace.md)와 [원래 결과 보존본](evidence/phase15/fixes/phase15-result.md.before)에 있다. 원본 T28/T29/T30 참조·목업 의도 선택 이식이며 전체 merge/cherry-pick0. optional provenance factors/0~100/null, reading 시 jobId:index와 실제 배열 0~49, schemaVersion1/whole64KiB/출처10/결과50, enum reason과 owner/action/key request hash 및 직렬화 append 원장, 상세 Flag/FlagOff 및 세 언어/모바일 구현을 유지했다. 원본 output·이미지·provider503·최근 성공/과거 호환 계약을 약화하지 않았다.

이번 수정은 UI 키를 item.feedback.sequence에 결속해 unresolved snapshot retry만 replay한다. 다른 탭에서 sequence가 바뀌고 같은 mounted UI를 다시 불러오면 새 키와 새 원장 행을 만든다. label 전환 패턴으로 aria-pressed를 없애고 지역화 title/aria-label/role=status를 유지했다. locale NumberFormat은 최대 소수1자리이며 등급과 저장/aria 숫자의 정밀도는 raw값 그대로다.

fixture는 안전 DB prefix regex와 local55437 가드를 공유하며 fix/review DB에서 동작한다. migration checker는 명시 `PHASE15_MIGRATION_PREFIX` 및 JSON `PHASE15_MIGRATION_PREDECESSORS`로 unused target clones/predecessors를 선택한다. 모든 clone 이름을 사전 확인해 기존 DB 충돌 시 create 전에 종료한다. 예: prefix `claps_test_fix15m`, predecessor mapping `latest12=claps_test_upgrade12/latest13=claps_test_fix13/latest14=claps_test_fix14`; target URL은 private TEST_DATABASE_URL이다. URL secret을 문서에 쓰지 않았다.

새 feedback endpoint만 인증→CSRF→query→64KiB JSON→locked write 순서로 좁게 개선했다. 허용 POST/DELETE 외 지원 메서드는405, Allow=POST, DELETE/private,no-store; HEAD는 빈 body다. 기존 monitoring 전체 API 범위 확장0. migration0012/SQL/meta 및 request hash/owner→record→job locks 변경0.

## 실제 검증과 빌드별 범위

| 범위 | 실제 결과 | 고유수 |
| --- | --- | ---: |
| unit 전체 | 67 PASS, 이번 신규3 | 67 |
| integration 전체 | 168 PASS; 실제49 허용/50 거절, 경합/replay/DB trigger/rollback/output 보존 | 168 |
| i18n 전체 | 9 PASS | 9 |
| lint/typecheck | exit0; 기존 icon 파일 경고2만 유지 | 0 |
| build-engb: 고정 offline Docker/native Linux | exit0; 임시 en-GB 포함70 flat public/messages SHA 일치 | 0 |
| 같은 build-engb production 전체 | 68 PASS/1 FAIL; 실패는 HTTP 시험 문자열 자동 JSON 직렬화 | 68 |
| 같은 build-engb HTTP 복구 | raw Buffer로 malformed/70KiB 실제 전달, n4 1 PASS | 1 |
| build-final: ko/en/ja만 | exit0; 새 immutable release57 flat assets SHA 일치 | 0 |
| final release Phase15 production | 9 PASS: 세 언어390/root200/keyboard/icon/boundaries, HTTP, loss/rapidclick, 두 탭A/B, success/reload/reason | 중복0 |
| final release demo | 1 PASS, 새 own demo DB/fixtures만 | 1 |
| supplemental | migration5경로/old Auth/clone guard, 실제2재시작(3launch), nativeSharp/UI/immutable output/uploads | suite 추가0 |
| **합계** | **314 고유 PASS, 최종 필수 FAIL0** | **314** |

Phase14의288 대비 Phase15 전체 신규26(7unit/10integration/9E2E), 앞선 REVIEW_READY307 대비 이번 신규7(3unit/4E2E). 실제 명령/exit/시간은 [JSONL](evidence/phase15/fixes/execution.jsonl)/[읽기용 ledger](evidence/phase15/fixes/execution-ledger.md). 전체69 E2E가 마지막 build에서 모두 실행됐다고 주장하지 않는다. 최종 코드 행동은 같은 후보의 전체68 및 HTTP복구1에서 확인하고, 3팩 최종 release에서 관련9/demo/restart를 재확인했다.

실제 A는 report→다른 탭 withdraw→mounted reload→report로 원장3행, B는 report→withdraw→다른 탭 report→mounted reload→withdraw로4행을 확인했다. 새 키·버튼/role=status 일치와 alert0을 검사했다. success receipt 지연 중 최신 sequence를 GET한 경합과 성공 뒤 다른 reason은 총5행/고유키5를 확인했다. 실제 commit 후 응답 유실+refresh 전 rapid click은1행 유지했다. 반올림33.3% 표시/원래 meter33.3333333, 0/null/no-factor, 80/90 raw 경계를 세 언어 및 unit에서 확인했다.

[최종 PNG manifest](evidence/phase15/fixes/screenshot-manifest.json)와 [직접 검수](evidence/phase15/fixes/inspection.json)는 세 언어 desktop/mobile390 root200, A/B 및 reply loss 화면을 포함한다. E2E가 viewport overflow0/pageerror0/focus/Enter/지역화 label/title/숨긴 svg/aria-pressed 없음/live 상태를 실제 DOM에서 확인했다.

## 격리·보존·실패 공개

Node22.22.0/pnpm10.34.5/Next16.3.3/sharp0.35.3, 새 Linux 내부 symlink deps `/tmp/claps-phase15-fix-sandbox`, 고정 builder sha256:4519d80443c271af0f55f956f820842bd4e8d05423eee6441acfbf398ca482aa/network none. 새 own DB claps_test_fix15 및 unused clones/demo(55437), own ports3271/3272/3273, own uploads/mail만 사용했다. 최종 immutable release `/tmp/claps-phase15-fix-release-final` 생성 후 실행 중 native/deps copy0. 재시작도 동일 release/DB/uploads로 실제3launch했다.

own ja는 finally false 복구, own en-GB13파일은 SHA 동일성 확인 뒤 관련 process 종료 후 sandbox/test release에서 정리했다. 최종 release는3팩만이다. own web/worker 종료를 확인했고 user3193/55433/55436 및 이전 DB/fixtures는 보존했다. 이전 SQL0000~0012/meta/seed/Phase0~14 docs/review/evidence/refs와 원본 Phase15 review/evidence가 baseline 대비 불변이다. credential/private fixtures는0600, 공개 credential0. [환경](evidence/phase15/fixes/environment.json)/[cleanup](evidence/phase15/fixes/cleanup-manifest.json)/[native fingerprint](evidence/phase15/fixes/runtime-fingerprint.json)/[SHA manifest](evidence/phase15/fixes/files-modified.json)/[보존 audit](evidence/phase15/fixes/final-audit.log).

최초 bootstrap .ts top-level await CJS 오류→migrate/seed도 실패한 로그를 보존하고 .mts로 복구 후 모두 exit0. 최초 HTTP 시험 기대400/실제422는 Playwright의 JSON 문자열 직렬화가 원인이라 raw Buffer로 수정했다(기대400 유지). 최초 production68PASS/1FAIL 로그/trace와 복구1PASS/최종9PASS를 함께 보존했다. Phase12 native exit139 원인은 계속 미확정이다. 앞선 Phase15 실패 기록은 원래 evidence와 결과 보존본에 그대로 남겼다.

## 조건 인계와 종료 권한

[n3/n5 Phase17 조건 인계2](evidence/phase15/fixes/phase17-conditions.md)는 **미구현/운영 미충족**이다. n3 원장 길이/rate cap이 없으며 DTO는 bounded여도 DISTINCT ON 비용은 event 수에 비례한다. 기존 DB 기반15분 rate 정책을 토대로 owner admission/replay 정책과 필요 시 latest projection을 Phase17에서 검토한다. 임의 원장 삭제/잘라내기0, 규모 fixture100/1,000/10,000 benchmark는 후속 예정이다.

n5 trigger는 정상 DML을 거절하지만 현재 table owner인 app role은 DISABLE TRIGGER로 우회할 수 있다. 운영 migration owner≠app role 증명을 완료했다고 주장하지 않는다. Phase17 별도 local role fixture 증명과 운영 DB 관리자/보안 담당의 grant/credential/복구·감사 승인 gate를 유지한다. root가 조건·담당·재개 위치를 운영 handoff로 추적한다.

사용자 위임을 적용한 root live TASK에 따라 localCOMPLETED로 보고한다. 독립 APPROVED 판정이나 원본 review 수정은0이다. Phase11 전체 IN_PROGRESS/외부 BLOCKED, 실제 공급자 품질·과금·OAuth·운영 ja·원어민·법무·RPO/RTO·운영 DB role 외부 gate는 그대로다. commit/push/PR/deploy/실공급자/실송신/운영 ja/영구 사업자료 삭제0. **Phase16 및 clear 실행0, root만 관리한다.**

실제 execution.jsonl SHA256 `a2350e368546bf5dfdd05c759bf4eeb272879d217f3026bb3368dc358e3e2e94`([SHA 기록](evidence/phase15/fixes/execution-sha256.txt)). 별도 증거 수집 자체 오류도 보존했다: Sharp의 옛 lib/index.js 경로 부재→package resolver로 복구, 결과 폴더의 .last-run.json을 directory로 가정한 ENOTDIR→Dirent 검사로 복구, 최종 screenshots-final exit0. 제품/시험 PASS 수에는 추가하지 않았다.

최초 report audit은 실행 ledger/manifest를 생성하기 전에 링크 존재를 검사해 실패했다. 출력 생성 후 링크 검사를 하도록 순서를 복구했으며 최초 실패는 [별도 audit 기록](evidence/phase15/fixes/audit-execution.jsonl)에 보존했다. 시험·제품 실패나 신규고유수로 집계하지 않았다.
