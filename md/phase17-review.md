# Phase17 독립 검토 — CHANGES_REQUESTED

검토자: reviewer (live task_b7dec3d98677 / ctx_d890fc6df5d0), 2026-10-01.
대상: 실제 부모 `/mnt/f/claps-product`, HEAD `b4749eb851c6cfef28f207adfca5f3f1ee942f66`.
coder 구현: task_b9e371f25c19 / ctx_6fad68e01617, 상태 REVIEW_READY / IN_PROGRESS.
입력 자료: [plan §11·§16](phase17-plan.md), [결과](phase17-result.md)/[HTML](phase17-result.html), [체크리스트](phase17-test-checklist.md), [인계](phase17-handoff.md), [evidence](evidence/phase17/README.md), [Phase16 원본 review](phase16-review.md)/[fixes](phase16-review-fixes.md).

수정 범위: 이 문서와 [review evidence](evidence/phase17/review/README.md)만 새로 만들었습니다. 구현 소스, coder 결과/계획/HANDOFF, 이전 리뷰 원본, coder DB·volume·runtime·evidence·auth 파일은 수정하지 않았습니다. coder 증거 파일 SHA는 검토 후에도 일치합니다(`visual-final-manifest`, `files-modified.json`, `admin-ja.json`). commit/push/PR/deploy, 실공급자/OAuth/과금/연락/실송신, 운영 ja 활성화, 업무 데이터 삭제는 0건입니다. Phase18이나 clear도 진행하지 않았습니다.

## 판정

**CHANGES_REQUESTED — Critical 0 / Major 1 / minor 3 / nit 6.**

다섯 가지 로컬 기술 필수 항목은 독립 환경에서 실질적으로 재현됐습니다.
- 회귀: 70/193/9 그대로 재현. production 78건과 demo 1건도 고유 PASS.
- 복구: 비어있지 않은 DB+파일 복구에서 불일치 0.
- 구 앱(838d8cd): 호환 확인.
- 격리 관리자 ja: 활성/비활성 통과.
- 원어민 요청자료: 1,205 key 정합.
- 세 조건(scale·lock·role): 수치와 의미가 같은 방향으로 재현.

그러나 Major 1건이 있습니다. 새 E2E `phase17.spec.ts`가 coder DB 이름과 부모 증거 경로에 고정돼 있습니다. 그래서 **계획 §10의 표준 전체 E2E 명령이나 다른 격리 DB에서는 77 PASS / 1 FAIL**이 됩니다. "전체 production 78 PASS"는 coder DB 이름을 다시 만든 별도 환경을 합쳐야만 재현됩니다.

minor 3건은 증거가 실제로 증명하는 범위보다 넓게 기술된 부분입니다(role 증명, 복구 표본 범위, 재현성).

## 독립 재현 요약

| 항목 | 결과 | 증거 |
| --- | --- | --- |
| sandbox 원천 | 부모와 477파일 비교, 차이는 `HANDOFF.md` 1건(coder가 sandbox 복사 후 갱신)뿐이며 동기화 후 실행 | [source-sandbox-compare.json](evidence/phase17/review/source-sandbox-compare.json) |
| lint / typecheck | PASS (기존 경고 2) / PASS | lint.log, typecheck.log |
| unit / integration / i18n | **70 / 193 / 9 PASS**, skip 0 (신규 DB `claps_test_review17`@55437, migrate+seed+i18n:activate 후 ko/en=true, ja=false) | unit/integration/i18n.log |
| production 전체 (offline 4519 build, 자체 release 57+en-GB13=70 flat, web 3341 + 동일 DB/uploads/mail worker) | **77 PASS / 1 FAIL**. FAIL은 `phase17.spec.ts:8` DB명 guard. 78개 제목은 coder 목록과 동일하고 중복·skip·retry 0 | [production-full.log](evidence/phase17/review/production-full.log), production-runtime.json |
| `phase17.spec.ts` 단독 (신규 Postgres `claps-rev17-pg`:55459, DB명 `claps_test_phase17`, mount namespace로 부모 `admin-ja.json` 덮어쓰기 차단) | **1 PASS**. 부모 `admin-ja.json` SHA 불변. reauth 403→401→200, CAS 409, 감사 3행, 최종 ja=false | phase17-spec-isolated.log, [admin-ja-isolated.json](evidence/phase17/review/admin-ja-isolated.json) |
| demo (별도 `claps_test_review17demo`, 포트 3343) | 실제 HTTP 가입/검증 + **실제 `pnpm db:seed:demo` CLI 3회**. localized_contents·preferences·project 수 보존, `test:demo` **1 PASS** | demo-production-retest2.log |
| 고유 수 | 70+193+9+78+1 = **351**. 78은 Playwright test 단위이며 ko/en/ja loop 매개변수 케이스를 포함(프레임워크 기준 정당). 명령·assertion·반복·이력 수는 미포함 | — |
| T01–T34 / feature | 34행 full SHA가 branch-analysis와 일치, 모두 존재하는 non-merge 커밋. 25개 test 위치가 실제 `test(` 선언 행. 12 feature는 행 매핑, L06은 demo | 검증 스크립트 출력(아래 §근거) |
| scale 100/1000/10000 (patched copy, 동일 로직) | 10k feedback/evidence 행 bytes **3,715,608/3,640,902(coder와 동일)**. readiness p95 63.8/70.5/114.4ms, history p95 54.6/60.5/112.1ms, feedback EXPLAIN 0.33/5.17/41.39ms, evidence 0.08/0.73/6.85ms. 4개 lock 대상 각각 Lock waiter 4건, 동시 PATCH/발급 replay PASS | [scale.json](evidence/phase17/review/scale.json), scale.log |
| role proof (신규 `claps_rev17_*`, DB `claps_test_review17role`) | positives PASS, 금지 probe 16건 모두 42501. 추가 operability probe에서 실패 확인(m1) | role-proof.json, [role-operability-probe.log](evidence/phase17/review/role-operability-probe.log) |
| 복구 드릴 (신규 Compose `claps-rev17-source/recovery`, DB 55457/55458, web 3351/3352, 현재 이미지 36aaaf/88078c) | source web/worker 스모크 → STOP → 기존 `backup-restore.py` 백업. 대상은 restore 전 `{}`(테이블 0)·uploads 빈 상태. **21 tables / 70 files mismatch 0**. 복구 후 migrate/seed 각 2회에도 fingerprint 동일. web/worker health, 사설 이미지 checksum, 401, 503, archived 404, job 증가 0. health-load 100 요청 errors 0 (p95 145ms). backup/restore 4.2s대 관측(RPO/RTO 아님) | recovery-*.log/json, backup-manifest.json |
| 구 application 838d8cd | 기존 smoke PASS, 21 fingerprint 불변. **추가 probe**: ja를 DB에서 enabled로 둔 상태(이미지에 `messages/ja` 없음)에서도 `/projects`·`/` 200 `lang="ko"`, `X-Claps-Locale: ja` 404 오류는 한국어. 구 Phase11 worker 23c2d2ce를 25초 실행해 running·health 0·로그 오류 없음, 실행 후 fingerprint 동일 | [extra-probes.json](evidence/phase17/review/extra-probes.json) |
| 현재 이미지 provenance | `claps-phase17-web-local`(36aaaf…) 파일 전체가 `/tmp/claps-phase17/release-final`과 SHA 동일. 이미지 쪽에만 Dockerfile, release 쪽에만 런타임 image cache 2개(n3). en-GB 없음 | [web-image-vs-release-final.json](evidence/phase17/review/web-image-vs-release-final.json) |
| 원어민 packet | 13 namespace, **1,205 key**. ko/en/ja key 집합 동일, CSV 값 ko/en/ja 불일치 0, placeholder 41개 3팩 일치 0 mismatch, pack-manifest SHA 일치 | — |
| 화면/PDF 직접 확인 | 제 실행의 ja/ko/en 증빙 PDF 4p와 review-package PDF를 렌더해 확인. review-package는 설계상 3 locale 모두 ja 문서(`lang="ja"` article). 390px/200% 화면에서 가로 스크롤 없음 | [visual/](evidence/phase17/review/visual/), [pdf-inspection.json](evidence/phase17/review/pdf-inspection.json) |
| 보존 | HEAD/6 refs가 initial-git.txt와 일치. coder DB ja=false(v5). 보호 포트 3193/55433/55436/55437 유지. 제 web/worker·Compose·Postgres 정지 | — |

## 지적 사항

### M1 (Major) — `phase17.spec.ts`가 coder DB 이름과 부모 절대경로에 고정돼 표준/독립 전체 E2E가 실패

**위치**
- `tests/e2e/phase17.spec.ts:8`: `new URL(url).pathname!=='/claps_test_phase17'`이면 throw.
- `tests/e2e/phase17.spec.ts:36`: `writeFile('/mnt/f/claps-product/md/evidence/phase17/admin-ja.json', …)`.

**문제**
- 다른 모든 E2E와 helper는 `^/claps_test(?:_[a-z0-9]+)?$`를 허용합니다(`tests/helpers/auth-fixture.ts:34` 등).
- 계획 §10 표준 명령(`.../claps_test`)이나 다른 reviewer/CI 격리 DB에서는 이 test가 항상 실패합니다.
- 어느 checkout(sandbox 포함)에서 실행해도 부모 저장소의 durable evidence를 덮어씁니다. coder의 final-related 실행도 full 실행 결과를 덮어썼습니다.

**재현**
- 신규 `claps_test_review17`에서 전체 실행 시 77 PASS / 1 FAIL (`Error: Own Phase17 DB required`, `review/production-full.log`).
- 별도 Postgres에 DB명을 똑같이 만들고 namespace bind로 쓰기를 우회해야 1 PASS가 나옵니다.

**기대 동작**
- 공용 guard 정규식을 사용하세요.
- 증거는 `testInfo.outputPath()`나 명시적 env 디렉터리에 쓰세요(미설정 시 쓰지 않음).
- 그 뒤 표준 격리 DB 1회 실행으로 78 PASS를 재확인하세요.

이 수정 전에는 체크리스트의 "full production regression PASS78"을 표준 환경에서 재현 가능한 PASS로 인정하기 어렵습니다.

### m1 (minor) — role proof의 app grant 집합으로는 실제 애플리케이션이 동작하지 않는데, "app role split" 로컬 증거로 기술됨

**위치**
- `scripts/phase17-role-proof.ts:19-20`: INSERT/UPDATE 14 테이블 + 원장 3 테이블 INSERT만 부여, DELETE는 0.
- `md/evidence/phase17/conditions-three.md` 항목 3.

**재현** (제 role DB, 각 probe ROLLBACK): `claps_rev17_app`으로 다음이 모두 `permission denied`입니다.
- `DELETE FROM auth_sessions` / `auth_verifications` / `storage_tickets`
- `UPDATE locales` / `localized_contents` / `partners`

그런데 제품 코드는 `DELETE FROM auth_verifications`(7곳), `auth_sessions`(6곳), `storage_tickets`(1곳)과 관리자 locale/콘텐츠/partner 쓰기를 수행합니다. 즉 logout, 이메일 검증, 비밀번호 재설정, 관리자 ja 활성화가 이 role로는 실패합니다.

현재 positive 경로 4개(원장 append, review 발급, feedback, reader)는 append-only 원장의 최소권한 증명으로는 유효합니다. 하지만 운영 role 분리의 "로컬 근거"로 인계하기에는 범위가 과장돼 있습니다.

**기대 동작**: 둘 중 하나를 하세요.
- (a) 필요한 DELETE/INSERT/UPDATE grant 목록을 코드 근거와 함께 추가하고, app role로 대표 auth/admin 경로까지 positive 검증.
- (b) 문서에 "원장 3테이블 최소권한 증명이며 운영 가능한 grant 설계가 아님"과 누락 grant 목록을 명시.

운영 grant 변경은 하지 마세요.

### m2 (minor) — 복구 표본의 "21 tables mismatch0"는 5개 빈 테이블을 포함하고, 표본 다양성이 과장됨

**근거**
- coder `recovery-comparison.json`에서 `admin_audit_logs`, `auth_accounts`, `localized_contents`, `partners`, `storage_tickets`가 0행입니다. 0행끼리 비교하면 checksum은 자명하게 같습니다.
- 그래서 관리자 감사(ja 활성 감사 포함), 게시 번역(L06), partner 데이터의 복구는 증명되지 않았습니다.
- "3 projects/3 sessions/9 jobs"는 같은 합성 fixture를 세 번 생성한 결과입니다. 그중 두 번은 실패하거나 재시작한 시도에서 남은 데이터입니다(failure-notes 참조).
- 제 독립 드릴(1 fixture)도 같은 5개 테이블이 0행이었습니다.

**기대 동작**
- source에 demo seed(partners/localized_contents)와 관리자 감사/locale version 변경을 포함하세요.
- "비어있지 않은 테이블 수 / 전체"를 함께 보고하세요.
- 결과 문구에서 "realistic"을 "동일 합성 fixture 3회분"으로 바로잡으세요.

### m3 (minor) — 신규 스크립트와 도구가 coder 전용 DB·포트·경로에 고정돼 분리된 환경에서 재현 불가

**위치**
- `scripts/phase17-fixture.ts:19,32`
- `scripts/phase17-scale.ts:12,13,45`
- `scripts/phase17-role-proof.ts:14,25,36`
- `evidence/phase17/tools/*.mjs|py`: `/tmp/claps-phase17`, `/mnt/f/.../phase17` 하드코딩

**고정된 값**
- DB명 `/claps_test_phase17`, 포트 55437.
- fixture 경로 `/tmp/claps-phase17/fixture.json`. 다른 실행자가 쓰면 coder의 0600 fixture를 덮어씁니다.
- 부모 evidence 절대경로.

role-proof는 coder DB를 TEMPLATE으로 복제합니다. 또 role 이름이 고정이라 한 번 실행하면 다시 실행할 수 없습니다.

**영향**: reviewer는 경로와 이름만 바꾼 사본 3개로 재현해야 했습니다(diff: `review/patch-*.diff`, 각 2/3/11행).

**기대 동작**: DB URL, 출력 디렉터리, fixture 경로, role 접두를 env 인자로 받고 기본값은 fail-closed로 두세요. README에 재현 절차를 기록하세요.

### nit
- **n1 — 구 앱 fallback 증거 범위**: `tools/smoke.mjs:6`의 `lang="ko"` 단언은 ja가 DB에서 disabled일 때 실행됐습니다. 따라서 결과/`old-application-preservation.json`의 "absent ja pack→ko fallback"을 증명하지 않습니다. 구 Phase11 **worker** 이미지도 실행하지 않았습니다. reviewer probe로 두 동작 모두 정상임을 확인했습니다(extra-probes.json). 증거와 문구에 반영하세요.
- **n2 — 통계 표기**: `scripts/phase17-scale.ts:17` 표본 n=20에서 p95 인덱스 19는 max입니다(lock n=4도 마찬가지). conditions-three/result의 readiness·history·lock "p95"를 "max(n=20)"으로 표기하거나 표본 수를 늘리세요.
- **n3 — immutable release 변형**: `/tmp/claps-phase17/release-final/.next/cache/images/*`(14:57)가 이미지 복사 후 런타임 중에 생성됐습니다. manifest 계산 이후 release가 변경된 것이므로 "immutable"은 강제되지 않았습니다. 읽기 전용 실행이나 재 manifest가 필요합니다.
- **n4 — SQL 우회 토글**: `phase17.spec.ts:37` finally, `tools/native-samples.mjs`, `tools/demo-verify.ts`, `tools/failure-guard.mjs`가 `locales.enabled`/`archived_at`을 직접 SQL로 바꿉니다. 이 경로는 version과 감사를 남기지 않습니다(coder DB ja v5 이후 감사 없는 토글 존재). "ja finally false"는 관리자 API 결과가 아니라 SQL 정리로 보장된 것입니다. 격리 DB라 허용되지만 증거에 명시하세요.
- **n5 — demo 경로 차이**: coder L06은 계획의 `pnpm db:seed:demo` CLI 대신 `seedDemo`를 직접 호출하는 helper(`tools/demo-setup.ts`)를 썼습니다. reviewer가 실제 CLI 3회로 PASS를 재현했습니다. 결과에 차이를 기록하세요.
- **n6 — 원어민 packet 표본과 role 잔존**: `native-japanese/request.md`가 비공개 `/tmp/claps-phase17` 산출물과 final 이전의 `../visual-full`을 표본으로 참조합니다. 검수자에게 전달할 수 있는 정제 표본 세트(visual-final PDF/PNG)를 지정하세요. 또 committed 리터럴 비밀번호를 가진 LOGIN role `claps_phase17_*`가 공유 55437 cluster에 남아 있습니다(reviewer의 `claps_rev17_*`도 재현용으로 남겨 둠). 정리 책임자를 정하세요.

## 다섯 기술 필수 항목 판정

| # | 항목 | reviewer 판정 |
| --- | --- | --- |
| 1 | T01–T34 34/34 + 13 feature 회귀 | trace는 정합. 고유 351 재현. **M1 수정 후 표준 환경 78 재확인 필요** |
| 2 | 비빈 DB+파일 복구 mismatch 0 | 독립 재현 PASS. m2 표본 범위 보완 필요 |
| 3 | 이전 이미지 호환·팩 fallback | PASS. reviewer probe로 팩 부재 fallback과 구 worker 확인. n1 문구 보완 |
| 4 | 격리 관리자 ja 활성/비활성·감사 | PASS(동일 DB명 격리 환경). M1과 연동 |
| 5 | 원어민 요청자료 준비 | PASS(1,205 key/placeholder 정합). n6. 실송신·승인 없음, 실명 담당자는 배정 대기 |

조건 3건(Phase15 n3, Phase16 n2, Phase15 n5)의 로컬 증거는 재현됐습니다. 다만 n5 role 증거는 m1 범위로 한정됩니다. 운영 rate·예산·grant 결정은 계속 BLOCKED입니다. 10k에서 readiness/history p95가 약 2배, feedback EXPLAIN이 약 120배로 커지는 성장 위험은 coder 설명과 일치합니다. 임의 cap·truncate·쿼리 최적화가 없었음도 확인했습니다. 외부 게이트(원어민·제품·운영 ja·공급자·OAuth·법무·RPO/RTO·운영 role/rate)는 실명 담당자 배정 대기 상태로 BLOCKED이며, 지어낸 승인은 없습니다. Phase12 SIGSEGV 139의 원인은 계속 미해결입니다.

## 근거 메모

- 첫 실패는 보존했습니다.
  - `production-full.log`: M1, 원인이 확정적이라 재실행하지 않고 격리 단독 실행으로 보완.
  - reviewer 자체 명령 실수 2건: `demo-production.log`(prod.py 상대경로), `demo-production-retest.log`(제 진단 SQL 컬럼명 42703). 원인을 진단한 뒤 `demo-production-retest2`로 재실행했습니다.
  - 전체 원장: [execution.jsonl](evidence/phase17/review/execution.jsonl).
- 비공개 env/fixture/dump/trace는 `/tmp/claps-phase17-review`(0700, env 0600)에만 있고 공개하지 않습니다.
- coder 수정 재현용으로 reviewer fixture를 보존합니다.
  - DB: `claps_test_review17`, `claps_test_review17demo`, `claps_test_review17role` @55437.
  - 정지 상태 Compose `claps-rev17-source/recovery` volumes, 정지 컨테이너 `claps-rev17-pg`, `claps-rev17-old-*`.
- reviewer는 이 리뷰 원본을 이후 수정하지 않습니다. 같은 coder가 fixes/closure를 별도 문서로 처리하세요.
