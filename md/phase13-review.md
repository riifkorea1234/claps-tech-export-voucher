# Phase13 독립 완료 리뷰 — 증빙 서버·사건 원장

## 1. 판정

**CHANGES_REQUESTED**: Critical 0, Major 0, Minor 5, Nit 4.

- 리뷰일은 2026-10-01(KST)이다. reviewer는 기존 Claude(task_63dc1fbcfa82 / ctx_d1d26ac56a96)이다. 제품 코드·시험·원장·기존 증거는 수정하지 않았고 이 문서만 작성했다. 재현용 파일은 reviewer scratchpad의 격리 사본에만 두었다.
- 대상은 `/mnt/f/claps-product` `feature/backend`의 HEAD `b4749eb851c6cfef28f207adfca5f3f1ee942f66`와 그 위의 미커밋 Phase13 변경이다. 변경 목록은 `md/evidence/phase13/files-modified.json`의 45개 항목과 일치하고 source hash 40개도 일치한다. reviewer worktree는 기준으로 쓰지 않았다.
- 핵심 완료 조건은 실측으로 충족된다. 대상은 업무+원장 원자성, worker replay 중복0, 늦은 완료 fence, 두 owner·정지·보관·삭제 경계, 배치 혼합0, legacy 미기록 구분, additive migration이다. coder가 보고한 고유 수치 258 = 55+142+9+51+1, 신규 22 = 4+16+2, skip0도 확인했다(§3).
- 다만 Phase13이 만든 회귀가 1건 있다. 검증 결과가 64KiB 경계 부근이면 asset에는 저장되지만 원장 write에서 거절되어 검증 적용 전체가 실패한다(m1). 또한 보고서가 주장하는 관리자 actor 실제성이 일부 경로에서 성립하지 않고, 이를 다루는 자동 시험도 없다(m2). 격리 fixture 재현성 결함(m3), append-only 경계(m4), query 엄격성(m5)도 남아 있다. 모두 좁은 범위에서 수정할 수 있으므로 후속 coder 수정 dispatch를 권장한다. Nit은 root가 이월할지 결정할 수 있다.
- Phase11 전체 IN_PROGRESS, 외부 출시 BLOCKED, phase12-plan §16 B 예외(Phase17 기술 인계까지)는 그대로 유지한다. reviewer는 phase 종료나 coder 수정 권한을 대신 행사하지 않는다.

## 2. reviewer가 직접 수행한 검증

모든 재현은 격리 PostgreSQL `claps-phase12-db-test-1`(127.0.0.1:55437)에 **새로 만든** 합성 DB에서만 수행했다. 사용한 DB는 `claps_test_review13`, `claps_test_r13empty`, `claps_test_r13p12`이다. 소스는 `/mnt/f/claps-product`를 scratchpad로 복사했고, deps는 `/tmp/claps-phase13-sandbox/node_modules`를 symlink로 읽기 전용으로 사용했다. 실행 환경은 Linux Node v22.22.0이다. coder DB(claps_test_phase13 등 6개), Phase12 DB, 사용자 3193/55433/55436은 조회만 했고 쓰지 않았다. coder 시험과 동시에 실행한 적은 없다.

| 검증 | 방법 | 결과 |
| --- | --- | --- |
| diff·신규 파일 정독 | 0010 SQL/journal, schema, contracts/evidence, server/evidence/{writer,service,http}, api/evidence, 두 route, jobs/{service,queue}, verifications/handler, finalizations/service, projects/service, admin/service, 시험 3종, helper, migration checker | 아래 findings |
| 원본 T19/T20/T26 대조 | `git show 6cbed1cb`(lib/evidence-store.ts), `5187ad43`(UI 3파일 기록 호출), T26 판정 | 원본의 session 단위 "마지막 generate.run" 집계를 asset별 exact `generation_job_id` 조회로 교체했다. guideName은 id/version/checksum으로 대체했고 localStorage는 미이식이다. 통합계획 §2.2 계약과 일치한다 |
| unit | 격리 사본 `vitest run --project unit` | **55 PASS** / 14 files |
| integration(새 DB) | `TEST_DATABASE_URL=…/claps_test_review13 vitest run --project integration` | 원본 코드 그대로면 phase13 suite 16 PASS 뒤 **afterAll FAIL**(m3). helper 허용 목록에 review DB명만 추가한 **격리 사본**에서 **142 PASS** / 12 files |
| i18n | `vitest run --project i18n` | **9 PASS** |
| E2E/demo 수 | `playwright test --list`, `--config playwright.demo.config.ts --list` | 51 tests / 13 files, demo 1. phase13.spec 2. `.skip/.only/.todo/fixme` 0 |
| 정적 | 격리 사본(reviewer probe 제외) `next typegen && tsc --noEmit`, `eslint` | tsc **exit0**, lint **0 errors** / 기존 2 warnings |
| migration 독립 재현 | 새 `claps_test_r13empty`에 전체 적용을 두 번 수행. 새 `claps_test_r13p12`에는 0000~0009(Phase12 최신)만 적용하고 legacy users/projects/sessions/jobs 행을 넣은 뒤 0010 적용을 두 번 수행 | 두 DB 모두 migrations 11행, replay 뒤에도 불변. trigger `evidence_immutable`/`evidence_relations`와 함수 2개 존재. FK 5개 모두 NO ACTION(`a`). p12 행 전체 row_to_json 동일, 원장 backfill **0** |
| Drizzle snapshot 정합 | 격리 사본 `drizzle-kit generate` | "No schema changes". 0000~0008 SQL/snapshot 변경 0, journal은 idx9·10 추가만 |
| 보존 | coder `validate-preservation.py` 재실행, source-hashes 재계산 | 보호 330 hash 불일치 0, HEAD+6 refs 불변, `git diff --check` PASS, source hash 40개 일치 |
| 보고 동일성 | result.md와 result.html 본문의 숫자 집합 비교, HTML script/외부 URL 검사 | MD에만 있는 숫자 0, script·외부 URL 0 |
| 로그 수치 | unit.log / integration-actor-final.log / i18n-release-final.log / production-e2e-retry-final.log / demo-final.log / migration.log / runtime-3pack-final.log | 55/142/9/51/1 및 migration·재시작 PASS 서술과 일치. 최초 실패(typecheck exit2, integration 136/4 등, E2E 43/8)도 ledger/jsonl에 보존됨 |
| production HTTP 경계 | 최종 3팩 release(`/tmp/claps-phase13-release-3pack`)를 scratchpad로 복사해 reviewer 전용 web :3291 + claps_test_review13으로 실행, 합성 cookie로 probe 후 종료 | 아래 표 |
| 도메인 probe P1~P9 | 격리 사본의 reviewer 전용 `review13-probe.test.ts`(고유 수에 합산하지 않음) | 아래 표 |

### production HTTP probe(:3291, reviewer web만 시작·종료)

| 요청 | 결과 |
| --- | --- |
| owner GET evidence | 200, `cache-control: private, no-store`, `x-request-id` 있음. session.created 1건, history native. 응답에 storageKey/URL 없음 |
| POST/PUT/PATCH/DELETE (두 route) | 405 |
| HEAD / OPTIONS | 404 / 204 (n3) |
| 미인증 / 정지 / 다른 owner / 없는 id | 401 / 401 / 404 / 404 |
| `?foo=1`, `?cursor=0`, `?cursor=01`, `?limit=`, `?cursor=` | 422 |
| `?limit=abc&limit=1`, `?limit=1e1`, `?limit=%205` | **200** (m5) |
| 미인증 + 잘못된 query/id | 422 (401보다 먼저 판정, n2) |

### 도메인 probe 결과

| ID | 시나리오 | 관찰 |
| --- | --- | --- |
| P1 | 관리자 queued generation cancel | actorId=관리자, **actorType="user"** |
| P2 | 관리자 failed job retry | requested 2건: owner/user, **관리자/"user"** |
| P3 | 관리자 **running** job cancel 후 worker 종료 | canceled 1건: **owner/"worker"**. 원장에 관리자 흔적 없음 |
| P4 | app role로 `TRUNCATE evidence_events`, `DISABLE TRIGGER evidence_immutable` 후 UPDATE(모두 ROLLBACK) | **둘 다 허용됨**. rollback 뒤 행 101개 보존 확인 |
| P5 | `limit` 값 "1e1", " 5", "0x10", "5.0", "+7" | 모두 통과. 미인증 + 잘못된 query/id는 ZodError |
| P6 | 한 session에서 adoption 6건 + 관리자 cancel + enqueue 3건 동시 실행 | sequence 1..18 **gapless/unique** PASS. 교착 0 |
| P7 | legacy session(session.created 없음)에서 native 생성 asset 채택 | origin native, selection **partial / userSelectionCount null** (n4) |
| P8 | 64KiB 측정 | 동일 verification: compact 72,314B / jsonb::text 73,928B. verify.run envelope 추가분 **234B** |
| P9 | jsonb::text 65,528B verification | `UPDATE assets SET verification` **OK**, 같은 transaction의 `appendEvidence(verify.run)` **23514 거절** (m1) |

## 3. coder 주장 수치 검증

| 항목 | 주장 | reviewer 확인 |
| --- | --- | --- |
| unit | 55(신규 4) | 직접 55 PASS. phase13.test.ts 4 it |
| integration | 142(신규 16) | 새 DB에서 직접 142 PASS. 단 m3 우회 필요. phase13 = it 14 + it.each 2 = 16 |
| i18n | 9 | 직접 9 PASS |
| production E2E | 51(신규 2) | list 51 / phase13 2. **재실행하지 않음**. 로그 51 passed 대조 |
| demo | 1 | list 1. **재실행하지 않음**. 로그 1 passed 대조 |
| 합계 | 258 / 신규 22 / skip0 | 일치. skip·only·todo 0 |

## 4. Findings

### m1 (Minor): verify.run 원장 envelope가 64KiB 경계에서 기존 검증 적용을 깨뜨림

- 위치: `lib/server/verifications/handler.ts:51-52`, `lib/server/evidence/writer.ts:11,18`, `db/migrations/0010_fat_killer_shrike.sql`의 `evidence_payload` CHECK.
- 재현: P9. asset CHECK를 통과하는 verification(jsonb::text 65,302~65,536B)은 같은 transaction의 verify.run payload에서 +234B가 되어 23514로 거절된다. `complete()`가 throw하면 runner `fail()`이 non-JobFailure를 INTERNAL(재시도 없음)로 종료한다.
- 영향: Phase12에서는 적용되던 경계 크기의 검증 결과가 Phase13 이후 영구 실패한다. 공급자 비용이 이미 발생한 결과가 폐기된다. fail-closed여서 무결성 손상은 없지만 기능 회귀다. 추가로 `parseMetadata`는 compact JSON.stringify로, DB는 공백이 들어간 jsonb::text로 크기를 재므로 app 검사와 DB 검사의 기준이 서로 다르다.
- 권장: verification 크기 상한을 원장 envelope 기준(예: 64KiB − envelope 여유분)으로 handler run 단계에서 먼저 강제해 INVALID_RESULT로 처리한다. 또는 원장 payload에서 verification을 참조/요약 형태로 바꾼다. app 측정을 DB와 같은 jsonb::text 기준으로 맞추고 경계 ±1B integration 시험을 추가한다.

### m2 (Minor): 관리자 actor 기록이 보고 주장과 다르고 시험이 없음

- 위치: `lib/contracts/evidence.ts:7`(actorType user|worker), `lib/server/evidence/writer.ts:29`, `lib/server/admin/service.ts:606,618`, `lib/server/jobs/queue.ts:50-55`.
- 재현: P1/P2에서 관리자 cancel·retry는 actorId=관리자이지만 actorType이 "user"로 기록되어 owner 행동과 type으로 구분할 수 없다. P3에서 관리자가 running job을 cancel하면 최종 canceled 사건은 owner/"worker"로 기록되고 관리자 흔적이 원장에 없다(admin_audit_logs에만 있음). user의 running cancel도 같은 방식이다. `tests/integration/admin.test.ts`와 phase13 시험 어디에도 관리자 actor 원장 검증이 없다.
- 영향: result/handoff의 "관리자 retry/cancel은 실제 관리자 actorId" 주장은 queued cancel과 retry에만 성립한다. 인간 개입 증빙을 해석할 때 관리자 행동이 사용자 행동으로 분류될 수 있다. 또한 owner 타임라인 응답에 내부 관리자 user id가 그대로 노출된다(통합계획 §3 최소정보 원칙).
- 권장: actorType에 `admin`을 추가하거나 payload에 initiator를 명시한다. running cancel은 요청 시점의 initiator를 job에 보존해 terminal 사건에 반영한다. owner 응답에서는 관리자 id를 마스킹하거나 역할만 노출할지 결정한다. admin cancel(queued/running)과 retry의 원장 시험을 추가하고 보고서 문구를 실제 동작에 맞춘다.

### m3 (Minor): 원장 cleanup helper가 DB명을 하드코딩해 새 격리 DB에서 suite가 실패

- 위치: `tests/helpers/evidence-cleanup.ts:7`(`["claps_test","claps_test_phase13"]`). integration·E2E 시험 9개 파일이 이 helper를 사용한다.
- 재현: `TEST_DATABASE_URL=…/claps_test_review13`으로 phase13 integration을 실행하면 16 PASS 뒤 afterAll에서 "Synthetic claps_test fixture cleanup only"가 발생하고 suite가 FAIL한다. `getTestDatabaseUrl`은 `claps_test_[a-z0-9]+`를 허용하므로 두 규칙이 서로 맞지 않는다.
- 영향: 이 Phase의 필수 조건인 "새 fixture DB에서 재검증"을 코드 수정 없이 할 수 없다. 이후 Phase·CI의 전체 integration도 DB명에 종속된다. reviewer의 142 PASS는 격리 사본에서 허용 목록을 확장해 얻은 결과다.
- 권장: `getTestDatabaseUrl`과 같은 정규식(`^claps_test(?:_[a-z0-9]+)?$`)으로 판정한다.

### m4 (Minor): append-only가 row trigger에만 의존하며 TRUNCATE와 trigger 해제를 막지 못함

- 위치: `db/migrations/0010_fat_killer_shrike.sql`의 `evidence_immutable`(BEFORE UPDATE OR DELETE FOR EACH ROW).
- 재현: P4. 앱 연결 role(테이블 owner)로 `TRUNCATE evidence_events`와 `ALTER TABLE … DISABLE TRIGGER`가 모두 성공한다. 시험 helper도 이 우회를 사용한다. evidence_events를 참조하는 FK가 없어 TRUNCATE를 막을 장치도 없다.
- 영향: 계획 문구(UPDATE/DELETE 거절)는 충족한다. 그러나 "고칠 수 없는 서버 보관"(원본 T19 주석, 통합계획 §2.2)과 비교하면 한 번의 SQL로 원장 전체를 비울 수 있다.
- 권장: 추가 migration으로 `BEFORE TRUNCATE … FOR EACH STATEMENT` trigger를 넣는다. 운영 role 분리(테이블 owner ≠ 앱 role, 앱 role에는 INSERT/SELECT만 부여)는 Phase17/운영 인계 항목으로 명시한다.

### m5 (Minor): "엄격 query" 주장과 달리 중복·느슨한 숫자를 수용

- 위치: `lib/server/evidence/http.ts:10`(`Object.fromEntries(url.searchParams)`), `lib/contracts/evidence.ts:22`(`z.coerce.number()`).
- 재현: HTTP에서 `?limit=abc&limit=1`, `?limit=1e1`, `?limit=%205`가 200을 반환한다(순서를 바꾼 `?limit=1&limit=abc`만 422). P5에서 "0x10", "5.0", "+7"도 통과한다. 중복 key는 마지막 값만 남는다.
- 영향: 보안 영향은 낮다. cursor는 정규식 때문에 안전하다. 다만 handoff의 "엄격query/unknownfield거절" 계약과 다르고, Phase14 client가 잘못된 요청을 보내도 조용히 성공할 수 있다.
- 권장: 중복 key는 422로 거절하고 `limit`도 `^[1-9][0-9]{0,2}$` 정규식 후 변환한다. 이 경우들을 unit/E2E에 추가한다.

### n1 (Nit): `evidenceSession`의 도달 불가 조건

- `lib/server/evidence/service.ts:13`: LEFT JOIN 결과는 `null`이지 `undefined`가 아니다. `sessions_project_owner_fk` 때문에 원래도 성립할 수 없다. 삭제하거나 의도를 명확히 하는 것을 권장한다.

### n2 (Nit): 인증 전에 입력 검증

- `EvidenceService.list/certificate`는 `evidenceQuery.parse`와 `idSchema.parse`를 `workspace.run` 밖에서 실행한다. 그래서 미인증 요청이 422를 받는다. 기존 jobs API와 같은 패턴이고 정보 노출은 없다. 계약에서 401 우선을 원한다면 순서를 바꾼다.

### n3 (Nit): HEAD 404, 405 응답 헤더

- Next가 GET export로 HEAD를 자동 처리하면서 `evidenceApi`의 method 검사에서 404가 된다. 405 응답은 Next 기본값이라 `Allow`와 `Cache-Control: private, no-store`가 없다. 정책으로 문서화하거나 HEAD/405 처리를 명시한다.

### n4 (Nit): 보수적 selection·stale 판정

- P7: legacy session에서 **native로 생성된** asset은 탄생 이후 채택 사건이 모두 기록되어 있는데도, session.created가 없다는 이유로 partial/null이 된다. 틀린 값은 아니지만 알 수 있는 정보를 버린다.
- `service.ts:57`: guideVersion이 없는 과거 verification은 같은 guide라도 certificate에서 `stale=true`가 된다. `FinalizationService.view`의 stale은 guideId만 비교하므로 두 화면의 판정이 다를 수 있다. Phase14 UI 연결 전에 정책을 한쪽으로 통일할 것을 권장한다.

## 5. 중점 항목별 판정

| 중점 | 판정 | 근거 |
| --- | --- | --- |
| append-only / 64KiB / schemaVersion1 / 관계 guard / seq / dedupe / lock | 조건부 PASS | 관계·UPDATE/DELETE 거절, gapless 동시 sequence(P6), dedupe 확인. m1, m4 |
| 업무 atomic rollback / 늦은 완료 fence(원장 INSERT 이후 포함) | PASS | generationSucceeded와 verify apply가 `lease_until/deadline_at>clock_timestamp()` 성공 UPDATE보다 앞에 있음. coder 0.2s 지연 주입 시험을 코드로 확인하고 새 DB에서 재실행 PASS |
| worker 실패·취소 기록(보관/정지 이후) vs 업무·파일 가드 | PASS | `end()`는 session 보관 필터 없이 기록. 업무 apply는 active/lockJobParents 가드 유지 |
| owner/admin/auto actor | **부분** | owner·auto retry(worker) 정확. 관리자는 m2 |
| exact batch / candidateCount 불변 / guide id·version·checksum / prompt 복제0 | PASS | certificate는 `a.generation_job_id`로만 조회. native는 succeeded resultCount, legacy는 같은 job 저장 asset 수. payload strict에 prompt 없음(unit + 코드) |
| selection history unknown null / legacy-derived / native / partial | PASS(n4) | legacy는 unrecorded/null, 0으로 추정하지 않음 |
| verification per asset / stale / finalize·cancel·delete writer | PASS(m1, n4) | writer 전수(`UPDATE assets` 3곳 + INSERT)에 사건 연결. asset.deleted 포함 |
| read owner / 정지 / 타 계정 / 보관·삭제 metadata / 파일 write 차단 / no-store / 키·URL 0 | PASS | HTTP probe + coder integration/E2E |
| 엄격 query / cursor / pagination / 공개 POST 0 / 401·404·405 | PASS(m5, n2, n3) | cursor 안정성과 405 확인 |
| 0010 SQL / meta / journal / trigger, 빈·0008·Phase12 latest·replay·구 Auth·cleanup | PASS | 독립 재현(§2). 구 AuthService는 coder 로그로 대조, 재실행하지 않음 |
| 이전 기능 3언어 / ja disabled / backend 503 | PASS(로그 대조) | final-database-state: ja f/1, en·ko t/2. 신규 문구 변경 0. E2E 재실행하지 않음 |
| 보고 동일성 / 보호 330 / 원본 포팅 / 실패 내역 / counts | PASS | §2, §3 |

## 6. 미확정·coder concern 구분

- **actor**: 실제 관찰은 P1~P3이다(m2). 관리자 cancel이 running 상태일 때 귀속이 소실되는 것은 확정이다.
- **fence**: 코드와 coder 실패 주입 시험으로 확인했다. reviewer가 별도의 지연 주입 시험을 새로 작성하지는 않았다. 같은 시험을 새 DB에서 재실행해 PASS했다.
- **legacy**: legacy-derived와 null 동작은 확인했다. 보수적 판정 1건은 n4로 남겼다.
- **429**: `expire-synthetic-limits.py`는 DB명·host·port를 고정하고 9개 synthetic IP key hash만 만료시키며 정책 코드는 변경하지 않는다. reviewer는 E2E를 반복 실행하지 않았으므로 429를 재관찰하지 않았다.
- **Phase12 exit139**: 원인은 여전히 **미확정**이다. reviewer의 짧은 production web 실행(:3291)에서 비정상 종료는 없었지만, 이것은 원인 규명이 아니다. core 분석은 하지 않았다.

## 7. 실행하지 않은 시험

- 전체 production E2E 51과 demo 1은 재실행하지 않았다. 이미 51 PASS가 3회 있고, 반복하면 공통 IP 429가 날 위험이 있다. 로그와 list 수로 대조했다.
- network-none offline build와 새 immutable release 생성은 하지 않았다. 대신 기존 최종 3팩 release 사본을 HTTP probe에 사용했다.
- runtime 2회 재시작(runtime-restarts.py)은 재실행하지 않았다.
- coder `phase13-migration-check.ts`는 고정 DB명 CREATE 때문에 재실행하지 않았고, 새 DB명으로 동등한 재현을 수행했다. 구 b4749eb AuthService 호환은 로그 대조만 했다.
- 수동 UI, print, 390px, 200% 검사는 Phase13 신규 UI가 없어 해당하지 않는다.

## 8. 보존·정리 상태

- reviewer web(:3291)은 종료했다. 실행 중인 reviewer 프로세스는 0이고 worker는 시작하지 않았다.
- 새로 만든 합성 DB `claps_test_review13`, `claps_test_r13empty`, `claps_test_r13p12`는 영구삭제 금지 지시에 따라 **보존**했다. 필요하면 root가 정리를 결정한다.
- 재현 자료(격리 소스 사본, probe 시험, migration 스크립트, release 사본, env)는 reviewer scratchpad에만 있다. 공개 증거에 credential·cookie는 없다.
- 제품 코드·시험·기존 문서·원장·Phase0~12 증거·refs 수정 0. commit/push/PR/clear/Phase14 착수 0.

## 9. 후속 권장

1. coder 수정 dispatch에서 m1~m5를 처리한다(DB 변경은 새 additive migration으로). 수정할 때 관련 경계 시험을 추가하고 보고서의 관리자 actor 문구를 바로잡는다.
2. 수정 후 reviewer 재검토에서는 m1 경계 시험, m2 관리자 3경로, m3 새 DB 실행, m4 TRUNCATE 거절, m5 HTTP query를 우선 확인한다.
3. Nit n1~n4는 root가 Phase14 이월 여부를 결정한다. n4의 stale 정책은 Phase14 UI 연결 전에 확정하는 것을 권장한다.
