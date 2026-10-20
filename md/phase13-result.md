# Phase13 최종 결과 — 증빙 서버·사건 원장

2026-10-01(KST), 실제 대상 `/mnt/f/claps-product`, feature/backend HEAD b4749eb851c6cfef28f207adfca5f3f1ee942f66. **Phase13 로컬 기술 COMPLETED / plan EXECUTED**. 기존 Claude [독립 review](phase13-review.md)의 CHANGES_REQUESTED(Critical0/Major0/Minor5/Nit4) 원본은 불변이다. 사용자 후속 task_c6ea3540df87/ctx_9288c5d87b4e가 승인한 독립 review→9건 수정→재검증→인계 gate를 충족하여 종료하며 reviewer APPROVED를 조작하지 않는다. 미해결 finding0/9·기술 차단0.

[계획](phase13-plan.md), [체크리스트](phase13-test-checklist.md), [9건 수정 근거](phase13-review-fixes.md), [인계](phase13-handoff.md), [source trace](evidence/phase13/source-trace.md), [원본 실행 ledger](evidence/phase13/execution-ledger.md), [수정 실행 JSONL](evidence/phase13/fixes/execution.jsonl). Phase11 전체 IN_PROGRESS/외부 출시 BLOCKED와 phase12-plan §16 B 예외(Phase17 기술 인계까지)는 유지한다. Phase14 착수/clear/commit/push/PR 권한은 행사하지 않았다.

## 구현·수정 결과

0010 evidence_events의 NO ACTION FK, session sequence/dedupe unique, owner/session/asset/job 관계 guard와 업무+사건 원자성은 유지한다. 새0011_hesitant_husk SQL/meta/journal만 추가하여 running cancel 최초 initiator ID/type을 영속하고 BEFORE TRUNCATE statement guard를 넣었다. UPDATE/DELETE/TRUNCATE23514, 원장 INSERT 시간을 포함한 마지막 lease/deadline fence, worker replay 중복0을 검증했다. 기존 적용0010/0000~0009 변경0·운영 backfill0.

기존 verification64KiB 회귀는 원장 verify.run을 job 참조·요약(jobId/verdict/engineVersion/checkedAt/ruleCount)+guide로 저장하여 해결했다. full ruleResults/기존 verdict는 jobs.output.results와 assets.verification에 그대로 보존하며 이전 전체 payload도 strict 읽기 호환한다. PostgreSQL jsonb::text를 직접 측정하여 asset 및 전체 output의 기존64KiB CHECK와 일치한다. provider run/queue.complete의 초과 결과는 실제 INVALID_RESULT/재시도 없음, dispatch 이후 cost unknown 보존이다. prompt는 해당 asset.generation_job_id의 job input 참조만 사용하고 다른 batch 혼합/원장복제0이다. candidateCount는 native 불변 성공사건 actual resultCount, legacy 동일job 저장 assets만 계수한다.

admin queued/running cancel/retry는 actual DB actor ID/admin type, 자동 retry는 worker, owner 요청은 user다. running cancel 요청을 성공/완료 사건으로 꾸미지 않고 실제 worker terminal 때 최초 initiator를 기록한다. owner 응답은 admin 또는 owner와 다른 actor ID를 null로 마스킹하고 수정 전 immutable foreign actor도 보호한다. native asset은 legacy session에서도 탄생 이후 selection complete이며 legacy unknown history는 null이다. FinalizationService/certificate는 guide ID/version/기록 checksum 기준의 stale 판정을 공유하고 과거 missing-version은 stale다. 기존 finalization snapshot/rule/job-output/asset version/busy guards 약화0.

두 evidence/certificate route는 auth-first401 후 strict validation422, 반복 query key422, decimal limit1~100/default30, bounded cursor를 적용한다. HEAD는 GET 인증/status/header와 같은 body0; OPTIONS204; POST/PUT/PATCH/DELETE405·Allow GET, HEAD, OPTIONS·private/no-store/requestId를 명시한다. 보관 project/session 및 soft-deleted asset metadata owner 읽기는 유지하고 타 owner404/정지401/기존 file/write 차단은 그대로다. 파일 storageKey/URL/raw provider payload 노출0·공개 원장 write API0.

fixture cleanup은 공식 claps_test synthetic regex와 owner/email 생성 manifest에 제한한다. 자체 PNG/시험 en-GB는 정확한 파일집합/SHA manifest 확인 후 처리하며 기존 자료 영구삭제0. UI/3언어 문구/dependencies/production registry 변경0, generation/verification 미연결503 유지. Phase14 ko/en/ja의 admin 마스킹·summary 참조·unknown null·native birth selection·stale 표시 정책은 수정 보고와 인계에 명시했다.

## 실제 검증

| 범주 | 최종 고유 결과 | 근거 (evidence/phase13/fixes/) |
| --- | --- | --- |
| Unit | 56 PASS/0 FAIL/0 SKIP | unit-final.log, Phase13 5 |
| Integration | 157 PASS/0 FAIL/0 SKIP | integration-final156 + integration-mask-final31 + integration-stale-final49; 동일 시험 중복 계산0, Phase13 31 |
| i18n | 9 PASS/0 FAIL/0 SKIP | i18n-final.log, ko/en/ja 13ns/1080키, en 유지/ja disabled |
| Production E2E | 52 PASS/0 FAIL/0 SKIP | production-e2e.log 기존51PASS + production-e2e-retry.log 실패1건PASS, 실제 web+worker/전체 관련UI·권한·HTTP, Phase13 3 |
| 별도 demo | 1 PASS/0 FAIL/0 SKIP | demo.log, fresh 합성 DB/실제 web+worker |
| 정적/build | PASS | static-final/lint-stale-final, 기존2warnings·0errors, build-e2e-stale-final 및 build-3pack-final network-none exit0 |
| Migration/구코드 | PASS | migration.log: empty/0008/Phase12/Phase13 clones apply/replay12·기존fields/rows/events 보존·구 b4749eb Auth session/profile/logout |
| Runtime | PASS | runtime-3pack.log: 최종 immutable3팩에서 실제2restart·동일certificate/증빙4/selection1/nativeSharp |
| 보존/보고 | PASS | preservation.log/report-validation.log: 보호330/0010/review hash·HEAD+6refs·journal11prefix, 동일MD/HTML·local links·credentials0 |

고유 **275 = 56+157+9+52+1**, Phase13 새 framework **39 = 5+31+3**(원래22 + 후속17). integration157은 기존126+현재Phase13 31이며 privacy/stale 보완 후 해당31과기존Phase8 18를 재실행했다. 수정 영향이 없는 이미PASS 시험을 반복하지 않았고 반복/script/manual/migration/runtime는 고유 수에 합산하지 않는다. 모든 기술 필수 PASS/skip0/0개suite0/최종FAIL0. Phase13 신규UI/print/PDF는 후속 범위여서 신규화면 수동검사는 비적용이고 기존UI/390px/200%/locale 회귀는 실제 production E2E에 포함한다.

최초 실패도 보존한다. 이번 unit55/1은 숫자변환 기대 fixture, typecheck exit2는 fixture literal 타입, integration153/2는 apply 뒤 dispatch한 snapshot 순서 오류였고 교정 후 PASS했다. 최초 offline build exit1은 외부 deps symlink를 Turbopack이 거절하여 내부 Linux deps 복사로 해결했다. 최초production51PASS/1FAIL은 release의 public/public 중첩 fixture 오류로 이미지14요청400이 발생했다. 새 평탄 immutable3팩release에서 전체public hash를 대조하고 실패1건만재시험PASS, 기존PASS51 반복0. 마지막boundary apply3건은필터3PASS/28deselected(Vitest skipped 표기), 이전31전체PASS인28을제외했으므로필수누락0. 서버재시작뒤Errno30/WSLsocket1 제한은FullAccess복구후재개했고최종i18n9/packcleanup로그를원장에반영했다. 기존 최초 typecheck/integration/합성IP429 실패 및 원장은 불변 보존했다. 이번 fresh E2E4290이며 실제 controlled web143/worker0이다. Phase12 actual exit139 원인은 여전히 미확정으로, 이번 PASS는 원인 규명이나 외부 native/provider 품질 승인이 아니다.

## 완료·남은 외부 조건·인계

업무+원장 rollback/replay/늦은완료 fencing, two-owner/정지·보관·삭제 읽기 대 파일/write, 정확 batch/legacy unknown, ±1B/INVALID_RESULT, admin3경로/PII, TRUNCATE, strict HTTP/auth/HEAD, migration/restart 및 L01/E01은 모두 PASS다. 독립 review 후 이번 9건 수정·재시험·동일MD/HTML·source trace·인계를 완료했으며 로컬 기술 종료 gate를 충족한다. 원본 review 판정은 CHANGES_REQUESTED 그대로이고 추가 독립 APPROVED를 주장하지 않는다.

Phase17 운영 선행조건: migration owner와 앱 role 분리, 앱 evidence_events SELECT/INSERT 전용 권한/DDL·UPDATE·DELETE·TRUNCATE 권한 제외를 운영 담당자가 설정·검증한다. table owner/superuser의 trigger 해제 우회까지 막았다고 주장하지 않는다. 실공급자/과금/법무·보존/RPO·RTO/ja 원어민·용어/OAuth/운영ja·외부 출시는 별도 외부 BLOCKED이며 Phase17 인계 책임이다. 기술 finding 다음Phase 이월0. Phase14는 DTO/표시 정책 준비자료만 인계하고 착수0.

새 합성 DB claps_test_fix13/fixprefix13/fixempty13/fixupgrade13/fixlatest12/fixlatest13/fixdemo13는 보존했다. 고정Node22.22.0/pnpm10.34.5/Next16.3.3/Linux sandbox `/tmp/claps-phase13-fix-sandbox`, 새 최종 immutable `/tmp/claps-phase13-fix-release-3pack`, private uploads/mail/fixture/trace 및 hash manifest를 보존한다. 자신의 web3211/3212/3213와 worker는 종료했고 기존 isolated55437 및 사용자3193/55433/55436은 미수정이다. own en-GB13파일은 hash 대조 후 제거하여 source/build/final release ko/en/ja3팩을 확인했다. 기존Phase0~12 docs/evidence/0010·Claude review/refs/이전dirty tree는 보존했다.

이번 live worker_done으로 coordinator에 종료·검증·인계를 보고하고 대기한다. Phase14/clear/commit/push/PR/운영ja/실공급자/과금/실송신/영구삭제0.

마지막 artifact 구조검사에서 과거 실패 E2E release의 messages/messages 중첩 사본도 발견했다. 해당 historical release는 실패 증거로만 보존하며 재사용하지 않는다. 그 안의 자체 en-GB13파일은 서버 종료 및 정확한 SHA manifest 대조 후 추가 정리했고 최종 source/build/3팩 release는 public/messages 중첩0이다. 최초 검사 exit1과 교정은 fixes execution 원장에 보존했다.
