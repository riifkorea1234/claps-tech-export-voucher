# Phase14 독립 완료 리뷰 — 증빙 UI·타임라인·증명서·인쇄

## 1. 판정

**CHANGES_REQUESTED**: Critical 0, Major 1, Minor 2, Nit 6.

- 리뷰일은 2026-10-01(KST)이다. reviewer는 기존 Claude(task_a1c32f809413 / ctx_d8c998e759f4)이다. 제품 코드·시험·원장·기존 문서/증거/DB/schema/migration/refs는 수정하지 않았다. 이 문서와 reviewer 증거 `md/evidence/phase14-review/`(17파일, `sha256-manifest.txt`)만 작성했다.
- 대상은 `/mnt/f/claps-product` HEAD `b4749eb851c6cfef28f207adfca5f3f1ee942f66` 위의 미커밋 Phase14 변경이다. `md/evidence/phase14/files-modified.json`의 19개 SHA가 모두 실제 파일과 일치한다. `/tmp/claps-phase14-sandbox`의 19개 파일도 같다. reviewer worktree는 기준으로 쓰지 않았다.
- coder의 고유 287 PASS(60/158/9/59/1)는 실측으로 뒷받침된다(§3). badge·증명서·인쇄·권한·3언어 390px/200%·print gate·prompt/개인정보 노출 0도 확인했다.
- 그러나 승인 통합계약이 명시 이식을 요구한 **"연속 동일 사건 접기·펼치기"(T25/E02)는 실제 서버가 쓰는 사건으로는 한 번도 성립하지 않는다**(M1). 65사건 접기 PASS는 실제 writer가 만들 수 없는 합성 사건(`generate.requested` + `job_id NULL`)에 의존한다. plan §11 완료조건 4개 흐름 중 하나가 실질적으로 충족되지 않으므로 APPROVED로 판정하지 않는다.
- 나머지는 좁은 범위에서 고칠 수 있는 Minor 2건과 Nit 6건이다. 같은 coder의 후속 수정 dispatch를 권장한다. Nit의 이월 여부는 root가 결정한다.
- Phase11 전체 IN_PROGRESS, 외부 출시 BLOCKED, phase12-plan §16 사용자 B 승인(Phase17 기술 인계까지)은 그대로 유지한다. Phase12 exit139 원인은 여전히 미확정이다. reviewer는 phase 종료, coder 수정, Phase15 착수, clear, commit/push/PR 권한을 행사하지 않았다.

## 2. reviewer가 직접 수행한 검증

환경은 Linux, Node v22.22.0, pnpm 10.34.5, Next 16.3.3이다. 소스는 `/tmp/claps-phase14-sandbox`를 reviewer scratchpad로 복사했다. node_modules는 `cp -a`로 내부 symlink를 보존해 복사했고, 실행 중인 native copy는 하지 않았다. DB는 격리 PostgreSQL `claps-phase12-db-test-1`(127.0.0.1:55437)에 **새로 만든 `claps_test_review14`**만 썼다. web/worker는 reviewer 전용 :3292만 사용했다. release는 coder의 최종 immutable `/tmp/claps-phase14-release-3pack`을 `cp -a`로 복사해 썼다. 이 사본은 messages 3팩이 원본과 byte 동일하고, 내부 상대 symlink를 유지하며, Phase14 chunk/CSS를 포함한다. coder DB(claps_test_phase14 등 7개), 이전 Phase DB, 사용자 3193/55433/55436은 SELECT만 했다.

| 검증 | 실제 명령/방법 | exit / 결과 |
| --- | --- | --- |
| Next 문서 | 설치본 `node_modules/next/dist/docs` page.md(Promise params/searchParams), not-found.md(try/catch 안의 notFound 재throw), use-client | page.tsx는 `await params/searchParams`, notFound를 catch에서 재throw한다. 계약 일치 |
| 변경 파일 정독 | 19파일 전체 및 Phase13 contract/writer/service, workspace-data, asset-verification | 아래 findings |
| typecheck | `corepack pnpm typecheck` | **exit 0** |
| lint | `corepack pnpm lint` | **exit 0**, 0 errors / 기존 2 warnings |
| unit | `corepack pnpm test:unit` | **exit 0, 60 PASS** / 15 files |
| i18n | `corepack pnpm test:i18n` | **exit 0, 9 PASS** |
| integration | 새 DB, `DATABASE_URL` 미주입, `TEST_DATABASE_URL=…/claps_test_review14 corepack pnpm test:integration` | **exit 0, 158 PASS** / 13 files. coder는 assertion 수정 뒤 phase14 파일 1개만 재실행했으므로 전체 158은 이번이 최초 단일 실행이다 |
| production E2E | `python3 run-prod.py --grep-invert phase11` (최종 release 사본 + Node22 web/worker :3292, `E2E_EXTERNAL_WORKER=1`) | **exit 0, 58/58 PASS**(4.0분). web 143(종료 신호)/worker 0. phase11 1건은 en-GB 시험팩 build가 필요해 제외했다(새 build 대신 coder의 release-e2e2 기록을 인정) |
| 목록/skip | `playwright test --list`, `.skip/.only/.fixme/todo` grep | 59 tests / 14 files, skip류 0 |
| targeted probe R1~R6 | reviewer 전용 `review14-probe.spec.ts`(고유 수에 넣지 않음), 같은 :3292 | 1차 5 PASS / R3 1 FAIL. R3 실패는 probe의 버튼명 오기("다시 시도" → 실제 "다시 불러오기")였고, 수정 뒤 R3 1 PASS. 결과는 §4 |
| fold probe | reviewer 전용 `review14-probe.test.ts`: 실제 `JobService.insert`로 생성 요청 5건 → `EvidenceService.list` → `groupEvidence` | **exit 0**: 연속 `generate.requested` 5건이 모두 크기 1 그룹이다(M1) |
| PDF/캡처 직접 확인 | 내 실행의 3언어 print PDF, 65건 PDF를 PyMuPDF로 텍스트 추출하고 렌더링해 직접 확인(visual/) | 65건 PDF는 6쪽이고 순번 1~65가 모두 있다. email·storageKey·/api/files·fixture prompt 0. en PDF의 "Prompts"는 범위 고지 문구뿐이다. 3언어 PDF는 각 4쪽 |
| coder 캡처 | `screenshot-manifest.json` 12개 사본과 testInfo 원본의 SHA 재계산 | 12/12 일치 |
| 보존 | Phase14 착수 baseline 817 hash 재계산, refs 조회 | 변경은 Phase14 목록 8개 + `md/phase14-plan.md`(coder §16~17 갱신)뿐이다. db/·Phase0~13 문서/증거 변경 0. HEAD와 refs 불변 |
| manifest 복구 | `md/evidence/phase13/runtime-fixture-manifest.json` SHA, Phase13 private fixture와 claps_test_phase13 SELECT | SHA `e2852f5a…`가 baseline과 일치한다. owner/session/asset이 claps_test_phase13에 실재하며 private fixture와 같다. 복구가 정확하다 |
| ja 상태 | locales 조회 | phase14 / phase14demo / phase13 / fix13 / review13 / review14 모두 ko=true, en=true, ja=false |
| 결과 MD/HTML | 본문 숫자 집합 비교, script/외부 URL 검사 | MD에만 있는 숫자 0, script·외부 URL 0 |
| source trace | T21/T23/T24/T25/T26 full SHA 5개 | 모두 origin/feat/#2·#3·#4에 실재한다. 커밋 제목이 T행과 일치한다 |

reviewer DB `claps_test_review14`는 검토 재현용으로 보존한다. 시험 cleanup 뒤 users 0, evidence 0, ja=false이다. :3292 web/worker는 종료를 확인했다(LISTEN 0).

## 3. coder 주장 수치 검증

| 범주 | coder 주장 | reviewer 실측 | 판정 |
| --- | --- | --- | --- |
| unit | 60 (신규 4) | 60 PASS, `tests/unit/phase14.test.ts` 4 | 일치 |
| integration | 158 (신규 1) | 158 PASS(전체 단일 실행), phase14.test 1 | 일치 |
| i18n | 9 | 9 PASS | 일치 |
| production E2E | 59 (신규 7) | 최종 release 사본에서 58 PASS + phase11 1(제외 사유 위 표), phase14.spec 7 | 실질 일치 |
| demo | 1 | 재실행하지 않음. demo.log와 ledger(exit 0)만 확인 | 문서 확인 |
| 합계 | 287 / 신규 12 / skip 0 / FAIL 0 | 위와 같음 | 정직 집계 확인 |

최초 실패와 수정(lint 1건, integration 시작 차단과 assertion 1건, native symlink, E2E 55/4, ja 누수, manifest 경로)은 모두 ledger/jsonl/로그에 보존되어 있다. 최종 수에 반복 PASS를 더하지 않았다.

## 4. targeted probe 결과

| ID | 시나리오 | 관찰 |
| --- | --- | --- |
| R1 | `/assets/{sid}/evidence?asset=` (빈 값) | select는 첫 자산을 보여 주지만(selectedIndex 0) **증명서 0개, 인쇄 버튼 활성**. 같은 항목을 다시 골라도 onChange가 없어 증명서 0 (m1) |
| R2 | 다음 페이지 조회 1.5초 지연 중 새로고침 | 조회 중에는 새로고침이 disabled라 경쟁이 생기지 않는다. 최종 41건 중복 0. 조회 중 badge는 "기록중 · 서버 증빙 조회 중"(m2) |
| R3 | 2페이지 GET 503 | timeline은 30건을 유지하고 인쇄를 차단한다. **badge는 전체 실패 문구로 바뀌고 건수를 숨긴다**(m2). timeline 재시도 뒤 41건, 인쇄 활성 |
| R4 | 자산 A의 증명서 응답 지연 중 B로 전환 | B 표시(abort 정상). 늦게 온 A 응답이 덮어쓰지 않는다 |
| R5 | Tab 순서 / print media 본문 / 보관된 세션의 back 링크 | sidebar → back → select → 인쇄 → 새로고침 순서. 함정 0. print 본문에 email/owner ID 0, UUID 4개(session/asset/project/job). **삭제(보관) 세션의 back 링크 `/final`은 404**(n2) |
| R6 | final 화면 badge/timeline, 전부 조회하기 전의 직접 인쇄 | badge는 성공과 30건, timeline 토글 aria-expanded=false. 직접 print media에도 "모든 사건 조회와 증명서 조회가 완료되어야" 문구 유지 |
| F1 | 실제 `JobService.insert` 생성 요청 5건 | 5개 job ID, 그룹 크기 [1,1,1,1,1,1] (session.created 포함). 접기 0 (M1) |

## 5. Findings

### M1 (Major) — 연속 동일 사건 접기가 실제 원장 데이터에서 성립하지 않는다

- 위치: `lib/evidence-view.ts:6-12` `groupEvidence`, `tests/e2e/phase14.spec.ts:12-15` `extraEvents`, `tests/integration/phase14.test.ts:17`.
- 계약: 통합계획 §2(l.82)는 "연속 동일 사건 접기·펼치기"를 단계3에 명시 이식하도록 했다. branch-analysis T25 판정은 **이식**이고, plan §11 완료조건 첫 줄도 이 흐름을 요구한다. 원본 `590b9a7`은 연속한 같은 kind를 접는다.
- 구현: 같은 kind에 더해 같은 jobId, assetId, actorId, actorType이 모두 같아야 접는다. 그런데 실제 writer에서는 이 조건이 성립하지 않는다.
  - `generate.requested/succeeded/failed/canceled`와 `verify.run`은 job마다 고유한 jobId를 갖는다(`jobs/service.ts:39`, `evidence/writer.ts:29-36`, `verifications/handler.ts:55`).
  - `(jobId, kind, assetId)`는 `evidence_dedupe` unique key라서 같은 조합의 두 번째 사건이 없다.
  - jobId가 NULL인 `asset.adopted/unadopted`, `final.added/removed`, `asset.deleted`는 상태가 토글되거나 1회뿐이라 같은 asset의 같은 kind가 연속될 수 없다.
- 재현: reviewer `md/evidence/phase14-review/review14-probe.test.ts`를 실행하면 실제 `JobService.insert` 5회 뒤 모든 그룹 크기가 1이다(exit 0). E2E의 32/32 접기는 `generate.requested`를 **job_id NULL**로 SQL INSERT한 합성 사건에서만 나온다. 실제 경로는 이런 사건을 만들 수 없다.
- 영향: 4개 필수 흐름 중 하나가 production에서 사용되지 않는 코드다. 증거(65사건 접기 PASS, 캡처)가 실제 동작을 대표하지 않는다. coder 문서는 "보수적 group 경계 차이"로 기록했지만, 계약 변경에 대한 승인 기록은 없다.
- 권장 수정:
  - (a) 연속한 같은 kind(필요하면 + actorType)를 접는다. 그룹 머리에 "서로 다른 작업 N개 / 자산 N개"처럼 공통 batch가 아님을 표시하고, 펼친 각 사건에는 자기 job/asset 참조를 유지한다. 증명서의 batch 비혼합(통합계획 l.78)은 이미 서버 DTO가 보장하므로 timeline 시각 묶음과는 다른 문제다.
  - (b) E2E/integration fixture는 실제 writer 경로(JobService.insert, patchAsset) 또는 서로 다른 실재 job ID로 만든다.
  - (c) 보수적 경계를 유지하려면 root가 사용자에게 계약 변경 승인을 받고 plan/result에 "실데이터 접기 0"을 명시한다.

### m1 (Minor) — 빈 `?asset=`에서 증명서 없이 인쇄가 활성화되고 선택을 복구할 수 없다

- 위치: `app/(app)/assets/[id]/evidence/page.tsx:18,21`, `page-content.tsx:12,22`.
- 원인: `query.asset === ""`이면 falsy라서 검사를 통과한다. 그런데 `typeof === "string"`이라 `initialAsset=""`가 된다. 자산이 있는데도 `assetId=""`라서 `ready`가 증명서 없이 true가 된다. 제어 select의 값이 어느 option과도 맞지 않으므로 화면에는 첫 자산이 선택된 것처럼 보이고, 그 항목을 다시 골라도 change가 발생하지 않는다.
- 재현: probe R1 결과는 certVisible 0, printEnabled true, 재선택 뒤에도 0이다.
- 권장: `query.asset || assets[0]`로 처리하거나 빈 값을 404로 보낸다. 자산이 있을 때는 선택 없음 상태로 인쇄할 수 없게 하고, 이 경우를 E2E 1건으로 추가한다.

### m2 (Minor) — badge 상태 의미: 조회를 "기록중"으로 표시하고, 부분 실패를 전체 실패로 바꾼다

- 위치: `messages/{ko,en,ja}/evidence.json` `reading`("기록중 · 서버 증빙 조회 중" / "Recording · reading server evidence"), `components/domain/evidence-badge.tsx:7-12`, `evidence-data.ts:24-29`.
- 관찰:
  - GET 대기 상태(초기, 새로고침, 다음 페이지 조회)를 "기록중/Recording"으로 표시한다. 그 시점에 서버 기록이 진행 중이라는 근거는 없다. 이 Phase의 UI에는 생성 버튼도 비활성(`futureFeature`)이다.
  - 다음 페이지만 실패해도(R3) badge는 "조회 실패. 기록 여부를 확인할 수 없습니다"로 바뀌고 이미 조회한 30건을 숨긴다. badge의 재시도는 `reload`라서 누적 페이지를 버린다. timeline의 재시도는 `loadMore`로 이어 간다. 같은 화면에서 두 재시도의 의미가 다르다.
- 권장: 조회 중은 "서버 증빙 조회 중"으로만 표시한다. "기록중"은 실제 job 진행 상태에 연결하거나 제거한다. 부분 실패는 "N건 조회 · 다음 페이지 조회 실패"로 구분하고 badge 재시도도 loadMore로 맞춘다. 3팩 문구를 같이 고친다.

### Nit

- **n1** print 출력에서 그룹 요약이 사라지고 빈 쪽이 생긴다. `evidence-timeline.tsx:30`의 그룹 버튼이 `print:hidden`이라 "kind · N건 · #a–b"가 출력되지 않고 시각 범위만 남는다. `globals.css`의 `.evidence-document li { break-inside: avoid }`가 32건 그룹 li 전체에 걸려 65건 PDF 2쪽이 거의 비어 있다(221자, visual/t65-p2.png). 그룹 요약을 print 전용 텍스트로 남기고, avoid는 개별 사건 li에만 적용하기를 권장한다.
- **n2** 보관·삭제된 세션 증빙 화면의 back 링크 `/assets/{sid}/final`이 404다(R5). metadata-only일 때는 링크를 숨기거나 목록으로 보내기를 권장한다.
- **n3** 자산 선택 option이 UUID만 보여 준다(390px에서는 앞부분만 보임). 생성 순번/시각/삭제 여부를 함께 표시하기를 권장한다.
- **n4** `page.tsx:14`는 권한 확인만을 위해 `service.list`로 사건 30건을 읽은 뒤 `evidenceSession`을 다시 호출한다. 중복 조회를 하나로 줄일 수 있다.
- **n5** 결과 보고의 실행 기준 build가 불명확하다. production 59 중 51건은 최종 release가 아닌 release-e2e2(수정 전 CSS, en-GB 포함)에서만 PASS했다. integration 158도 assertion 수정 뒤 전체를 재실행하지 않았다. reviewer 재실행(158 PASS, 최종 release 58 PASS)으로 실질은 확인됐지만, result에 build별 출처를 적기를 권장한다.
- **n6** `runtime-report-path-recovery.log`에 덮어쓴 파일 경로와 전후 SHA가 없다. reviewer가 대상(`md/evidence/phase13/runtime-fixture-manifest.json`, `e2852f5a…`)과 정확 복구를 독립 확인했다. 감사 재현성을 위해 경로/hash를 log에 추가하기를 권장한다.

## 6. 범위 확인(문제 없음)

- strict GET + AbortSignal, 세션/revision 전환 시 결과 폐기, 누적 중복 0, cursor 실패 유지와 재시도를 확인했다. 원장, 공개 write API, localStorage writer 변경 0, 원본 store/barrel 이식 0.
- unknown/null을 0과 구별한다(`?? missing`, 실제 0 표시). native/legacy-derived, partial/complete/unrecorded, session history와 selection coverage 분리, legacy 세션 native asset의 selection complete, pass/warn/reject/unknown/stale(E2E와 내 실행 PASS)를 확인했다. canFinalize 가드는 그대로다.
- 보관·삭제 metadata 읽기와 파일 404, 다른 owner의 세션과 다른 세션 asset query 404, 정지 사용자 redirect를 확인했다. index SQL은 `owner_id` 조건을 포함한다. client props에 파일 URL/key/prompt가 없다. certificate DTO의 `generation.prompt`는 owner 본인의 client fetch에만 있고 렌더링하지 않는다.
- print는 전체 cursor와 선택한 certificate가 완료되어야 버튼이 활성화된다. 직접 print media에서도 미완료 문구가 남는다. 접힌 그룹과 details가 출력에 포함되고, 3언어 PDF와 65건 PDF 모두 개인정보/capability/prompt 0이다. 권리 효력 단정 문구 0(source/desc/timelineDesc 모두 "보장하지 않음").
- 3언어 390px/200% 가로 넘침 0, keyboard 포커스와 focus ring, console/hydration 오류 0(E2E와 내 실행 PASS). ja 캡처 상단 app header에서 언어 버튼이 제목과 겹치는 것은 Phase14 변경 밖의 기존 layout이므로 finding으로 세지 않는다.
- 새 DB/schema/migration/seed/API write/worker kind 0. Phase13 GET/writer/0011 hash 불변.

## 7. reviewer 자기 공개

- 이전 Phase13 review 세션의 reviewer web(:3291, PID 2210028, `claps_test_review13`, 08:32 기동)이 아직 실행 중이다. Phase13 review 문서는 이 web을 종료했다고 적었으나 사실과 다르다. 이번 TASK의 "이전 DB/환경 중지 금지"에 따라 이번에는 건드리지 않았다. 중지 여부는 root가 결정한다. reviewer 소유이며 사용자 3193/55433/55436과 무관하다.

## 8. 남은 작업과 소유권

- M1, m1, m2는 같은 coder가 후속 수정해야 한다(M1은 (c) 경로를 택하면 root/사용자 결정). 수정 뒤에는 관련 unit/E2E와 접기 E2E를 실제 writer 경로로 재실행하고 reviewer 재검토를 받는다. Nit 6건은 root가 이월할지 결정한다.
- Phase14 종료, Phase15 착수, 두 세션 clear, commit/push/PR, 운영 ja, 실공급자/과금/실송신, 영구 삭제는 수행하지 않았다. Phase17 외부 조건은 기술 PASS로 해결된 것이 아니다.
