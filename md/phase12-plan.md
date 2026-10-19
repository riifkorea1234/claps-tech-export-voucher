# Phase 12 상세 개발 플랜 — 통합 준비·locale/profile

## 1. 기본 정보

| 항목 | 값 |
| --- | --- |
| 번호/제목 | 12 / 통합 준비·locale/profile |
| 계획 상태 | **EXECUTED / Phase Round2 승인 계획 기술 실행 완료** |
| 실행 상태 | **COMPLETED — 독립 로컬 기술범위, 독립 review 후 11finding 수정·필수 검증·인계 완료** |
| 작성일 | 2026-10-01 |
| 예상 기간 | 7~11 작업일: 개발4~6 + ja 초안3~5, 1명 순차 추정; 원어민 승인/환경/리뷰 대기 제외 |
| 담당 | coder 기존 Codex(term_61cbdd33), reviewer 기존 Claude(독립 완료 검토), coordinator(term_797ef407) dispatch/인계 |
| source trace | [roadmap §6](feat_plan/phase-roadmap.md)의 해당 Phase 행;원본 full SHA는 branch-analysis T01~T34 |
| Git 단위 | stage1 PR=Phase12,integrate/feat-1-4 기준;포팅 trailer/drift/revert는 roadmap §5 |

## 2. 배경과 목표

통합 기준과 언어/프로필 계약을 고정하고 기존 backend 동작을 보존한 ko/en/ja 기반을 제공한다. 승인된 기능 범위만 실행 단위로 분할하며 [통합계획](feat_plan/integration-plan.md) 기술 기본값을 유지한다.

## 3. 입력 자료와 이전 Phase 인수인계

[전체계획](development-plan.md),[진행규칙](phase-development-process-rules.md),[승인 feat_plan](feat_plan/README.md),[통합계약](feat_plan/integration-plan.md),[커밋근거](feat_plan/branch-analysis.md),[로드맵](feat_plan/phase-roadmap.md),[이전 Phase11 plan](phase11-plan.md),[HANDOFF](../HANDOFF.md),[DB](../db/README.md),[실행서](../scripts/README.md)를 입력으로 삼는다.

[Phase11 계획](phase11-plan.md)·[체크리스트](phase11-test-checklist.md)·[결과 MD](phase11-result.md)·[결과 HTML](phase11-result.html)을 먼저 읽는다. Phase11 전체 IN_PROGRESS/출시 BLOCKED, 자동196 PASS는 기존 격리 범위이고 핵심 mock0·실공급자·RPO/RTO 완료 증거가 아니다.

착수 시 `phase11-test-checklist.md`/`phase11-result.md`/`phase11-result.html`의 상태·이월·완료 리뷰를 확인한다. 기본은 predecessor COMPLETED + 기술 필수 PASS + 인계 완료다. 계획 작성 시점에는 predecessor 미완료로 실행 BLOCKED였다. 현재는 §16의 사용자 명시 B 예외가 독립 로컬 기술범위에 적용된다. [roadmap §2.1의 A/B 결정안](feat_plan/phase-roadmap.md)을 권한 있는 사용자가 선택해야 하며 **현재 승인·유효범위는 §16의 기록을 따른다**. B가 명시 승인되면 해당 기술 범위의 COMPLETED·보고/완료 리뷰·인계를 후속 Phase 조건으로 사용하고 Phase11 전체 IN_PROGRESS/외부 BLOCKED는 별도로 유지한다. 계획 승인만으로 착수하지 않는다.

## 4. 현재 상태 조사

고정 backend `b4749eb851c6cfef28f207adfca5f3f1ee942f66`;#4 tip `84f6be15dc96882b6e9dee77010074d4a38c9b39`. refs/공통 기반/누적계보는 승인 README와 같다. 기존 분석을 재사용하며 실제 착수에 refs drift/status를 다시 확인한다.

backend b4749eb의 서버 언어/계정/API client와 ko/en 팩은 구현되어 있다. ja 전체 팩·성명4컬럼·evidence/review namespace·6곳 오류/seed 하드코딩 대응은 신규다. 이 문단은 계획 작성 시 조사다. 최종 구현·필수 시험 PASS/독립 review·수정·인계와 현재 상태는 §18 및 결과 보고서를 따른다. 외부 미준비 조건은 BLOCKED로 유지한다.

## 5. 구현 범위

T01~T18/**T22**/T27/T33~T34: refs/34행 확인,6곳 오류/seed 처리,3팩/evidence·review 기반,Inter/Noto Sans JP·locale 밀도/table·empty-state,footer 전환,필수배지·ISO/코드라벨·성명/정규화·소셜 UI. 기능 대응/검증 책임은 roadmap의34행 표와 일치하며 해당 이식/기존충족/폐기 판정을 바꾸지 않는다.

## 6. 제외 범위

공통 제외 범위는 [roadmap §4](feat_plan/phase-roadmap.md)와 승인 통합계획 §7을 따른다. 이 Phase의 기술 작업은 실제 공급자/OAuth 연결, 운영 배포/ja 활성화, 외부 전송, 서버 PDF/문서 ZIP, 영구 삭제를 포함하지 않는다. 기술 범위와 외부 게이트를 구분하며 현재 구현은 미착수다.

## 7. 결정·가정·질문

성명 nullable4컬럼, ja 명시 profile 저장 성/이름 필수·kana 선택·기존계정 언어전환 차단 없음;정규화 허용목록;next/font/local;ja absent seed enabled:false/fallback ko;activateInitialLocales ko/en 유지;OAuth 실제인증은 외부 자격증명 게이트. 상세 계약과 승인 이유·변경영향은 통합계획 §2~3/§7을 참조한다. 추가 기술 대안을 임의 선택해 범위를 확장하지 않는다.

ja 팩 초안은 착수 전 지정할 구현 담당자가 원본 ja 문구를 재사용하고 신규 backend/evidence/review 키는 ko/en 및 용어표를 기준으로 보조 도구를 활용해 작성한다. 제품 담당자가 용어·placeholder를 검토하고 reviewer는 키/변수 동등성을 확인한다. 개발4~6일과 초안3~5일을 분리하여 합계7~11일로 추정한다. 원어민 승인 검수는 별도 외부 게이트이며 아직 담당/일정 미확정이다.

착수 결정은 [roadmap §2.1](feat_plan/phase-roadmap.md)의 A(Phase11 완료 대기)/B(명시 승인된 독립 로컬 기술 범위)와 이유·기간/위험·연쇄·재개 위치를 따른다. 결정 전 실행 BLOCKED다. 담당/격리 환경을 지정하고 권한 있는 사용자 결정 기록을 확보한 뒤 해당 Phase §8부터 재개한다. 외부 활성화 승인은 통합계획 §7에 따라 별도로 인계한다.

### 2026-10-01 reviewer 수정 결정

원본 T01 ja text-xs~3xl/행간·medium400/semibold700·tracking0 및 en sm150% 토큰을 유지한다. dead density token은 제거하고 실제 backend Table/factor 소비 토큰만 남긴다. factor default90px는 backend 유지, ja5.5rem은 원본88px 복원이다. T13 projects header lg/wrap/focusring을 이식하고 ko/en/ja 페이지군640CSSpx(1280@200%대응) 및390px+200%를 실제 검증한다. ko 기존 넘침도 동일 reflow 수정 범위에 포함한다.

m5 권장 결정①: ko/en display name과 저장된 ja family/given/kana는 별도의 로케일 프로필 값이며, ko/en name 변경 시 기존 split을 보존한다. 기존 사용자의 성명을 추정 분해하거나 암묵적으로 삭제하지 않는다. 두 표시가 다른 관리자 상세에는 설명을 노출하고 ko/en 변경→ja 재저장 동기화 시험으로 보장한다. ja 결합100자 오류는 visible family/given 경로로 반환하고 client 안내/저장 조건도 적용한다.

폰트는 OFL 전체 TTF를 WOFF2로 변환하고 양쪽 preloadfalse로 on-demand 제공한다. cmap/fvar를 원본과 대조하고 subset은 미래 자유 입력 glyph 손실을 피하기 위해 이번에 적용하지 않는다. served Inter350336B/Noto4350780B, 원본 TTF/OFL은 출처 검증용 보존. 원어민/실공급자/OAuth/운영ja·외부출시 조건은 계속 분리한다.

## 8. 작업 분해와 실행 순서

아래 순서는 착수 게이트 충족 뒤 수행한다. 구현자는 파일/API/DB 작업과 해당테스트를 소유하고 reviewer는 계획/완료판정을 독립검토한다. coordinator가 의존성·dispatch/결정 기록을 관리한다.

1. 고정refs/기존 status·34행·착수 게이트·기준 회귀를 기록한다. plan 승인만으로 예외 승인됐다고 해석하지 않는다.
2. schema/strict profile DTO·users 성명 migration부터 빈 DB/0008 복제 DB 적용·기존값 보존·구코드 revert 호환 검증을 설계/실행한다(착수 후).
3. 3팩/namespace·6곳 하드코딩 처리·비활성ja seed를 같은 변경으로 만들고 L01/L02/L06을 검사한다.
4. 폰트·footer·코드라벨·배지·profile UI를 backend client에 연결하고 L03~L05/A01을 실행한다.

작업마다 포팅 SHA/T행·변경 파일·수용 시험·차이/이월을 기록한다. 체크리스트 실제시험→실패수정/재시험→같은사실의MD/HTML→reviewer완료게이트→다음 인계 순서를 생략하지 않는다.

## 9. 예상 파일/API/DB/화면 영향

변경: db/schema.ts·새 migration/meta, lib/server/auth/{policy,service}.ts·lib/account-store.ts·lib/contracts/errors.ts·lib/server/errors/http.ts·lib/api/client.ts·lib/server/{db,demo}/seed.ts·lib/i18n/core/provider·messages/ko,en,ja·app/layout/page·domain/profile-fields·layout/language-switcher·ui/table·domain/empty-state. 신규: ja 팩·app/fonts 및 field-requirement/social UI 필요 파일. 삭제 기본0, 원본 i18n/index.tsx 생성금지.

기존 /api/me profile DTO를 확장하고 strict 검증/성명 저장을 유지한다. 새 OAuth API 없음. users nullable4컬럼과 비활성 ja 행이 DB/seed 영향이며 조직 tenant 추가 없음. 인프라는 기존 단일host web/worker/PostgreSQL/private shared uploads를 유지한다. migration은 새 SQL/meta/journal,빈 DB·0008복제/선행 Phase schema·재실행·구코드호환 검증;down/cascade물리삭제 금지. 운영seed/기존선호·게시본 보호는 공통규칙이다.

## 10. 테스트 계획

필수 feature ID: **L01/L02/L03/L04/L05/L06/A01**. 의미는 통합계획 §5와 이 plan §11을 따른다. 단위·통합(권한/원자성/멱등)·production E2E·수동 UI 검증을 Phase 고유 항목에 적용한다. L01의 세 팩 동등성과 en 유지가 공통 필수다. 외부 공급자/원어민 승인 결과는 기술 시험 PASS와 구분한다.

환경은 [roadmap §4](feat_plan/phase-roadmap.md)의 Node22.22.0/pnpm10.34.5/Next16.3.3·전용 claps_test·sandbox 메일·private shared uploads·Chromium이다. APP_ORIGIN과 E2E_BASE_URL을 맞추고 web/worker에 같은 DB/파일을 주입한다. 아래 명령은 승인 계획의 재현 안내다. 실제 실행 환경·명령·exit·실패/재시험은 [체크리스트](phase12-test-checklist.md)와 [execution ledger](evidence/phase12/execution-ledger.md)를 따른다.

```bash
set -e
cd /mnt/f/claps-product
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test:unit
corepack pnpm test:i18n
corepack pnpm test:db:up
# DATABASE_URL도 아래 전용 DB로 주입한 격리환경에서 적용(운영DB금지)
DATABASE_URL=postgresql://claps_test:claps_test_local_only@127.0.0.1:55433/claps_test corepack pnpm db:migrate
DATABASE_URL=postgresql://claps_test:claps_test_local_only@127.0.0.1:55433/claps_test corepack pnpm db:seed
TEST_DATABASE_URL=postgresql://claps_test:claps_test_local_only@127.0.0.1:55433/claps_test corepack pnpm test:integration
# 기존 en-GB가 있거나 생성 실패 시 절차 중단; 이번 격리 checkout에서만 실행
node scripts/phase11-locale.mjs
PHASE12_PACK_MANIFEST=$(mktemp /tmp/claps-p12-pack-XXXXXX.sha256)
sha256sum messages/en-GB/*.json > "$PHASE12_PACK_MANIFEST"
corepack pnpm build
# 별도세션에서 위 DB/APP_ORIGIN/sandbox/shared uploads를 주입한 production web+worker 준비
TEST_DATABASE_URL=postgresql://claps_test:claps_test_local_only@127.0.0.1:55433/claps_test E2E_BASE_URL=http://127.0.0.1:3000 E2E_MAIL_DIR=/tmp/claps-phase12-mail corepack pnpm test:e2e
corepack pnpm worker:health
```

전체 E2E의 시험팩/worker 경쟁 방지와 합성 자료 정리는 [roadmap §4](feat_plan/phase-roadmap.md)를 따른다. 기존 테스트 PASS로 이번 Phase를 대신하지 않는다. 구현 전 설치 Next docs의 해당 server/client·route handler·typegen·testing·fonts 가이드를 확인한다.

### en-GB 정리 및 별도 demo 회귀 (후속 실행용)

생성기는 en의 모든 JSON을 복사하므로 evidence/review namespace와 호환된다. 생성 성공 후 만든 manifest는 이번 생성물의 소유 증거다. 전체 E2E가 끝나고 시험 서비스를 정지한 뒤 **checksum이 그대로인 자신의 파일만** 제거한다. 검사 실패/추가 사용자 파일이 있으면 정리를 중단하고 기존/수정 파일은 보존한다. 이 정리는 ja 운영 팩을 제거하지 않는다.

```bash
if sha256sum --check "$PHASE12_PACK_MANIFEST" && test "$(rg --files messages/en-GB | wc -l)" -eq "$(wc -l < "$PHASE12_PACK_MANIFEST")"; then
  while read -r pack_checksum pack_file; do
    rm -- "$pack_file"
  done < "$PHASE12_PACK_MANIFEST"
  if rmdir messages/en-GB; then
    rm -- "$PHASE12_PACK_MANIFEST"
  fi
fi
```

L06 demo는 **일반 claps_test E2E와 분리**한다. 전용 `.env.seed.local`(0600, 합성 계정만)에 claps_demo DATABASE_URL/POSTGRES_DB·APP_ORIGIN·shared private UPLOADS_DIR·sandbox/DEMO_EMAIL/DEMO_PASSWORD를 준비한다(실제 secret은 문서에 쓰지 않음). demo web/worker도 그 환경으로 별도 시작하고 파일 시드는 공유 uploads를 가진 worker/동일 환경 host CLI에서 실행한다. 환경 불일치/실패 시 중단하며 원래 E2E 환경을 덮어쓰지 않도록 별도 셸을 사용한다.

```bash
set -e
# 별도 demo 셸, 지정한 비공개 합성 환경 파일만 읽고 값을 출력하지 않음
set -a
. ./.env.seed.local
set +a
test "$POSTGRES_DB" = claps_demo
corepack pnpm db:seed:demo
DEMO_BASE_URL="$APP_ORIGIN" corepack pnpm test:demo
```

시드 재실행의 기존 데이터 보존과 ko/en 게시본·ja 업무 콘텐츠의 ko fallback을 검사한다. 종료 후 합성 fixture/메일/세션과 이번 시험 서비스를 정리하고 manifest/증거만 민감정보를 제거해 보관한다. 운영 팩은 en-GB 없는 이미지로 다시 build하며 demo 인증 trace를 공개하지 않는다.

## 11. 완료 조건

- users 성명 migration은 빈 DB와 0008 복제 DB에서 적용·재실행·기존 값 보존·구 코드 호환을 통과한다. 이름 추정 backfill은 0건이다.
- ko/en/ja 키·변수 누락 0건, en 선택 유지, 오류/seed 6곳과 profile·정규화 회귀를 통과한다.
- footer/글꼴·필수 배지·코드 라벨·390px/200%·키보드 검증을 통과한다. **T22**는 inline locale script 미도입·hydration 경고 0으로 기존 충족을 확인한다.
- L01~L06/A01의 기술 시험과 demo/시험 locale 회귀를 통과한다. 미설정 OAuth와 운영 ja 활성화는 0건이다. 원어민 승인 결과는 외부 게이트이며 초안·검수 요청자료를 인계한다.

공통 정량/보고 게이트는 [roadmap §3](feat_plan/phase-roadmap.md)을 적용한다. **승인된 기술 범위**의 필수 FAIL/BLOCKED/PENDING/skip 또는 테스트 0개 통과는 허용하지 않는다. 실제 체크리스트·동일 MD/HTML·완료 리뷰·인계를 갖춘 경우만 해당 범위 COMPLETED로 판정한다. 계획 시점에는 미실행이었으며 최종 실행은 §18을 따른다.

## 12. 위험과 대응

팩 불일치가 en까지 비가용하게 만들거나 성명/정규화·glyph가 퇴행할 수 있다. 세 팩 동시 변경, 기존 계정·폐쇄망 build·glyph/print 회귀로 차단한다. ja 초안 품질과 원어민 승인 지연은 분리해 보고한다. 공통 착수/범위 변경 통제는 [roadmap §2~3](feat_plan/phase-roadmap.md)을 따른다.

## 13. rollback/복구

ja를 비활성으로 유지하고 profile/UI 신규 write를 제한한다. nullable 성명 컬럼이 남은 구 코드의 profile 읽기/쓰기 호환을 확인한 뒤 stage1 PR을 revert한다. 공통 PR revert·DB down 금지·같은 정지점 DB+uploads 백업/빈 환경 복구는 [roadmap §5](feat_plan/phase-roadmap.md)을 따른다.

## 14. 결과 증거와 다음 Phase 인수인계

미래 산출물은 `md/phase12-test-checklist.md`(구현 후 시험 전),`md/phase12-result.md`/`md/phase12-result.html`(실제 시험 후),`md/evidence/phase12/`다. 명령/exit code·고유 시험 수·최초 실패/재시험·Phase별 고유 증거를 남긴다. 개인정보 제거·동일 MD/단일 HTML·완료 리뷰 규칙은 [roadmap §3](feat_plan/phase-roadmap.md)을 따른다. coder 실행 결과로 체크리스트·결과 MD/단일 HTML·증거·별도 인계서를 생성했으며 독립 reviewer 검토 대기다.

완전한3팩/namespace·비활성ja 행·성명 migration/호환증거·source→locale라벨 표·이식 T행/trailer·외부조건 목록을 Phase13에 넘긴다. 후속착수에는이plan과미래체크리스트/MD/HTML/완료review를전달하고미해결 차단을감추지않는다.

## 15. 변경 이력

| 날짜 | 변경 | 근거/상태 |
| --- | --- | --- |
| 2026-10-01 | 승인통합 stage1를Phase12 실행계획으로분할 | 사용자후속요청·규칙§6.2/§13;DRAFT/reviewer계획검토전,구현/시험미실행·predecessor gate BLOCKED |
| 2026-10-01 | Phase 리뷰 Round1 PM1/PM2·Minor6 반영 | REVISED / 재검토 대기; 실행 BLOCKED·착수 결정 미승인, 기술 범위/외부 게이트 분리 |
| 2026-10-01 | [Phase Round2 계획 승인 반영](feat_plan/phase-review-round-2.md) | APPROVED·Major 0; 계획 승인은 착수 승인 아님, 실행 BLOCKED·예외 현재 미승인 유지 |

## 16. 2026-10-01 사용자 실행 지시와 B 예외 승인 기록

승인자: 현재 권한 있는 사용자(실명 미제공). 근거: live Phase12 구현 dispatch의 “사용자 실행요청+질문 권장안 위임으로 roadmap §2.1 B 권장안을 이번 Phase12~17 작업기간 독립 로컬 기술범위 예외로 적용” 지시. 이 기록은 앞 절의 계획 작성 시점 “현재 예외 승인 없음/미착수”를 대체한다. 선택 B, 유효 기간 2026-10-01~Phase17 기술 인계; 범위/ref/권한 변경 시 재확인한다.

허용 범위: Phase12~17의 독립 로컬 기술 작업을 coder 구현→기존 Claude reviewer 독립 검토→coder 수정→phase 종료로 순차 수행. **현재 dispatch는 Phase12만** 소유하며 Phase13 착수는 금지한다. 담당은 지정된 coder Codex, reviewer Claude, coordinator는 보고/dispatch 전용이다. 승인 공유: 현재 plan과 이 승인 기록을 coordinator에게 전달한 뒤 §8 순서로 구현한다.

로컬 변경 대상은 사용자 지정 부모 `/mnt/f/claps-product`의 `feature/backend` checkout이다. integrate/stage 브랜치·commit·push·PR·최종 통합·운영 배포·실공급자·과금·운영 ja 활성화·외부 전송·영구삭제 권한은 포함되지 않는다. 사용자 untracked 계획/다른 변경을 보존한다. ja 초안은 coder가 작성, 키/placeholder는 독립 reviewer가 검수, 원어민/제품 용어 승인은 외부 게이트로 인계한다.

Phase11 전체 IN_PROGRESS와 외부 출시 BLOCKED를 유지한다. 기술 필수 시험+동일 MD/HTML+독립 완료 리뷰+coder 수정/인계를 충족해야 해당 기술범위 COMPLETED로 판정하며, 최초 구현 coder task는 REVIEW_READY / IN_PROGRESS까지였다. 새 reviewer 후 수정 dispatch는 모든 필수PASS/미해결Major0/독립review+수정+인계 충족 시 기술COMPLETED 판정 권한을 명시했다(§18). Task 중 clear하지 않으며 phase 종료 뒤 coordinator가 fresh session에서 처리한다.

초기 조사: HEAD b4749eb와 승인 6개 origin ref 일치, drift 0. 기존 사용자 untracked는 feat_plan 및 phase12~17 plan뿐이다. Node22.22.0/pnpm10.34.5/Next16.3.3 설치 확인. AGENTS와 설치 Next server/client, route handler, font, Vitest/Playwright, TypeScript/typegen 가이드 확인 후 코드 작성한다. DB는 격리 claps_test, demo는 별도 합성 claps_demo를 사용하며 실제 시험 실패/재실행을 evidence에 남긴다.

검증 준비 중 기존 lint가 `md/evidence/admin-fixes/verify-a11y.cjs`의 역사적 CommonJS probe 5건을 production TS 규칙으로 검사하여 실패했다. 증거 파일은 보존하고 ESLint globalIgnores에 역사적 evidence만 제외한다. 구코드 fixture는 수정 Task에서 /tmp mkdtemp로 이동했고 임시ignore/exclude를 제거했다. 앱/서비스/계약/신규 테스트는 기존 lint 규칙을 유지한다. Noto Sans JP의 full source TTF9,589,900bytes를 유지하고 served fullWOFF2는4,350,780bytes다. Inter/Noto 모두preloadfalse/subset0이다.

## 17. 최초 coder 실행 결과와 독립 검토 인계 — 당시 이력

2026-10-01 L01~L06/A01 구현·기술 필수 검증 완료. Unit50+integration125+i18n9+productionE2E46+별도demo1=고유231 PASS, 필수skip0/0개suite0. 최초 실패·재시험·스크린샷 직접 검수/확대 보완·구코드 호환·network-none build·생성 en-GB 안전정리를 기록했다. 기술 상태 REVIEW_READY / 전체 IN_PROGRESS, 당시 독립 기존Claude reviewer 및 후속coder수정/인계 PENDING이었으며 현재 완료는 §18을 따른다. [결과MD](phase12-result.md)·[단일HTML](phase12-result.html)·[체크리스트](phase12-test-checklist.md)·[인계](phase12-handoff.md)·[Ttrace](evidence/phase12/source-trace.md)를 coordinator에게 공유한다. Phase11/외부 게이트·후속계획은 변경하지 않았으며 Phase13 착수0/Task중clear0이다.


## 18. 독립 review 후 수정·필수 검증·최종 기술 종료

2026-10-01 새 live task_6d3f5187a91b/dispatch ctx_185632ce82bf는 기존Claude [독립review](phase12-review.md) CHANGES_REQUESTED(Major2/Minor7/Nit2) 이후 모든finding수정·검증·종료를명시했다. [수정별 근거](phase12-review-fixes.md)로11finding해결·미해결Major0/Minor0/Nit0. reviewer원본sha불변/새APPROVED조작0. M1T01typography와M2T13reflow를실제소비파일에이식, fullWOFF2/양fontpreload0/focuslayer/명시DBsort/표시name vs ja splitname별도보존안내/위생/用語/n1길이/n2LINE token을수정했다.

최종 unit51+integration126+i18n9+productionE2E49+demo1=고유**236 PASS/0FAIL/0SKIP**, Phase12새framework20. lint/typegen/tsc/networknone3팩build/oldAuth/glyph560/immutable runtime재시작2회/refs·보호자료·리뷰원본/정리/동일MDHTML PASS. 실제exit139와동시DB시험간섭·reflow54px·E2E47/2 등실패및재시험은ledger에보존,런타임원인미확정은인계한다. 새불변release/고정Node/libs/순차DB검증이기술재현기준이다.

승인B기술필수+독립review+coder수정/문서/인계gate를충족하여 **Phase12 독립 로컬 기술범위 COMPLETED / plan EXECUTED**. [결과MD](phase12-result.md)/[동일HTML](phase12-result.html)/[체크리스트](phase12-test-checklist.md)/[인계](phase12-handoff.md)/[Ttrace](evidence/phase12/source-trace.md)를coordinator에공유한다. Phase11전체IN_PROGRESS/외부출시BLOCKED/원어민·제품ja·실공급자/과금/법무/RPO/RTO/OAuth/운영ja외부유지. Phase13未착수·clear0,coordinator가종료후fresh세션/다음dispatch를처리한다.
