# Phase12 테스트 진행 체크리스트

## 1. 환경·판정

2026-10-01(KST), `/mnt/f/claps-product` feature/backend, 고정 b4749eb. **독립 로컬 기술범위 COMPLETED / plan EXECUTED**, 기존Claude 독립review CHANGES_REQUESTED→coder11finding해결/미해결Major0/Minor0/Nit0. [수정근거](phase12-review-fixes.md), [결과](phase12-result.md), [실제명령·최초실패·재시험](evidence/phase12/execution-ledger.md). Phase11전체 IN_PROGRESS/외부출시 BLOCKED, Phase13미착수/clear0.

WSL2Linuxx64, 고정Node22.22.0(`/home/arcreation/.nvm/versions/node/v22.22.0/bin/node`)/corepack pnpm10.34.5/Next16.3.3/Chromium/PostgreSQL17.11. DB55437 합성claps_test/demo, web3199/demo3198/동일privateuploads·sandboxmail의실제worker. source복사완료후실행, integration과같은DB의E2E/외부worker는순차, demo는별도DB/origin/output. 실제런타임139실패및immutable release교정기록을인계한다.

## 2. 상태 정의와 자동 검증

PASS는 실제 exit0/기대결과를 확인한 시험이다. FAIL 최초실패도 보존한다. BLOCKED 외부조건은 기술PASS로 대체하지 않는다. 반복/script/static/manual checks를 고유수에 합산하지 않으며 mandatoryskip0/0개suite0이다. 증거경로가 fixes/이면 evidence/phase12/fixes를 뜻한다.

| ID | 필수 | 실제 명령/대상 | 최종 결과·exit·근거 | 상태 |
| --- | --- | --- | --- | --- |
| L01 | 예 | pnpm test:i18n; integration/locale E2E | 3팩각13namespace/1080키, key/placeholder/en동등; i18n9 exit0 | PASS |
| L02 | 예 | unit/integration/HTTP 오류6경로 | ja safe422/404·publicfields·명시/브라우저fallback·strict envelope exit0 | PASS |
| L03 | 예 | network-nonebuild/python verify-fonts/computed style | fullWOFF2/cmap/fvar동일/OFL/wght100~900/en75/ja560missing0·preload0 exit0 | PASS |
| L04 | 예 | unit/i18n/전체CRUD-worker E2E | 서버ISO/code/source보존·입력allowlist/보호문자변경0 exit0 | PASS |
| L05 | 예 | phase12unit8/integration5/E2E7 | strictDTO/ja필수2/kana/null·결합100자·locale-onlyaccess·split보존·admin안내/로딩잠금 exit0 | PASS |
| L06-A | 예 | 최초migration checker+독립review/새old-auth-check | empty/0008clone/replay/nullable4/기존값/구코드session read/write/logout exit0 | PASS |
| L06-B | 예 | seed/activate/demo checker두번·HTTPfallback | ja disabled1/ko-en2·게시/선호보존·ja ko fallback, 최초verifyscript오류수정후exit0 | PASS |
| L06-C | 예 | privateenv DEMO_BASE_URL pnpm exec playwright test --config playwright.demo.config.ts --output=/tmp/claps-phase12-fix-demo-results | 1PASS0FAIL0SKIP exit0 fixes/demo-e2e-retest.log | PASS |
| A01 | 예 | auth전체/Phase12 production | koGoogle/Kakao/Naver·enGoogle·jaGoogle/LINE disabled+사유/email flow/T18미복원 exit0 | PASS |
| BASE-U | 예 | fixedPATH corepack pnpm test:unit | 51PASS0FAIL0SKIP exit0 fixes/unit-retest.log | PASS |
| BASE-I | 예 | ownexternalworker중지+TEST_DATABASE_URL pnpm test:integration | 126PASS0FAIL0SKIP exit0 fixes/integration-isolated.log | PASS |
| BASE-P | 예 | pnpm test:i18n | 9PASS0FAIL0SKIP exit0 fixes/i18n-retest.log | PASS |
| BASE-E | 예 | E2E prefix pnpm exec playwright test --output=/tmp/claps-phase12-fix-final-results | 49PASS0FAIL0SKIP exit0 fixes/e2e-final-retest.log | PASS |
| BASE-S | 예 | fixedPATH pnpm lint/typecheck; docker start -a claps-phase12-offline | lint0errors/기존2warnings·typegen/tsc·networknonebuild exit0 fixes/lint-final-retest.log/typecheck-profile-final.log/build-release-final.log | PASS |
| RELEASE | 예 | en-GB13manifest대조→own생성물만cleanup→i18n9/networknonebuild | parent/sandbox/production/releases5곳+nested0·3팩release i18n9PASS/buildexit0 fixes/cleanup-final.log/i18n-release-final.log | PASS |
| RUNTIME | 예 | python3 evidence/phase12/fixes/runtime-restarts.py | immutable release 두start/health/login/nativeSharpimage/stop PASS exit0,의도SIGTERM143;runtime-restarts-retest.log/runtime-3pack-final.log | PASS |
| PRESERVE | 예 | refs/hash/gitshow/checkjournalprefix | 보호11문서+review원본/refs7+HEAD/옛18SQLsnapshot/journalprefix불변 exit0 fixes/preservation-final-retest.log | PASS |
| REPORT | 예 | python3 evidence/phase12/render-report.py | 동일MD→단일HTML·수치236/49·로컬링크·privacy/CDN0/JS0 exit0 report-validation.log | PASS |

E2E prefix는 ledger의 TEST_DATABASE_URL/E2E_BASE_URL/E2E_MAIL_DIR/E2E_EXTERNAL_WORKER/E2E_WORKER_PID 및고정PATH를모두사용한다. 지정syntheticworker만실패fixture구간SIGSTOP/finallySIGCONT하여queuedUPDATE rowCount1을검증하며성공추천/재매칭은실제worker로완료한다.

## 3. UI와 reviewer 검증

| ID | 필수 | 실제 절차 | 최종 결과 | 상태 |
| --- | --- | --- | --- | --- |
| M1 | 예 | 3localecomputedstyle/원본T01trace | ja text-xs~3xl·행간/medium400·semibold700/tight0/en sm21px·dead densitytoken0 | PASS |
| M2 | 예 | 3locale640CSSpx 및390+root200%, 실제API load6페이지+profile390/200 | 총39상태가로넘침없음,projects제목내부clipping없음,43 PNG | PASS |
| m1 | 예 | T01~T34원본SHA/실제diff경계 | backend변경0파일기존충족명시,실제T01/T13소비파일trace | PASS |
| m2 | 예 | fontcmap/fvar/responsepreload | fullWOFF2 Inter350336/Noto4350780bytes·양쪽preloadfalse/ko preload0 | PASS |
| m3 | 예 | keyboardfocus/emailcomputedstyle | base :where focus·outline-none+ring하나·SSR/hydration회귀0 | PASS |
| m4 | 예 | localeheapUPDATE후orderBy sortOrder | PostgreSQLheap순서의존0 integrationPASS | PASS |
| m5 | 예 | ko/enrename→ja4값보존→ja재동기화/admin | 별도보존권장안①·값차이안내3팩·integration/UI PASS | PASS |
| m6 | 예 | oldfixturetmp/exclude/lint/PNG/enGBnested | sourcefixture0·임시ignore0·testInfo.outputPath/명시copy·nested0 | PASS |
| m7 | 예 | ja용어키/placeholder검토 | 最終版일치/hint규칙충족,원어민승인외부 | PASS |
| n1 | 예 | combined101자/serverfieldErrors/clientdisabled | family/given양쪽경로·보이는hint/save비활성unit/E2E PASS | PASS |
| n2 | 예 | LINEtoken/indent/lint | --platform-line사용·indent정리/lintPASS | PASS |
| UI-L01 | 예 | footer日本語/reload/serverhtml | lang/data-locale/provider/persistence PASS | PASS |
| UI-L05 | 예 | ja setup/my-page/admin mobile200%/DTO | 입력로딩경합해결/성명4labels/저장persist/scroll내부폭 PASS | PASS |
| UI-EVIDENCE | 예 | 43PASS截图manifest/ja criteria/my-page직접검수 | 합성계정만·trace/session공개0·원본PNG자동덮어쓰기0 | PASS |

## 4. 실제 실패·재시험

첫 구현 Task의 실패이력은 execution ledger와 fixes/checklist-before-fixes.md에 보존한다. 수정 Task도 다음을 최종PASS로 숨기지 않았다.

- 복사중i18n7PASS2FAIL exit1→완료후9PASS exit0; 첫unit50은구버전수→51PASS exit0.
- 같은DB간섭 integration122PASS4FAIL/reflow2PASSja4221FAIL→외부worker남은integration124PASS2FAIL→worker/E2E중지순차126PASS exit0.
- 실제ja projects390/200 overflow54px로reflow2PASS1FAIL→rootwrap소비수정/빌드→3PASS exit0,전체49에도포함.
- 전체49중47PASS2FAIL exit1→profile입력초기DTO경합+worker fixture선점해결→49PASS exit0.
- targetmail환경누락1PASS4FAIL exit1→정확한E2E_MAIL_DIR prefix로전체49PASS exit0.
- barepnpm9 engine오류/effectsetState lint오류→고정corepack/eventhandlerreset→lint exit0/기존2warnings.
- 최초runtime139실제실패/미관측보고정정→immutable경로재실행및두nativeprobe cyclePASS. 최초probe는정상143허용assert누락exit1→143명시허용후exit0.
- 보호refs파일마지막HEAD단일행parse exit1→별도검사exit0;폰트venv ensurepip exit1→tmp piptarget성공.

모든 실제로그·명령은 fixes와ledger에 보존했으며 재시도 횟수를 고유 수에 추가하지 않는다.

## 5. 외부/제외 게이트

| 대상 | 상태 | 이유/담당 |
| --- | --- | --- |
| Phase11전체/외부출시 | IN_PROGRESS/BLOCKED | Phase11외부잔여를기술완료에숨기지않음 |
| 원어민/제품ja용어 | BLOCKED 외부 | coder초안·기술parity와별개,사용자지정native담당 |
| 실OAuth/credential·운영ja | BLOCKED 외부 | 별도사용자/운영권한·Phase17이후 |
| 실공급자/과금/법무/RPO/RTO | BLOCKED 외부 | 합성PASS는실품질/운영복구증거아님 |
| 신규evidence/snapshot/undo/audit | 제외 | Phase13~16구현대상 |
| Phase13/clear | 미착수 | coordinator종료/fresh세션다음dispatch |

## 6. 최종 수와 게이트

자동 고유 **236 =unit51+integration126+i18n9+productionE2E49+demo1**. Phase12새framework20(unit8/integration5/E2E7), mandatoryskip0/0개suite0. 독립review수행→11findingcoder수정/미해결Major0→필수재시험PASS→동일MD/HTML/Ttrace/인계 완료로, 새fixdispatch권한에따라 **Phase12독립로컬기술범위 COMPLETED / plan EXECUTED**. 원본review CR을APPROVED로수정하지않았으며외부승인을만들지않았다.
