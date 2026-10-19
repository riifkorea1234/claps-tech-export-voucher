# Phase12 작업 결과 보고서 — locale/profile 통합 기반

## 1. 판정과 범위

2026-10-01(KST), `/mnt/f/claps-product`, `feature/backend`, 고정 HEAD `b4749eb851c6cfef28f207adfca5f3f1ee942f66`. **Phase12 COMPLETED / 계획 EXECUTED — 승인된 독립 로컬 기술범위**. 기존 Codex 구현→기존 Claude [독립 review](phase12-review.md)(CHANGES_REQUESTED Major2/Minor7/Nit2)→기존 Codex 수정·필수 재시험·인계를 수행했다. reviewer 원본 판정은 보존했으며 새 APPROVED 판정을 만들어내지 않았다. [11개 finding 해결 기록](phase12-review-fixes.md)의 미해결 Major0/Minor0/Nit0과 기술필수 PASS를 근거로, 종료 권한을 부여한 새 task_6d3f5187a91b/dispatch ctx_185632ce82bf에서 기술 완료를 판정했다.

사용자의 roadmap §2.1 B 권장안 위임은 Phase12~17 작업기간의 독립 로컬 기술범위에만 적용된다. [승인·담당·유효범위](phase12-plan.md#16-2026-10-01-사용자-실행-지시와-b-예외-승인-기록). **Phase11 전체 IN_PROGRESS / 외부 출시 BLOCKED**는 유지한다. Phase13 착수0·clear0·commit/push/PR/운영배포/실공급자/과금/운영ja/외부전송/사용자파일삭제0. coordinator가 phase 종료 뒤 fresh session clear를 처리한다.

## 2. 구현과 리뷰 수정

| ID | 최종 구현 | 실제 근거 |
| --- | --- | --- |
| L01 | ko/en/ja 각13namespace/1080키, evidence41/review44 기반, 동일 key/placeholder 및 en 가용성 | i18n9, pack-counts.json, ja-source-map.json |
| L02 | 오류6경로/server publicfields/API client/account-store/일반 seed/demo fallback의 ja 지원 | unit/integration/HTTP E2E |
| L03 | local full WOFF2 Inter/NotoJP, 원본 T01 ja 크기·행간·medium400/semibold700·tight tracking0 및 en sm150%, 실제 Table/factor token·focus/print | CSS source trace·computed style·glyph·network-nonebuild |
| L04 | 업무 code/ISO/source 유지, 표시 라벨만 번역, 성명/org/search allowlist 정규화 | unit·i18n·CRUD/worker E2E |
| L05 | nullable 성명4컬럼/strict DTO, ja 필수 family/given·kana선택·결합100자 제한, profile/my-page/admin·배지/footer | unit8/integration5/Phase12 E2E7 |
| L06 | migration0009/빈DB/0008clone/replay/고정구코드 실제읽기쓰기, 비활성ja seed/ko-en-onlydemo/ko fallback | 최초migration증거+독립review+old-auth재시험/demo |
| A01 | koGoogle/Kakao/Naver·enGoogle·jaGoogle/LINE 모두 disabled 및사유, email flow 유지 | auth/Phase12 E2E |

M1의 원본 typography 누락과 dead density10토큰을 수정했고, M2의 T13 projects lg header/wrap·검색/제목 및 프로젝트상세·criteria·assets/session·monitoring·profile 확대 reflow를 이식했다. m1의 변경0 backend 파일은 “기존backend충족”으로 trace를 정정했다. m2 양쪽font preloadfalse+WOFF2, m3 base layer/낮은 specificity focus, m4 명시적sortOrder+heap재배치시험, m5 ko/en 표시name와 ja splitname 별도 보존·관리자 안내, m6 tmpfixture/ignore/PNG/중첩시험팩 정리, m7 最終版 용어와 verified hint, n1 양쪽필드 오류경로·client 제한, n2 LINE token/들여쓰기를 해결했다.

[Source trace](evidence/phase12/source-trace.md)는34/34 원본fullSHA와 이번22행(T01~18/T22/T27/T33/T34)의 실제 이식·기존충족·폐기를 구분한다. 나머지12행과 evidence 저장/snapshot/undo/audit/rationale 기능은 후속 Phase 대상이다.

## 3. 계약과 데이터 보존

`0009_natural_quicksilver.sql`은 users nullable text 성명4컬럼만 추가하며 backfill0·기존name/선호/게시/locale version 보존이다. 기존0000~0008 SQL/snapshot18파일과journal prefix 불변, web/worker 변경 전 migration 적용, down/drop0. 빈DB/0008 TEMPLATE clone/apply/replay/nullable 보존은 최초시험과 독립review로 확인했고 수정 후 retained upgradedDB에서 고정 b4749eb AuthService session/profile read-write/logout을 다시 통과했다.

`/api/me` strict DTO/PATCH는 enabled+deployed 명시locale만 받는다. ja 저장은 family/given 필수·kana선택·결합100자 제한과 name 동기화, 기존계정 언어변경만으로 접근/status 변경0. ko/en 표시name 변경 시 생략한 ja splitfields를 보존하는 권장안①을 적용하고 값이 다르면 관리자 안내를 표시한다. 추정분해/암묵삭제0. 선택필드 명시빈값은 null. 성명/org/search의 전각영숫자·공백만 정규화, kana만 반각composition; punctuation/호환문자/password/token/email/URL/free prompt는 보호한다.

일반 seed는 absent ja disabled/ltr/fallbackko/version1만 삽입하고 기존설정/version 유지다. 초기활성 ko/en만, demo 업무게시 ko/en만, ja 요청은 ko 원문 및 resolvedLocale/fallbackUsed로 표현한다. fixture ja 활성은 합성DB에서만 일시적이며 종료 시 claps_test/claps_demo 모두 disabled/version1로 복원했다. ja 문구는 coder 초안, reviewer key/placeholder 검수는 원어민/제품승인이 아니다.

## 4. 글꼴·접근성과 남은 비용

OFL/full variable wght100~900 source TTF를 유지하면서 served WOFF2로 무손실 압축했다. Inter876,576→350,336bytes, NotoJP9,589,900→4,350,780bytes, cmap/fvar 동일/subset0. en75 ASCII/ja560 non-ASCII 필요glyph 누락0. [font source/hash/license](evidence/phase12/fonts.json), [압축 증거](evidence/phase12/fixes/font-compression.json). 양쪽 preloadfalse로 ko 선로드0; full Noto4.35MB의 일본어 첫사용 비용은 남는다. 신규localefont는 network-none build 및 외부HTTPS 차단에서 local로 로드한다. 기존 Bookk 브랜드CDN은 유지하며 차단 시 fallback을 허용한다.

ko/en/ja 각640 CSS px(1280@200% 대응)와390px/root200%에서 프로젝트목록·상세/criteria/assets/monitoring/list/new를 실제 API 로딩 후 검사했고 profile-setup은390px/root200%로 검사했다. 총39페이지상태에 가로넘침 없음, ja 제목700/20px·확대40px, en input행간21px, ja label400/ko-en500, input 단일ring/outline-none, keyboard/print/hydration을 통과했다. [최종43 PNG](evidence/phase12/fixes/screenshot-manifest.json)는 PASS testInfo.outputPath 산출물을 명시복사한 것이다. ja criteria 및 my-page 확대 이미지를 직접 검수했다. synthetic @example.test 계정만 포함하며 traces/session자료는 공개증거에 복사하지 않았다.

## 5. 최종 검증 — 고유 시험 수

모든명령의 정확한prefix/실제실패/재시험은 [execution ledger](evidence/phase12/execution-ledger.md), [체크리스트](phase12-test-checklist.md), [수정기록](phase12-review-fixes.md)을 따른다. 아래 로그는 evidence/phase12/fixes 기준이다.

| 검사 | 최종 결과 | exit | 증거 |
| --- | --- | --- | --- |
| Unit | 51 PASS/0 FAIL/0 SKIP | 0 | unit-retest.log |
| Integration | 126 PASS/0 FAIL/0 SKIP | 0 | integration-isolated.log |
| i18n | 9 PASS/0 FAIL/0 SKIP | 0 | i18n-retest.log 및 i18n-release-final.log |
| Production 전체 E2E | 49 PASS/0 FAIL/0 SKIP | 0 | e2e-final-retest.log |
| 별도 Demo E2E | 1 PASS/0 FAIL/0 SKIP | 0 | demo-e2e-retest.log |
| lint/typegen/tsc | PASS, lint오류0/기존warnings2 | 0 | lint-final-retest.log/typecheck-profile-final.log |
| network-none 최종3팩 build | PASS | 0 | build-release-final.log |
| Migration empty/0008/replay | PASS(최초+독립review), oldcode재시험PASS | 0 | migration-check-first.log, fixes/old-auth-first.log |
| Demo 반복/선호·게시보존/ja fallback | PASS(최초verify+새UI시험) | 0 | demo-verify-retest.log/demo-e2e-retest.log |
| glyph/OFL/WOFF2 | PASS, ja560/en75 누락0·subset0 | 0 | font-final.log/font-compression.json |
| Immutable runtime 재시작2회/health/nativeimage | PASS, 의도SIGTERM143·segfault139재현0 | 0 | runtime-restarts-retest.log 및 runtime-3pack-final.log |
| refs/보호문서/옛migration/reviewer원본 | PASS | 0 | preservation-final-retest.log |
| 시험팩 위생/ja복원/보고 렌더 | PASS | 0 | cleanup-final.log/final-locale-state.log/report-validation.log |

자동 고유 합계 **236개 =51+126+9+49+1**, Phase12 새 framework20(unit8/integration5/E2E7), mandatory skip0/0개suite0. Script/static/manual/반복시험은 합산하지 않는다. 과거231개는 첫 구현 Task의 결과이며 현재결과로 재사용하지 않았다.

## 6. 실제 실패와 수정 경과

첫 구현 Task의 worker startup20초timeout·최초E2E45중6실패·dialogselector·admin성명표시누락·my-page clipping·demoDTOchecker·문서링크실패는 ledger에 보존한다. 이 수정 Task의 snapshot복사중i18n2실패, 같은DB integration/reflow/worker 간섭(122/4 및124/2), 실제ja projects54px overflow, fullE2E47/2, targetmail환경누락1/4, 잘못된pnpmengine·effectlint·probe/checkerassert 실패도 숨기지 않았다. copy완료/순차DB검증/reflow소비class/profile로딩잠금/지정worker fixture구간 SIGSTOP→finally SIGCONT/고정PATH·환경으로 최종 재시험했다.

초기 web session71326/PID1795379는 **실제 exit139**였다. yielded세션의 종료를 늦게확인하여 “미관측”으로 잘못 보고한 사실을 coordinator에 정정했다. 같은 WSL/Node경로에서 live standalone/native파일 copy후stop이 원인후보이나 core분석으로 확정하지 않았다. 이후 새불변release 경로+stop-before-copy로 실행절차를 교정하고 두 재시작·Sharp이미지변환과 전체E2E가 통과했다. 정상 종료143은 의도SIGTERM이며 실패139와 구분한다. [실패기록](evidence/phase12/fixes/runtime-failure.log), [runtime경로](evidence/phase12/fixes/runtime.json), [재현script](evidence/phase12/fixes/runtime-restarts.py). 원인미확정은 인계에 남기며 재발 시 조사할 수 있도록 환경을 보존한다.

## 7. 완료 게이트와 외부 보류

| 게이트 | 최종 상태 |
| --- | --- |
| 사용자 B 승인/담당·유효범위 기록 | PASS |
| L01~L06/A01·기술필수시험·문서/Ttrace | PASS |
| 독립 기존Claude review | 수행완료, 원본 CHANGES_REQUESTED 보존 |
| coder 11finding 수정·필수 재시험·인계 | PASS, 미해결Major0/Minor0/Nit0 |
| 독립 로컬 Phase12 기술 완료 | COMPLETED / plan EXECUTED |
| Phase11 전체·외부출시 | IN_PROGRESS / BLOCKED 유지 |
| 원어민/제품 ja 용어 | BLOCKED 외부, 사용자 지정언어담당 |
| 실OAuth/credential·운영ja활성화 | BLOCKED 외부, 별도권한/Phase17이후 |
| 실공급자/실과금/법무/운영RPO/RTO | BLOCKED 외부, Phase11 이월담당 |
| Phase13/clear | 미착수 / coordinator fresh세션 처리 |

## 8. 정리와 보호

parent/sandbox/기존production/수정release2곳의 생성 en-GB 각13파일을 새manifest와 대조한 뒤 자신의 생성물만 제거했다. 기존production의 nested messages/messages/en-GB도 이전manifest와 대조해 제거했고 전체5곳 nested en-GB0을 확인했다. 최종production source ko/en/ja3팩에 대해 network-nonebuild/i18n9 PASS. 자신의 web3199/demo3198 및 worker 종료(servers SIGTERM143/workers0), runtime3200 probe 종료, offlinecontainer stopped다. 마지막3팩build에서 새불변 `/tmp/claps-phase12-release-3pack`을 만들고 두health/nativeimage재시작시험 exit0으로 확인했다. isolated PostgreSQL55437/5개합성DB/volumes/privatefiles/snapshot은 재현용으로 보존했다. 기존 사용자3193/55436/55433 서비스는 유지한다.

보호11문서(Phase11/후속13~17계획/HANDOFF/규칙), refs7+HEAD, 옛migration18파일/journalprefix 및review원본sha일치. 사용자 untracked feat_plan 보존, package/lock변경0. [실제 변경 manifest](evidence/phase12/changed-files.txt)를 제공한다.

## 9. 다음 Phase 인계

[인계서](phase12-handoff.md)에 migration 적용순서·strictDTO/nullable/이름보존·3팩/namespace/error/code경계·원본Ttrace·고정Node/libs/image·sandbox 복사완료/DB순차검증/immutable release절차·실제실패·외부게이트를 넘겼다. Phase13은 coordinator가 Phase12 종료/clear 후 별도dispatch로 착수한다. 이번task는 Phase13을 구현하거나 새worker를 배정하지 않았다.
