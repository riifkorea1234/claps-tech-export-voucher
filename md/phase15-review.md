# Phase15 독립 검토 — CHANGES_REQUESTED

검토자: reviewer (live task_99c308de1d19 / ctx_c43178d7e4f6), 2026-10-01. 대상: 실제 `/mnt/f/claps-product`, HEAD `b4749eb851c6cfef28f207adfca5f3f1ee942f66`, coder 인계 [phase15-handoff](phase15-handoff.md)/[결과](phase15-result.md)/[체크리스트](phase15-test-checklist.md)/[계획 §16~17](phase15-plan.md).
수정 범위: 이 문서와 [own evidence](evidence/phase15-review/)만 작성했습니다. 코드·원장·기존 docs·기존 DB·migration·refs 수정 0, commit/push/PR/deploy/실공급자/실송신/영구삭제 0, Phase16/clear 진행 0.

## 판정

**CHANGES_REQUESTED — Critical 0 / Major 1 / minor 1 / nit 5.**

서버 원장·migration·API 계약은 독립 재현에서 견고했습니다. 다만 UI의 idempotency key 수명이 "성공 후에도" 유지되어, 다른 탭/기기에서 상태가 바뀐 뒤 같은 사용자의 신고 또는 철회가 **200 OK로 조용히 무시되는** 결함을 실제 production UI에서 재현했습니다. 이는 과제 중점("rapid toggle/race/stale props/이미신고 GET snapshot/reload 원장상태 계산 부정확")에 해당하므로 승인하지 않습니다.

## 지적 사항

### M1 (Major) — 성공한 액션의 idempotency key 재사용으로 신고/철회가 조용히 유실됨

- 위치: `components/domain/monitoring-workspace.tsx:51`(attempt state), `:61`(`next = attempt?.action === action && attempt.reason === reason ? attempt : …`).
- 원인: `attempt`는 전송 실패 시 재시도용(주석: "after a transport failure")이지만 성공 시에도 지워지지 않고, 재사용 조건이 action·reason만 비교하며 서버 상태(sequence)와 무관합니다. 서버는 정상적으로 기존 receipt를 replay(200)하므로 새 event가 append되지 않고, UI는 reload 후 이전 상태를 그대로 보여 주며 오류도 표시하지 않습니다.
- 재현(own release 3261, own DB, [ui-probe.json](evidence/phase15-review/screenshots/ui-probe.json), [probe.log](evidence/phase15-review/probe.log)):
  - A: 탭에서 신고(key K1) 성공 → 다른 탭(같은 세션 API)이 새 key로 철회 → "다시 불러오기" → 버튼 aria-pressed=false → 같은 사유로 다시 신고 → 전송 key가 **K1 재사용**, HTTP 200 `sequence:1, reported:true`(옛 receipt), 원장 `["1:reported","2:withdrawn"]` 변화 0, UI aria-pressed=`false`, alert 0.
  - B(역방향): 신고→철회(K2) 성공 → 다른 탭이 재신고 → reload → 철회 클릭 → **K2 재사용** 200 `sequence:2, reported:false`(옛 receipt), 원장 `[…,"3:reported"]` 변화 0, UI aria-pressed=`true` 유지.
- 영향: 사용자 판단 기록(원장)이 사용자가 본 화면과 어긋나며 실패가 드러나지 않습니다. 다중 탭/기기, 장시간 열린 화면에서 발생합니다. coder E2E는 같은 탭의 rapid click/응답유실만 다뤄서 이 경로를 검증하지 않았습니다.
- 권장 수정(권장안): attempt에 `baseSequence: item.feedback.sequence`(또는 eventId)를 저장하고 `attempt.baseSequence === item.feedback.sequence`일 때만 key를 재사용하세요. 이렇게 하면 응답유실 재시도와 reload 전 rapid click은 지금처럼 replay되고, 상태가 바뀐 뒤에는 새 key를 씁니다. 추가로 성공 receipt가 현재 action과 다른 결과(예: POST 응답이 이전 sequence)면 reload 후 안내하는 방어를 둘 수 있습니다. 수용 시험: 위 A/B 시나리오 production E2E(원장 +1행, UI 상태 일치)와 기존 응답유실/rapid click 5case 재통과.

### m1 (minor) — 검증 fixture/스크립트가 coder 전용 DB 이름에 하드코딩됨

- 위치: `tests/helpers/monitoring-scan-fixture.ts:14`(`pathname!='/claps_test_phase15'`), `scripts/phase15-migration-check.ts:13~30`(DB명·포트·clone 원본 고정).
- 재현: own DB `claps_test_review15`에서 전체 E2E를 실행하면 Phase15 5건이 앱과 무관하게 `Dedicated Phase15 DB`로 실패했습니다([production-full.log](evidence/phase15-review/production-full.log)). 다음 reviewer/closure/CI가 재현하려면 원본을 수정해야 합니다.
- 권장: `claps_test` prefix 패턴(`^/claps_test(_[a-z0-9]+)?$`, 기존 cleanup helper와 동일)이나 명시 env로 허용하세요. 운영 DB 보호 의도는 유지됩니다.

### nit

- n1: factors 소수가 반올림 없이 `33.3333333%`로 노출되고, 390px/200%에서 줄바꿈이 생깁니다(`:56`). 정수 또는 소수 1자리로 표시하길 권장합니다.
- n2: 같은 버튼이 라벨(신고↔철회)과 `aria-pressed`를 동시에 바꿔, 스크린리더가 "신고 철회, 눌림"으로 읽습니다(`:60`). 토글 패턴(고정 라벨+aria-pressed)이나 라벨 전환(aria-pressed 제거) 중 하나만 쓰길 권장합니다. 기능 차단은 없습니다.
- n3: 결과별 원장 길이에 상한·rate limit이 없습니다. history는 페이지 20 job의 모든 event를 DISTINCT ON으로 읽습니다(index `feedback_latest` 사용, owner row lock으로 직렬화). 응답 크기는 ≤20×50 상태로 bounded지만 scan 비용은 원장 길이에 비례합니다. 후속 Phase에서 상한 또는 rate limit을 검토하세요.
- n4: HTTP 세부 — 405에 `Allow`·`Cache-Control`이 없음(Next 기본), 쿼리스트링을 무시하고 200, 비인증 malformed/비JSON 본문이 401보다 먼저 400(body 읽기가 auth보다 앞섬). 모두 기존 monitoring route와 같은 패턴이며 누출은 0입니다. 정보성입니다.
- n5: append-only는 trigger 기반이라 table owner(현재 app role)는 `DISABLE TRIGGER`로 우회할 수 있습니다(test cleanup helper가 실제로 사용). 결과 문서의 "DB role 미충족 유지"와 일치하며, 운영 role 분리는 외부 게이트로 남깁니다.

## 독립 확인한 사실

| 항목 | 방법 | 결과 |
| --- | --- | --- |
| 28 core 파일(기존13/신규15) SHA | files-modified.json 대비 재계산, sandbox와 byte 비교 | 28/28 일치, sandbox==source(.env 제외), 검토 종료 시 재확인 일치 |
| predecessor baseline 1071 | baseline.json 대비 현재 비core 변경 0; 기존13 파일 baseline == `/tmp/claps-phase14-fix-sandbox` | 일치(8파일 재구성 provenance 타당) |
| Phase14 산출물 보존 | phase14 files-modified+fixes 27파일, fixes evidence 62항목 SHA | 변경 0 |
| migration prefix | 0000~0011 SQL/snapshot baseline 일치, journal에서 0012를 뺀 결과 == baseline hash | 일치, 0012 additive만 |
| 0012 guard | 빈 DB 및 `claps_test_fix14` pg_dump 복제본(review15latest14)에 apply/replay | 0→13, 12→13, replay 13, 기존 17테이블 129행 md5 불변, trigger 3, FK NO ACTION 4, TRUNCATE 23514 ([migration-probe.log](evidence/phase15-review/migration-probe.log)) |
| 정적/단위 | own copy에서 lint/typecheck/unit/i18n | exit 0; unit 64, i18n 9(lint warning 2는 기존 파일) |
| integration | own DB `claps_test_review15`, 1회 실행 | 168/168 PASS |
| 최종 소스 build | own copy native `next build` → own immutable release(public/messages 57 flat hash 일치) | exit 0 |
| production E2E | own release 3261 + own worker | 전체 59 PASS/6 FAIL(환경: phase15 5건 m1, phase11 1건 en-GB 시험팩 부재) → guard만 own copy에서 교체 후 phase15 5/5 PASS, en-GB pack 추가 release에서 phase11 1/1 PASS = **최종 소스 build로 고유 65 PASS** |
| HTTP 계약 | [api-probe.json](evidence/phase15-review/api-probe.json) | GET/HEAD/PUT/PATCH 405, 401, CSRF 403, foreign record/job 404, 실제범위 밖 404, `50/00/%30/1e1/-0/0x1` 422, key128 OK/129 422, strict body 422, 70KiB 400, replay 동일, 다른 reason/result 409, 응답 `private, no-store`, owner id 누출 0 |
| 서버 동시성 | 코드 검토 | session 조회 `FOR UPDATE OF u`로 owner 직렬화 → record → job lock → key 조회/sequence append. 교차 job 같은 key race 없음 |
| 근거 표시 | 코드/UI | 0/null 구분, 80/90 경계, factors 없음/전부 null/similarity null → 판단불가, 침해판정 아님·자동조치 없음 문구 3팩 일치, 법적 단정 없음 |
| 모바일/접근성 | own 390px/root200% 캡처 직접 확인 | overflow 0, pageerror 0, 상세에만 Flag/FlagOff, aria-label/title 지역화(n1/n2 외 이상 없음) |

## 검사 범위·미검증·자체 오류 공개

- 환경: Linux/WSL, Node 22.22.0, pnpm 10.34.5, Next 16.3.3. own copy `/tmp/claps-phase15-review/sandbox`는 coder sandbox를 `cp -a`로 복사했습니다(절대 symlink 0). own DB `claps_test_review15`/`…empty`/`…latest14`(55437), own port 3261, own uploads/mail를 썼습니다. 기존 DB·3193/55433/55436·coder 프로세스는 건드리지 않았습니다. 검토 종료 시 own web/worker 종료(worker 0/web 143), 3261 listen 0입니다.
- coder의 network-none 고정 builder 이미지(4519…)를 재사용하지 않았습니다. 제 build는 host native offline이므로 build 이미지 동일성은 검증하지 않았습니다.
- own copy에서만 바꾼 것: scan fixture DB guard 1줄(m1), en-GB 시험팩을 별도 release 사본에만 추가(실행 후 sandbox에서 제거). 원본 소스 변경 0.
- 재시작 2회·demo·coder clone 5종·고정 old AuthService는 로그와 스크립트 검토만 했고 재실행하지 않았습니다. Phase12 native exit139 원인은 미확정 그대로입니다.
- 자체 오류: 대기 loop가 자기 자신과 `pgrep` 패턴이 겹쳐 끝나지 않을 수 있었습니다(coordinator 지적). 실제 종료는 로그·execution.jsonl·포트로 확인했습니다. 처음 HTML/MD 동일성 정규식 검사가 7줄 false negative를 냈고, 수동 확인으로 동일함을 확인했습니다.
- 유지: Phase11 전체 IN_PROGRESS/외부 BLOCKED, 실공급자 품질·과금·OAuth·운영 ja·원어민·법무·RPO/RTO·DB role 미해결을 합성 검증으로 대체하지 않았습니다.
- own fixture/DB/uploads는 재현용으로 보존했습니다(영구삭제 0). 비밀값은 0600 파일에만 있고 문서·로그에 credential 0입니다.

## 다음 단계

같은 coder가 M1(권장안: sequence 결속 key)과 m1(prefix 허용)을 고치고, n1/n2는 권장안대로 반영하는 것을 권합니다. n3~n5는 기록·이월입니다. 수정 후 사용자 1회 검토 → coder closure → root가 관리합니다. 이 검토는 Phase COMPLETED를 판정하지 않으며 Phase16/clear를 자동으로 진행하지 않습니다.
