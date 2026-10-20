# Phase12 reviewer 후 coder → coordinator/다음 Phase 인계

날짜 2026-10-01. 지정 coder 기존 Codex(term_61cbdd33), 기존 Claude reviewer, coordinator term_797ef407. 대상 `/mnt/f/claps-product` feature/backend, HEAD b4749eb851c6cfef28f207adfca5f3f1ee942f66. 현재 승인된 독립 로컬 기술범위 **COMPLETED / plan EXECUTED**. 기존Claude 독립review CR Major2/Minor7/Nit2 후 새coder수정dispatch에서11finding해결/필수236PASS/인계완료. reviewer원본CR불변이며새APPROVED판정을만들지않았다. **Phase13 착수·clear 권한은 이번 task에 없음**.

## 입력/게이트

[승인·B예외 기간/범위](phase12-plan.md#16-2026-10-01-사용자-실행-지시와-b-예외-승인-기록), [시험 체크리스트](phase12-test-checklist.md), [결과 MD](phase12-result.md), [동일 HTML](phase12-result.html), [22 T행/34 original SHA 추적](evidence/phase12/source-trace.md), [실제 명령/실패/재시험](evidence/phase12/execution-ledger.md)를 함께 검토한다. Phase11 전체 IN_PROGRESS와 외부 출시 BLOCKED는 유지된다. 독립 reviewer→coder 수정 Task→필수 재시험/인계→coordinator 종료/fresh session clear 순서를충족했고 [finding해결](phase12-review-fixes.md)과원본review를함께보존했다. Phase13은coordinator종료/clear후별도dispatch에서착수한다.

## 주요 계약

- `0009_natural_quicksilver.sql`: users nullable text 성명4컬럼, 추정 backfill0/기존 name 유지. web/worker 변경 전 migration 적용. 기존0000~0008/metadata snapshot 불변. DB down 금지, 구버전 고정 b4749eb AuthService의 upgrade schema 읽기/쓰기 smoke PASS.
- `/api/me` GET/PATCH: strict DTO, optional canonical locale와4nullable split fields. 명시 locale는 enabled+deployed여야 함. ja 저장 familyName/givenName 필수, kana선택, name 결합100자 제한. 기존 언어 전환만으로 active access/status 변경0. ko/en표시name와ja성명은별도보존값(권장안①)이며admin에서차이를안내한다. omitted splitfields 보존, explicit empty optional값 null.
- 정규화: 성명/org/search q만 전각 영문·숫자→ASCII, whitespace trim/collapse; kana 필드만 반각kana composition. 전각 punctuation·호환문자·password/token/email/URL/free prompt 제외. org/name maxlength는 정규화 후 검사.
- 일반 seed ko/en/ja absent insert만, ja disabled/ltr/fallbackko/version1; 초기 활성화 ko/en만. DB 게시/선호/version 보존. demo business translation ko/en만, ja 요청 metadata는 ko fallback. 운영 ja 활성화 없음.
- ko/en/ja 각13namespace/1080키(새 evidence41/review44 포함), same-key/placeholder parity; [ja key별 원본/초안](evidence/phase12/ja-source-map.json). coder 초안으로 분류, reviewer는원본1078키·placeholder를검수했고 추가2키는자동parity로검증했다. 법적확정성문구수정근거는review-fixes를따른다. 원어민/제품 용어 승인은 외부 게이트.
- errorLocales+public fieldErrors/API explicit/browser fallback/SSR 배포팩 검사에 ja 포함. route/ownership/origin/error envelope 규칙 유지. timestamps/status/roles/sort/result codes는 서버 ISO/enum/source 그대로, 번역은 표시만.
- local Inter/Noto JP(OFL, wght100~900), server html lang/data-locale+provider 동기화. Noto fullsourceTTF9,589,900bytes/servedWOFF2 4,350,780bytes, Inter served350,336bytes, 양쪽preloadfalse/subset0. Table/factor padding·labels/ja tracking·focus/print fallback; footer existing LanguageSwitcher 사용. 기존 브랜드 Bookk CDN은 보존되고 차단 시 fallback 허용, 신규 locale 폰트는 오프라인 build/실행 가능.
- ja profile-setup/my-page splitfields, required/optional badges 및 관리자4labels, my-page 모바일 scroll; ko/en 기존 single name. disabled social UI koGoogle/Kakao/Naver, enGoogle, jaGoogle/LINE, 사유 노출 및 email flow 유지; provider credentials/real OAuth 없음. T18 임시 오류 조건 복원0.

## 독립 reviewer 검토·수정 후 확인한 계약

1. profile client↔strictDTO↔DB↔구코드 호환과 locale-only access, nullable/길이/다른 계정/Origin/disabled locale 경계.
2. 정규화 allowlist가 보호 문자열에 영향을 주지 않는지, optional kana clearing/ko-en 보존 의미.
3. ja source-map/namespace 키·placeholder/오류6경로 및 법적 확정성 문구. 원어민 품질 PASS로 판정하지 않기.
4. 390px/200%/keyboard/print 스크린샷·관리자성명4labels, Noto full font 비용. shared RecordView 표시 누락은 추가 E2E로 검출해 수정했다.
5. 모든 로그의 최초실패·최종결과·고유수 대조. 기존 Phase10 tester를 현 관리자 dialog Confirm/Restore 링크로 수정했으며 기능 삭제 없이 실제 권한·감사 검증을 유지한다.
6. Phase11 전체 IN_PROGRESS/출시 BLOCKED, 후속12개 T행 미구현, 외부 공급자/native/OAuth/operational ja 조건이 기술시험과 분리되었는지.

## 재현 환경

Compose [compose.yaml](evidence/phase12/compose.yaml), isolated claps-phase12 PostgreSQL17.11 loopback55437. 보존 DB: claps_test, claps_test_empty12, claps_test_prefix12, claps_test_upgrade12, claps_demo. user 기존3193/55436와55433 환경은 건드리지 않았다. Linux source/deps snapshot `/tmp/claps-phase12-sandbox`, stopped/retained container claps-phase12-linux 및 network-none claps-phase12-offline, standalone `/tmp/claps-phase12-production`. private mail/uploads 및 `.env.seed.local`은 `/tmp`에만 있고 공개보고에 credentials/session trace 없음. lifecycle 최신 실제 상태는 결과 보고서 정리 절을 따른다.

다시 migration-check를 실행하려면 checker가 고정 생성하는 DB 이름이 비어 있는 새 격리 인스턴스를 준비한다. 기존 retained DB를 drop하지 않는다. demo checker 환경파일 `PHASE12_DEMO_ENV=/tmp/claps-phase12-sandbox/.env.seed.local`; synthetic only. 전체 E2E 재현 시 `scripts/phase11-locale.mjs`로 en-GB 시험팩을 기존 디렉터리 없음 확인 후 생성하고 build→production standalone web+worker→E2E 순서; checksum이 일치하는 자신의 생성물만 제거한다. demo는 다른 DB/origin/uploads와 고유 Playwright output을 쓰거나 순차 실행한다. 명령은 execution-ledger 참고.

## Phase13에 넘길 내용 — 지금 착수 안 함

기술 완료·독립 review·coder 수정/인계 게이트를 충족한 뒤 Phase13 계획과 함께 위 migration/DTO/3팩/namespace/error contracts/Ttrace를 입력으로 사용한다. 후속 evidence·rationale·snapshot·undo/audit 기능은 구현하지 않았으며 이번 namespace는 완전 팩 기반만 제공한다. 새 키는 ko/en/ja 동시 추가, raw ISO/code 저장 유지. Phase13~17 기존 사용자 계획은 hash 그대로 보존했다. B예외 유효기간은 Phase17 기술 인계까지이며 ref/범위/권한 변경 시 재확인, push/PR/통합/실공급자/과금/운영활성화는 별도 사용자 권한이다.

## reviewer 수정 이후 고정 runtime — Phase13~17 재사용 안내

이 수정 dispatch에서 검증 성공한 host는 WSL2 Linux x64(kernel5.15.153.1-microsoft-standard-WSL2)이다. standalone/worker/Playwright는 **`/home/arcreation/.nvm/versions/node/v22.22.0/bin/node`**(v22.22.0, modules127, SHA256 1bec56ef7cfa9a76f3e0b7c0a87f220eb73f23102b9c0b4c7529a3f7c3ce7c31)로 실행했다. [runtime.json](evidence/phase12/fixes/runtime.json)·[ldd/kernel/image](evidence/phase12/fixes/runtime-libraries.log)에 실측 경로를 고정했다. linker는 `/lib64/ld-linux-x86-64.so.2`, sharedlibs는 `/lib/x86_64-linux-gnu/`의 libc/libstdc++/libm/libgcc_s/libpthread/libdl이다. Node binary만 다른 host로 이동하거나 Windows/Electron 내장 Node를 substituting하지 않는다. 환경변수/credential 전체dump0.

build는 이미지 sha256:4519d80443c271af0f55f956f820842bd4e8d05423eee6441acfbf398ca482aa의 network-none `claps-phase12-offline`에 Linux source/deps snapshot `/tmp/claps-phase12-sandbox`를 /app으로 mount하여 실행했다. compiled `.next/standalone/.`→새불변release디렉터리(검증경로 `/tmp/claps-phase12-release-final-test`), `.next/static/.`→해당static, `public/.`와 `messages/.`→같은이름 direct folder로 평탄복사한다. `cp public target/public`나`cp messages target/messages`로 중첩시키지 않는다.

standalone은 이 WSL host에서 위 절대 Node경로로 `server.js`, worker는같은Node의corepack/pnpm·`workers/index.ts`를실행하고 DB/appOrigin/privateuploads/mail을일치시킨다. 이수정dispatch의초기세션71326/PID1795379는같은node명령으로실행된뒤실제exit139였다. yielded세션종료를늦게확인하여미관측으로잘못보고했고runtime-failure.log에정정했다. 실행중standalone/native파일copy→stop순서가원인후보(확정core분석아님)다. 이후stop-before-copy 또는새immutable release경로만사용하고성공재시작검증을기록한다. 다음Phase도이명시경로/host/library증거와순서를먼저대조한다. 필요한provider/nativebinary도같은Linuxlockeddeps를쓴다.

통합시험은 **externalworker와production E2E를중지한후** 실행한다. 서로DB를공유하는integration/locale/UIfixture를병렬실행하지않는다. 그뒤productionweb+worker→E2E를순차실행하고demo는별도DB/origin/uploads·고유output을쓴다. Phase12 PNG는testInfo.outputPath에생성후최종PASS산출물만명시적으로evidence에복사한다. `/tmp`보존자료는공개artifact/sessiontrace로자동전송하지않는다.


## 최종 시험·보존·다음 실행 주의

최종고유236(unit51/integration126/i18n9/E2E49/demo1),필수skip0/0개suite0. 3팩1080keys/13ns,evidence41/review44. 최종43PNG는fixes/screenshots,고정생성manifest·실패/재시험로그는fixes와ledger. 보호11문서/refs7+HEAD/기존migration18+journalprefix/reviewer원본sha불변. 최종test/demoDB ja disabled/version1,koen enabled2. 자신의3199/3198web·worker종료(servers의도SIGTERM143/workers0),isolated55437/합성5DB/volumes/private자료유지,사용자3193/55436/55433미수정.

미리생성한en-GB13pack은parent/sandbox/production/releases2곳에서새hash일치후정리했고nested0. 현재source·최종build는ko/en/ja3팩이며sandbox의.next는마지막network-none3팩build이다. 전체E2E를재실행할때는en-GB시험팩생성→source복사완료→build→**새release경로에복사**→고정Node실행→test순서. 보존된release-final-test의messages팩은3개로정리됐으나compiledasset은en-GB시험build당시것이다. 마지막3팩build에서 새불변 `/tmp/claps-phase12-release-3pack`을 만들고두재시작health/nativeSharp시험exit0을확인했다(runtime-3pack-final.log). runtime-restarts.py 기본경로는이3팩release이며PHASE12_RELEASE_DIR로다른자신의새release를지정할수있다. 전체E2E는시험팩전용build/release를새로만든다. 실행중compiled/native파일에copy하지않는다.

E2E_MAIL_DIR=/tmp/claps-phase12-mail을생략하면실제mailtokenhelper가실패한다. E2E_EXTERNAL_WORKER=1이면E2E_WORKER_PID에이번검증이직접시작한syntheticworkerPID를주고 `/proc/<pid>/cmdline`의Node/worker경로를대조한다. Phase9fixture구간만SIGSTOP/finallySIGCONT,실제성공과재매칭은worker처리한다. integration은그worker/E2E가종료된뒤실행한다. 호스트기본pnpm9는사용하지않고고정PATH/corepack pnpm10.34.5를사용한다.

runtime실제139원인은확정하지않았다. 같은host/libs/절대Node에서immutable경로두재시작과Sharpimage/health는PASS,정상SIGTERM종료143은실패139와다르다. 재발시core/native/WSL/실행파일수정시간을조사할수있도록runtime-failure/runtime.json/runtime-libraries/runtime-restarts증거를보존한다. 외부native/provider품질승인으로간주하지않는다.

Phase13인계입력은위nullablemigration/strictDTO/3팩/새namespace/errors/ISO-code/Ttrace/환경·실패·외부gate다. Phase11전체IN_PROGRESS/외부출시BLOCKED와원어민·제품ja·OAuth·운영ja·실공급자/과금·법무/RPO/RTO는분리해서유지한다. Phase13~17사용자plan은보존했고이번Task중착수/clear/새worker배정0.
