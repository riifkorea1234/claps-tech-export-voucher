# Phase16 독립 검토 — CHANGES_REQUESTED

검토자: reviewer (live task_1d1e30b970a7 / ctx_14652b954819), 2026-10-01. 대상: 실제 `/mnt/f/claps-product`, HEAD `b4749eb851c6cfef28f207adfca5f3f1ee942f66`. coder 인계 자료는 [인계](phase16-handoff.md), [결과](phase16-result.md), [체크리스트](phase16-test-checklist.md), [계획 §16~17](phase16-plan.md)입니다(coder task_95c6719b10fc / ctx_903fabbd1466).
수정 범위: 이 문서와 [own evidence](evidence/phase16/review/)만 새로 작성했습니다. 구현 소스, 원본 보고서, 이전 Phase 증거, 기존 DB, migration, refs는 하나도 수정하지 않았습니다. commit/push/PR/deploy, 실공급자 호출, 실송신, 운영 ja 활성화, 영구 삭제는 0건입니다. Phase17이나 clear도 진행하지 않았습니다.

## 판정

**CHANGES_REQUESTED — Critical 0 / Major 0 / minor 2 / nit 4.**

서버 계약은 독립 재현에서 모두 계약대로 동작했습니다. 검증한 항목은 manual CAS, target-hash stale, 자동 항목 조작 거절, 발급 경합 1승자, 멱등 replay, 불변 snapshot과 checksum, owner/보관 guard, migration입니다. 고유 346 PASS 주장은 제 독립 build에서 수치가 그대로 재현됐습니다(아래 표).

다만 두 가지 minor를 수정 권장합니다.
- **필수 체크리스트 항목 "checkbox focus/Space"**: 실제 키보드 동작에서 포커스가 유실됩니다. coder 시험은 매 항목마다 `focus()`를 다시 호출해서 이 결함을 가렸습니다.
- **ja 고정 인쇄물의 판정 근거**: 내부 ID와 영문 enum만 출력됩니다.

둘 다 작은 UI 수정으로 닫을 수 있습니다.

## 지적 사항

### m1 (minor) — 수동 checkbox를 Space로 토글하면 포커스가 `BODY`로 유실됨

- 위치: `app/(app)/assets/[id]/review-package/page-content.tsx:30`(`disabled={pending || current.metadataOnly}`), `:15`(`action`이 `pending`을 켬).
- 원인: 요청 중에 `pending`으로 checkbox를 `disabled` 처리합니다. 브라우저는 disabled 요소에서 포커스를 제거하고, 요청이 끝나 다시 enabled가 돼도 포커스를 돌려주지 않습니다.
- 재현(own release-final:3291, [probe6.log](evidence/phase16/review/probe6.log), [probe-results.json](evidence/phase16/review/probe-results.json) `ui_*`): ko/en/ja 모두 첫 checkbox에서 Space를 누르면 checked·enabled 상태가 된 뒤 `document.activeElement`가 `BODY`입니다. Tab은 Chromium의 순차 탐색 시작점 덕분에 다음 항목으로 이동하지만, 스크린리더 문맥이 끊기고 같은 항목에서 Space를 다시 눌러도 반응이 없습니다.
- 관련 시험: `tests/e2e/phase16.spec.ts:20`은 항목마다 `box.focus()`를 다시 호출합니다. 그래서 체크리스트의 "UI checkbox focus/Space PASS"는 이 경로를 검증하지 않았습니다.
- 권장안:
  - checkbox에는 `disabled` 대신 `aria-disabled` + `aria-busy`를 쓰고, `onChange`에서 `busy.current`로 중복 요청을 막으세요(기존 `action` 가드가 이미 있습니다).
  - 또는 완료 후 같은 key의 input에 `focus()`를 복원하세요.
- 수용 시험: E2E에서 한 번만 focus한 뒤 Space→Tab→Space→Tab→Space만으로 3항목이 체크되고, 각 단계에서 `activeElement`가 해당 checkbox인지 확인하세요(ko/en/ja).

### m2 (minor) — 일본어 고정 인쇄물의 판정 근거가 내부 ruleId·영문 verdict enum만 출력함

- 위치: `page-content.tsx:39`(`{rule.ruleId} / {rule.verdict} — {rule.reason} — {rule.evidence}`), `:38`(`manualAt`을 ISO 원문으로 출력).
- 재현: [print-ja.pdf](evidence/phase16/review/print-ja.pdf), [print-en.pdf](evidence/phase16/review/print-en.pdf), [print-ko.pdf](evidence/phase16/review/print-ko.pdf)를 직접 열어 확인했습니다. 판정 근거가 `one / pass ― 適合 ― 合成の確認記録`로, 확인 일시가 `2026-10-01T04:44:25.844Z`로 출력됩니다. 반면 발행 일시는 `Intl` 형식입니다. coder 최종 PNG도 동일합니다.
- 원본과 비교: T31 원본 `c503012`은 `review.ruleName/ruleVerdict/ruleBasis` 열 제목과 규칙명을 가진 표였습니다. 현재 세 팩에 이 키들이 남아 있지만 어디에서도 사용하지 않습니다(`ruleName`, `ruleVerdict`, `ruleBasis`, `rulesEmpty` 외 `historyRuns`, `targetCount` 등 14키). 권리자에게 내는 일본어 자료에서 규칙을 식별하기 어렵고 `pass`가 번역되지 않습니다. 검증 결과가 없는 경우에는 빈 목록이 됩니다.
- 권장안:
  - 발급 시 manifest에 규칙 `title`을 함께 고정하세요(현재 guide rules를 hash에만 씀). schemaVersion1은 유지하고 optional 필드로 추가하면 됩니다.
  - 인쇄에서는 `ruleName/ruleVerdict/ruleBasis` 표 머리와 일본어 판정 라벨(예: `review.verdict.pass` 등 3팩 키)을 쓰세요.
  - `manualAt`도 발행 일시와 같은 형식으로 출력하세요.
  - 기존 발급본은 불변이므로 이전 manifest에 title이 없으면 ruleId로 fallback하세요.

### nit

- **n1 응답 유실 후 재시도가 replay가 아니라 재발급이 됨**: `page-content.tsx:15,21`. 발급 POST가 서버에서 commit됐는데 응답만 유실되면 `catch`의 `reload()`가 consumed version을 받아옵니다. 그 결과 `attempt`가 무효화되고, 다음 클릭은 새 key로 별도 snapshot을 발급합니다. 계약상 재발급은 허용되고 목록에도 보이므로 데이터 손상은 없습니다. 다만 멱등 key의 UI 목적은 달성되지 않습니다. 오류 후 reload에서 `snapshots[0]`이 마지막 attempt 이후 발급됐다면 그것을 선택해 보여 주는 정도를 권장합니다.
- **n2 readiness GET 비용**: `lib/server/review/service.ts:18~22`. 읽기 GET이 session/project/asset 행을 `FOR UPDATE`로 잠그고, session의 evidence event 전부를 payload와 함께 읽습니다. owner 직렬화(`FOR UPDATE OF u`)와 같은 순서여서 deadlock 경로는 찾지 못했습니다(worker도 user→job 순서). 다만 event 수에 비례하는 비용입니다. Phase15 n3(원장 규모/rate)와 함께 Phase17 조건으로 묶어 검토하세요. 새로운 Phase16 필수 실패는 아닙니다.
- **n3 migration 검사 정렬**: `scripts/phase16-migration-check.ts:43,46`의 `ORDER BY 1::text`는 상수 정렬이어서 행 대조가 scan 순서에 의존합니다. 제 독립 검사([migration-probe.log](evidence/phase16/review/migration-probe.log))는 테이블별 `count + md5(string_agg(row ORDER BY row::text))`로 기존 18테이블 불변을 확인했으므로 결과는 유효합니다. 다음 스크립트에서는 `ORDER BY t::text` 또는 PK 정렬을 쓰세요.
- **n4 기발급 목록 표시**: UI는 최근 20개만, `issuedAt` ISO 원문과 UUID를 버튼 텍스트로 보여 줍니다(`service.ts:48`, `page-content.tsx:33`). 이전 발급본은 `?snapshot=` 직접 URL로만 열 수 있습니다. 지역화된 일시 표시와 더 보기(cursor)를 권장합니다.

## 독립 확인한 사실

| 항목 | 방법 | 결과 |
| --- | --- | --- |
| 변경 파일 | `files-modified.json` 대비 재계산 | 기존10+신규22 after-SHA 모두 일치. baseline 1272 중 변경 10개는 정확히 허용목록과 같고, 누락/삭제 0. 기존 0000~0012 SQL/meta 26개 불변 ([source-audit.log](evidence/phase16/review/source-audit.log)) |
| 소스 보존 | 검토 시작/종료 전체 SHA(1407→1460, 추가분은 모두 `md/evidence/phase16/review/`) | 기존 파일 변경 0. HEAD, remote refs 동일(`refs-baseline.txt`와 같은 해시) |
| sandbox | `/tmp/claps-phase16-sandbox`를 `.next`/md 제외 rsync, 절대 symlink 0 | 소스와 byte 동일(.env·git 제외) |
| lint/typecheck | own copy | exit0. warning 2건은 기존 `apple-icon`/`opengraph-image` |
| unit / i18n | own copy | **70 / 9 PASS** |
| integration | own DB `claps_test_review16`, migrate+seed 후 1회 | **191/191 PASS**(15 files). Phase16 신규 23 = it 6 + stale 8 + false-ready 6 + archive/delete 3 |
| build | 독립 build. 같은 fixed 이미지 `sha256:4519d…`, `--network none`, own sandbox mount | exit0(Node22.22.0/pnpm10.34.5/Next16.3.3), BUILD_ID `-rK5TB1CawmYKwcI1n57w`. 새 release 2종의 public/messages flat 57파일 SHA 일치, 절대 symlink 0. 실행 중 native 복사 0, coder release 미사용 |
| production 전체 | release-engb2(own build + en-GB 시험팩, `scripts/phase11-locale.mjs` 동일 생성 → coder `engb-manifest.json`과 13파일 동일) + own worker, DB `claps_test_review16e2e2` | **75/75 PASS**([production-full4.log](evidence/phase16/review/production-full4.log)) |
| 고유 수 | 70+191+9+75 = 345 독립 재현 | demo 1은 재실행하지 않았음(아래). coder 346 = 345+demo1 산식과 신규 32(3+23+6) 일치. 빌드별 범위 설명(전체75=build-engb-ui, 최종 3팩=관련6+demo+restart, 최종 build 전체75 재실행 주장 없음)도 ledger와 일치 |
| migration | 빈 DB, `claps_test_fix15` template clone(latest15), replay, coder 스크립트 own prefix `claps_test_review16m*` 7경로 + fixed b4749eb AuthService | 0→14, 13→14, replay 14. 기존 18테이블 count+md5 불변, 신규 2테이블만 추가. trigger 4개 enabled, FK 6개 NO ACTION, `jobs_kind` CHECK 변화 0(새 job kind 없음) ([migration-probe.log](evidence/phase16/review/migration-probe.log), [migration-coder-script.log](evidence/phase16/review/migration-coder-script.log)) |
| 발급 경합/멱등 | own probe P1([probe-P1-results.json](evidence/phase16/review/probe-P1-results.json)) | 같은 version PATCH 8개: 200×1 / 409×7. 다른 key POST 10개: 201×1 / 409×9, 행 1. consumed 뒤 exact replay는 201 동일 receipt. 옛 version + 새 key는 409. 재발급은 별도 ID이며 이전 snapshot JSON 불변. 같은 owner가 다른 session에 같은 key를 쓰면 409. checksum은 독립 canonical SHA-256 재계산과 일치 |
| 불변/관계 guard | 실제 PG | UPDATE/DELETE/TRUNCATE 23514, session 삭제 FK 23503, review_checks owner 변경 23514, manifest locale 변조 INSERT 23514, 원본 checksum 유지 |
| stale/조작 | probe P2([probe-P2-results.json](evidence/phase16/review/probe-P2-results.json), 실제 업무 API) | project rename → stale·ready false·발급 409, 재확인 후 ready. 보관 시 metadataOnly·PATCH 404. 해제 후에는 session version 변경으로 stale(보수적, 재확인 필요). 수동 해제 → 발급 409. `automatic`/추가 manual 키/`locale` 주입은 422, Origin 없음은 403 |
| 누출 | readiness JSON과 인쇄 텍스트 | storageKey, thumbnailKey, 원본 prompt 0 |
| ja 인쇄 | ko/en/ja owner locale로 진입, `page.pdf` A4 실제 PDF 3개 직접 열람 | 모두 `lang=ja` 일본어 단일 페이지, header/aside/button/input/.review-controls 인쇄 노출 0. 390px/root200 overflow 0, pageerror 0. 진입 링크는 ja UI만(코드 `asset-workspace-body.tsx` step2/3 + coder E2E) |
| 코드 검토 | service/http/hash/0013/UI | auth-first(`ws.run`) → CSRF → strict query → bounded body. 405는 auth 전 `Allow`/`private, no-store`. 자동 항목은 verdict `pass` + aggregate pass + succeeded job/provider/input snapshot/rules hash/stored 일치가 필요하며 warn/unknown/busy는 ready가 아님. lock 순서 user → session → project → guide → assets → jobs(worker도 user 먼저). 서버 PDF/ZIP/운영 seed/ja 활성화 코드 0 |

## 검사 범위·미검증·자체 오류 공개

- **환경**: own `/tmp/claps-phase16-review/{sandbox,release-final,release-engb2,uploads,mail}`, port 3291, own DB `claps_test_review16`/`…empty`/`…latest15`/`…e2e`/`…e2e2`/`…m*`(55437, `claps-phase12-db-test-1`)를 썼습니다. 기존 coder DB/clone/demo/private uploads와 사용자 3193/55433/55436은 시작·수정하지 않았습니다. credential은 0600 `review.env`에만 있고 로그에서는 가렸습니다.
- **종료 확인**: 모든 web/worker는 `prod.py`가 직접 보유한 Popen PID로 terminate→wait했습니다(worker 0, web 143, 각 log 끝에 PID 기록). `pgrep` 대기 loop는 쓰지 않았습니다. 종료 후 3291 listen 0, own 프로세스 0이고, ja는 모든 own DB에서 false입니다.
- **own copy 한정 변경**: en-GB 시험팩(SHA 확인)과 probe spec은 sandbox에만 추가했고 SHA 대조 후 제거했습니다. probe 원문은 evidence에 `.txt`로 보존했습니다.
- **재실행하지 않은 항목**: demo 1, 실제 2 restart, coder fixed4519 builder 준비 과정. ledger와 manifest를 검토했을 뿐 재실행하지 않았습니다. 자동 수치 비교에서 demo 1은 coder 근거로만 남습니다. Phase12 native exit139 원인은 여전히 미확정입니다.
- **자체 환경 오류**(제품 결함 아님, 로그 보존):
  1. 첫 `production-full`은 `prod.py` 상대경로 오류로 exit2였고, 그 로그는 같은 이름의 다음 실행이 덮어썼습니다(ledger에는 남음).
  2. 다음 실행은 74 PASS / 1 FAIL입니다. en-GB 팩을 en 복사로 잘못 만들어 phase11 1건이 실패했습니다.
  3. `production-full2`는 39 FAIL입니다. sandbox cwd에 en-GB가 없었고, 같은 DB 재실행이 auth sign-up rate limit(15분)에 걸렸습니다.
  4. `production-full3`는 34 FAIL입니다. fresh DB에서 coder ledger의 `pnpm i18n:activate`를 빠뜨려 ko/en이 비활성이었습니다(첫 실패는 profile-setup).
  5. coordinator 확인 요청에 원인을 보고한 뒤, 활성화를 반영한 `production-full4`를 한 번만 실행해 75 PASS를 얻었습니다. 그 뒤에는 표적 probe만 돌렸습니다.
  6. probe1~5의 실패는 probe 코드 결함입니다: fixture 반환 키 덮어쓰기, guide v1 고정 fixture의 같은 project 재사용, 보관 session GET, strict heading locator. P1의 첫 "다른 session key 201"은 fixture가 새 계정으로 전환된 탓의 오탐이었고, 같은 owner로 다시 시험해 409를 확인했습니다.
- **유지되는 사항**: Phase15 조건인계 n3(원장 규모/rate)와 n5(운영 owner/app role 분리, trigger DISABLE 우회)는 Phase17 미구현·미충족으로 그대로 승계하며, 이번 Phase16 필수 실패로 계수하지 않았습니다. Phase11 전체는 IN_PROGRESS/외부 BLOCKED 상태이고, 실공급자·과금·OAuth·운영 ja·원어민·법무·RPO/RTO 같은 외부 게이트의 충족 주장은 0입니다.

## 다음 단계

같은 coder가 m1(포커스 유지)과 m2(ja 인쇄 규칙 표·라벨)를 권장안대로 고치고, n1·n4는 선택 반영, n2는 Phase17 조건으로, n3는 다음 스크립트에서 반영하길 권합니다. 수정 후에는 관련 production 6건과 수용 시험만 재실행하면 충분합니다. 이 검토는 Phase COMPLETED를 판정하지 않으며 Phase17이나 clear를 자동으로 시작하지 않습니다.
