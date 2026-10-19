# Phase12 reviewer 후 수정·검증 기록

2026-10-01, 기존 Codex coder / task_6d3f5187a91b / dispatch ctx_185632ce82bf. 독립 기존 Claude의 [review](phase12-review.md) CHANGES_REQUESTED Major2/Minor7/Nit2를 입력으로 사용하며 reviewer 문서는 수정하지 않는다. 사용자 B 독립 로컬 기술범위와 부모 feature/backend 고정 HEAD/refs를 유지한다. 최종 기술 gate PASS, Phase12 COMPLETED / plan EXECUTED; Phase13/clear/push/PR/운영/실공급자/과금/운영ja/외부전송0.

| Finding | 수정/결정·실제 위치 | 근거·시험/상태 |
| --- | --- | --- |
| M1 ja/en typography·dead tokens | app/globals.css에 원본 T01 ja text-xs~3xl/행간·medium400/semibold700·tracking-tight/tighter0·en sm150%를 이식. 기존 no-op .font-semibold600 제거, 미소비 density10토큰 제거. backend 소비Table pad/row·factor만 남기고 ja factor5.5rem 복원 | 원본fullSHA source trace·computed style reflow 시험, 결과 보고 정정; 전체49E2E PASS |
| M2 T13 확대 대응/페이지군 | projects/page-content header lg/flex-wrap·검색lg폭·제목truncate제거, custom dropdown focusring. project detail/criteria/session-list/monitoring/auth/profile에 제한된 폭·wrapping/모바일action reflow. ko baseline도 수정 | ko/en/ja:640 CSS px(1280@200%대응) 및390+200%, 프로젝트 목록/상세·criteria·assets(실제session)/monitoring/list/new·profile-setup sweep; 전체49E2E PASS |
| m1 trace 사실성 | T02/04/05/06/07/09는 실제backend충족+messages/소비token만 구분. 변경0 image-lightbox와 backendAPI/ISO/source mapping은 유지. 새T13reflow 실파일명 명시 | source-trace.md 원본34/fullSHA·Phase12 22행 대조 |
| m2 preload/font 비용 | layout Inter/Noto 모두 preload:false, local full WOFF2. Inter876576→350336B, Noto9589900→4350780B. source TTF/OFL 유지, subset0 | font-compression.json cmap/fvar원본동일·glyph검사·networknone build·3locale응답fontpreload0. full Noto4.35MB 최초ja로딩 위험은 인계 |
| m3 이중 focus | 외부layer 전역rule 제거, @layer base :where(:focus-visible) 낮은specificity. existingring/outline-none 우선, T13 요소별ring이식 | 3locale login email outline none + ring 있음, 키보드/hydration회귀 |
| m4 행순서시험 | tests/integration/phase12 registry orderBy(sortOrder); 먼저ko/ja heapUPDATE해 순서를흔든다 | integration 전체126 PASS(외부worker/E2E없는순차실행), integration-isolated.log |
| m5 이름 일관성 결정 | plan§7 권장안①: ko/en표시name와ja성명은별도보존값. admin RecordView에서값차이안내, 3팩splitNameNote추가. 추정분해/암묵삭제0 | integration 전용m5 ko/enrename→split보존→ja동기화, productionadmin안내시험 |
| m6 위생/사실 | oldfixture source코드를hash/git show대조후/tmp로이동, gitexclude/ESLint임시ignore제거. checker는tmp mkdtemp+dependency symlink 사용. Phase12 screenshots는testInfo.outputPath; 명시적최종copy만허용. standalone중첩enGB13 manifest일치후자신생성물만정리 | hygiene.log/old-auth-first.log. 이전cleanup은directpack위치만확인했고nested누락사실을정정 |
| m7 ja 용어 | review確定版→最終版, hint verifiedすべての規則を満たす. 용어표는아래, 원어민/제품승인외부 | 3팩key/placeholder parity 및 법적확정성문구검수, native승인으로판정하지않음 |
| n1 결합길이 | server100자오류familyName/givenName경로, normalizeInput 기반client validSplitName·안내키. UI org/성명filled101자save비활성 | unit추가n1/Phase12setupE2E. client/server동일allowlist정규화 |
| n2 스타일 | profile-setup 들여쓰기수정, LINE브랜드규정색--platform-line CSStoken 및사용처명시 | lint/typecheck/socialUI회귀 |

## 용어표·외부 인계

| 서버 의미/ko | ja coder 수정 초안 | 범위/승인 |
| --- | --- | --- |
| final/최종본 | 最終版 | evidence.kind.final*/cert와 review assetCount/noFinal/finalized 모두일치; code는final유지 |
| 검증규칙 모두충족 | すべての規則を満たす | review.hint.verified, placeholder변경0 |
| 표시name vs ja성명 | 表示名 / 日本語の姓・名 | 별도저장·언어전환보존안내, 원어민/제품용어검수외부 |

원어민승인·실OAuth·운영ja활성화·실공급자/과금·법무/운영RPO/RTO·출시는여전히BLOCKED외부이며Phase11전체IN_PROGRESS를유지한다.

## 실제 실행·최초 실패와 재시험

증거는 md/evidence/phase12/fixes. 새코드/문서수정은항상부모source main에서하고snapshot에복사했다. package/lockfile변경0, 기존private환경보존.

1. Pythonvenv최초실패(ensurepip없음, exit1) 후 시스템pip --target /tmp/claps-phase12-font-libs fonttools4.66.1/brotli1.2.0 성공. repo dependency변경0, fullWOFF2변환 및cmap/fvar일치.
2. 초기 snapshot복사완료전시험시작으로 unit은구버전50PASS, i18n은팩복사중2FAIL/7PASS(exit1). 복사완료후 unit51PASS/i18n9PASS(exit0). 미완료snapshot시험을최종PASS로사용하지않음.
3. 초기integration126PASS는동시reflow/worker시작전실행이었다. 이후같은DB의integration+reflow+externalworker겹침으로integration122PASS/4FAIL, reflowko/en2PASS/ja4221FAIL. externalworker가남은다음integration124PASS/2FAIL. ownexternalworker중지·E2E종료후순차integration126PASS(exit0). 제품결함으로숨기지않고harness간섭명시.
4. 독립reflow재시험ko/enPASS, ja projects390+200%에서54px넘침1FAIL. 원본ja글자크기이식후의실제reflow누락이며projects목록root에actionwrap소비class추가, 재build/재시험.
5. network-none build/typegen·구코드tmpfixture최초exit0. lint신규testInfo미사용warning1건제거후최종lint exit0(기존iconwarnings2는보존).

최종명령·exit·고유수·스크린샷복사·release3팩정리·MD/HTML검증을아래에기록했다. report/checklist/plan/handoff는같은최종사실을따른다.

6. coordinator대조후실제session71326/PID1795379 exit139확인. 미관측보고는yielded세션종료를미확인한오판으로정정했다. 같은WSL/node경로/command이며live standalone파일copy후stop이원인후보(미확정). immutable release경로/stop-before-copy로교정하고controlledrestart를검증한다. runtime-failure.log의실제exit139를실패집계에포함한다.


## 최종 해결·검증·완료 판정

7. 전체E2E 최초49개47PASS2FAIL(exit1): my-page 비동기accountDTO도착전입력경합과Phase9queued실패fixture가실제worker에선점됨. ProfileFields 로딩/저장중disabled·dialogcloseevent에서reset, E2E초기org값로드대기. Phase9는명시E2E_WORKER_PID의자신syntheticworker만fixture삽입구간SIGSTOP→finallySIGCONT, UPDATE rowCount1필수; 실제첫성공/재매칭은worker로실행한다. 추가barepnpm engine오류exit1→고정PATH/corepack, synchronouseffectsetAccount lint오류exit1→closeeventreset. targetmail환경누락1PASS4FAIL(exit1)도보존했고정확한prefix로전체재시험했다.
8. 최종unit51/integration126/i18n9/전체E2E49/demo1 모두0FAIL0SKIP/exit0, **고유236**. Phase12신규framework20(unit8/integration5/E2E7). lint0errors/기존2warnings,typegen/tsc/network-none3팩build exit0. 로그: unit-retest/integration-isolated/i18n-release-final/e2e-final-retest/demo-e2e-retest/lint-final-retest/typecheck-profile-final/build-release-final.log.
9. 두immutable runtime재시작/health/login/Sharpimage변환/stop PASS(exit0). 정상SIGTERM143을0/-15로만검사한최초probeassert exit1은수정하고runtime-restarts-retest.log에143허용근거기록. 마지막3팩build의새release-3pack에서도두cycle실행exit0(runtime-3pack-final.log). 초기실제139원인미확정은별도runtime-failure.log 및인계로유지한다.
10. parent/sandbox/oldproduction/releases2곳의자신en-GB13파일새manifest일치후정리+nested0,release3팩/i18n9/buildexit0. ownweb3199/demo3198 servers SIGTERM143/workers0;합성DBs/volumes/privatefiles보존. ja둘다disabled1/koen2. 보호11문서/review원본/refs7+HEAD/옛SQLsnapshot18+journalprefixPASS. 초기refsparser단일HEAD행오류exit1→별도검사PASS도기록.
11. 최종43PNG는PASS testInfo.outputPath에서명시복사,ja criteria/my-page확대직접검수. 3locale640CSSpx/390root200%의6업무페이지+profile390root200% 총39상태overflow없음. 보고MD/단일HTML/체크리스트/plan/sourceTtrace/인계는같은236/49/1080/fullWOFF2/실제실패/외부상태를따른다.

**11finding 해결, 미해결 Major0/Minor0/Nit0**. 독립review원본CHANGES_REQUESTED를보존하며새APPROVEDreview를만들지않았다. 이livefixdispatch의명시종료권한에따라기술필수PASS+독립review+coder수정/인계gate를충족하여**독립로컬Phase12 COMPLETED / plan EXECUTED**. Phase11전체IN_PROGRESS/외부BLOCKED유지,Phase13/clear미착수. 원어민/제품ja·실공급자/과금/OAuth/운영ja/법무/RPO/RTO는외부이월이다.
