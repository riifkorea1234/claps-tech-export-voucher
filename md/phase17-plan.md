# Phase 17 상세 개발 플랜 — 전체 회귀·백업/복구·ja 활성화 조건

## 1. 기본 정보

| 항목 | 값 |
| --- | --- |
| 번호/제목 | 17 / 전체 회귀·백업/복구·ja 활성화 조건 |
| 계획 상태 | **APPROVED / Phase Round2 계획 승인** |
| 실행 상태 | **REVIEW_READY / IN_PROGRESS — 기술필수 PASS·독립 review 대기** |
| 작성일 | 2026-10-01 |
| 예상 기간 | 3~5 작업일,1명 순차 구현 최초 추정·검토/환경/외부 승인 대기 제외 |
| 담당 | planner 계획,구현 담당 미배정,reviewer 독립 리뷰,coordinator 승인/인계 |
| source trace | [roadmap §6](feat_plan/phase-roadmap.md)의 해당 Phase 행;원본 full SHA는 branch-analysis T01~T34 |
| Git 단위 | stage6 PR=Phase17,integrate/feat-1-4 기준;포팅 trailer/drift/revert는 roadmap §5 |

## 2. 배경과 목표

전체 34커밋 기능의 통합 회귀와 신규 증빙/snapshot 복구를 검증하고 운영 활성화 조건을 사실대로 인계한다. 승인된 기능 범위만 실행 단위로 분할하며 [통합계획](feat_plan/integration-plan.md) 기술 기본값을 유지한다.

## 3. 입력 자료와 이전 Phase 인수인계

[전체계획](development-plan.md),[진행규칙](phase-development-process-rules.md),[승인 feat_plan](feat_plan/README.md),[통합계약](feat_plan/integration-plan.md),[커밋근거](feat_plan/branch-analysis.md),[로드맵](feat_plan/phase-roadmap.md),[이전 Phase16 plan](phase16-plan.md),[HANDOFF](../HANDOFF.md),[DB](../db/README.md),[실행서](../scripts/README.md)를 입력으로 삼는다.

Phase16의 승인된 기술 범위 COMPLETED/필수 PASS 및 Phase12~15 체크리스트·MD/HTML·API/schema/파일/포팅 인계가 선행이다. 현재 그 결과가 없어 실행 BLOCKED다. **Phase11 공급자·출시 보류는 외부 게이트로 인계하며 Phase17 기술 완료의 선행조건이 아니다.**

착수 시 `phase16-test-checklist.md`/`phase16-result.md`/`phase16-result.html`의 상태·이월·완료 리뷰를 확인한다. 기본은 predecessor COMPLETED + 기술 필수 PASS + 인계 완료다. 현재 predecessor가 미완료여서 실행 BLOCKED다. [roadmap §2.1의 A/B 결정안](feat_plan/phase-roadmap.md)을 권한 있는 사용자가 선택해야 하며 **현재 실제 예외 승인은 없다**. B가 명시 승인되면 해당 기술 범위의 COMPLETED·보고/완료 리뷰·인계를 후속 Phase 조건으로 사용하고 Phase11 전체 IN_PROGRESS/외부 BLOCKED는 별도로 유지한다. 계획 승인만으로 착수하지 않는다.

## 4. 현재 상태 조사

고정 backend `b4749eb851c6cfef28f207adfca5f3f1ee942f66`;#4 tip `84f6be15dc96882b6e9dee77010074d4a38c9b39`. refs/공통 기반/누적계보는 승인 README와 같다. 기존 분석을 재사용하며 실제 착수에 refs drift/status를 다시 확인한다.

기존Phase11 백업도구/시험팩/로컬회귀증거는있지만신규증빙·feedback·snapshot의복구와ja검수/활성증거는없다. 이번 문서는 새 구현이나 시험 성공을 기록하지 않는다. 현재 관련 테스트는 **PENDING/미실행**,외부 미준비 조건은 BLOCKED다.

## 5. 구현 범위

전체 T01~T34·L/E/M/R/A 기술 회귀, 비빈 DB+uploads의 같은 시점 백업/빈 환경 복구, 이전 이미지 호환, 격리 관리자 ja 활성/비활성 smoke, 원어민 검수 요청자료 준비가 범위다. 운영 활성화와 실제 승인 결과는 별도 외부 게이트다. 기능 대응/검증 책임은 roadmap의34행 표와 일치하며 해당 이식/기존충족/폐기 판정을 바꾸지 않는다.

## 6. 제외 범위

공통 제외 범위는 [roadmap §4](feat_plan/phase-roadmap.md)와 승인 통합계획 §7을 따른다. 이 Phase의 기술 작업은 실제 공급자/OAuth 연결, 운영 배포/ja 활성화, 외부 전송, 서버 PDF/문서 ZIP, 영구 삭제를 포함하지 않는다. 기술 범위와 외부 게이트를 구분하며 현재 구현은 미착수다.

## 7. 결정·가정·질문

[승인 통합계획 §7](feat_plan/integration-plan.md)에 따라 기술 필수와 외부 활성화 게이트를 분리한다. 기술 필수는 §11의 5항목이며 원어민 **요청자료 준비**와 **격리 DB**의 관리자 ja 활성/비활성만 포함한다. 운영 ja, 원어민 승인 결과, 운영 RPO/RTO, 실제 공급자/OAuth/법무는 아래 소유자에게 인계한다. 기존 외부 필수를 N/A로 바꾸는 것이 아니라 원래 승인된 기술 범위 밖의 게이트로 보고한다.

| 외부 게이트 | 소유자(착수 전 실명 지정) | 충족 조건 | 현재 상태/재개 절차 |
| --- | --- | --- | --- |
| 원어민·제품 승인 | 일본어 검수 담당/제품 책임자 | ja UI/메일/오류/인쇄·성명 표기 검수 승인 기록 | 대기; §11 요청자료를 전달하고 지적 수정/재검수 |
| 운영 ja 활성화·배포 | 사용자/운영 책임자, coordinator | 기술 완료/리뷰 + 원어민 승인 + 실제 대상/활성화 권한 | BLOCKED; 별도 권한 기록 후 관리자 추가인증/version/감사로 적용·smoke |
| 운영 RPO/RTO·보관 | 운영/보안 책임자 | 목표 수치·호스트·백업 별도 보관·복구 기준 합의 | BLOCKED; 로컬 실측/manifest를 전달해 운영 시험 범위를 별도 승인 |
| 실제 공급자/품질·비용 | 제품/공급자 계약 책임자 | PDF/생성/검증/검색 계약·평가/비용/원본 전달 조건 | BLOCKED; 기존 Phase7/8/10/11 이월을 해소할 별도 실연동 범위 승인 |
| OAuth 실인증 | 인증/운영 책임자 | credential/callback/계정 연결 정책·실연동 시험 | BLOCKED; 비활성 UI 유지 후 해당 공급자별 승인/회귀 |
| 법무·보존/영구삭제·효력 | 법무/개인정보 책임자 | 보존/삭제·증빙/제출 문구·전달 정책 승인 | BLOCKED; 최소 기록/soft delete 유지하고 변경안 검토 |

외부 결과는 기술 결과와 별도 표로 계속 BLOCKED/대기 인계한다. 원어민 미승인이나 운영 목표 미정만으로 기술 완료를 미완료로 만들지 않는다. 현재 실행 착수 예외와 최종 통합/운영 권한은 여전히 없다. 상세 계약과 승인 이유·변경영향은 통합계획 §2~3/§7을 참조한다. 추가 기술 대안을 임의 선택해 범위를 확장하지 않는다.

착수 결정은 [roadmap §2.1](feat_plan/phase-roadmap.md)의 A(Phase11 완료 대기)/B(명시 승인된 독립 로컬 기술 범위)와 이유·기간/위험·연쇄·재개 위치를 따른다. 결정 전 실행 BLOCKED다. 담당/격리 환경을 지정하고 권한 있는 사용자 결정 기록을 확보한 뒤 해당 Phase §8부터 재개한다. 외부 활성화 승인은 통합계획 §7에 따라 별도로 인계한다.

## 8. 작업 분해와 실행 순서

아래 순서는 착수 게이트 충족 뒤 수행한다. 구현자는 파일/API/DB 작업과 해당테스트를 소유하고 reviewer는 계획/완료판정을 독립검토한다. coordinator가 의존성·dispatch/결정 기록을 관리한다.

1. 전체인계·34행/trailer·필수미완료/refs를감사한다.
2. 격리production이미지·en-GB시험팩으로전체자동/E2E·별도demo/ja콘텐츠fallback·a11y/인쇄회귀를수행한다.
3. 원장/체크/snapshot과비어있지않은프로젝트/세션표본으로DB+fileschecksum백업/복구·구이미지호환을검증한다.
4. 격리 DB의 관리자 ja 활성/비활성·감사 smoke를 수행하고 원어민 검수 요청자료를 준비한다. 기술 결과와 §7의 외부 대기 상태를 분리하여 인계한다.

작업마다 포팅 SHA/T행·변경 파일·수용 시험·차이/이월을 기록한다. 체크리스트 실제시험→실패수정/재시험→같은사실의MD/HTML→reviewer완료게이트→다음 인계 순서를 생략하지 않는다.

## 9. 예상 파일/API/DB/화면 영향

변경후보완예상:tests와scripts/phase11-locale.mjs의신규namespace호환·복구fixture·문서.주요산출:phase17-test-checklist.md·result.md/html·evidence/phase17.기존승인계획/Phase0~11원문변경은기본제외이며필요한실행서변경은후속범위리뷰.새제품/DB테이블/API없음.

새 제품 API/schema/seed는 없다. 격리 DB에서 기존 관리자 locale/version·추가인증·감사로 ja 활성/비활성을 검증하고 시험팩·복구 checksum·이미지 digest를 기록한다. 운영 ja 적용은 §7의 별도 승인 대상이다.기존약관/공급자/운영정책미정을임의확정하지않음. 인프라는 기존 단일host web/worker/PostgreSQL/private shared uploads를 유지한다. **새 migration 해당 없음**: 이 Phase는 새 테이블/컬럼을 만들지 않고 선행 schema를 소비한다. 기존 migration 적용·구 코드 호환 회귀는 수행하되 새 SQL/meta/journal 생성은 하지 않는다. 운영seed/기존선호·게시본 보호는 공통규칙이다.

## 10. 테스트 계획

필수 feature ID: **L01/L02/L03/L04/L05/L06/E01/E02/M01/M02/R01/R02/A01**. 의미는 통합계획 §5와 이 plan §11을 따른다. 단위·통합(권한/원자성/멱등)·production E2E·수동 UI 검증을 Phase 고유 항목에 적용한다. L01의 세 팩 동등성과 en 유지가 공통 필수다. 외부 공급자/원어민 승인 결과는 기술 시험 PASS와 구분한다.

환경은 [roadmap §4](feat_plan/phase-roadmap.md)의 Node22.22.0/pnpm10.34.5/Next16.3.3·전용 claps_test·sandbox 메일·private shared uploads·Chromium이다. APP_ORIGIN과 E2E_BASE_URL을 맞추고 web/worker에 같은 DB/파일을 주입한다. 아래 명령은 **후속 실행용이며 지금 모두 미실행**이다.

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
PHASE17_PACK_MANIFEST=$(mktemp /tmp/claps-p17-pack-XXXXXX.sha256)
sha256sum messages/en-GB/*.json > "$PHASE17_PACK_MANIFEST"
corepack pnpm build
# 별도세션에서 위 DB/APP_ORIGIN/sandbox/shared uploads를 주입한 production web+worker 준비
TEST_DATABASE_URL=postgresql://claps_test:claps_test_local_only@127.0.0.1:55433/claps_test E2E_BASE_URL=http://127.0.0.1:3000 E2E_MAIL_DIR=/tmp/claps-phase17-mail corepack pnpm test:e2e
corepack pnpm worker:health
```

전체 E2E의 시험팩/worker 경쟁 방지와 합성 자료 정리는 [roadmap §4](feat_plan/phase-roadmap.md)를 따른다. 기존 테스트 PASS로 이번 Phase를 대신하지 않는다. 구현 전 설치 Next docs의 해당 server/client·route handler·typegen·testing·fonts 가이드를 확인한다.

복구 검증 명령은 아래 **후속 격리 실행용**이다. 각 변수는 담당자가 준비한 합성 Compose 프로젝트·비공개 환경 파일·새 백업 디렉터리이며 실제 운영 대상으로 치환하지 않는다. 백업 전 모든 writer를 중지하고 restore는 신규 빈 DB/빈 uploads에만 수행한다. restore 전에 migration/seed를 실행하지 않는다.

```bash
python3 scripts/backup-restore.py backup --project "$PHASE17_SOURCE_PROJECT" --env-file "$PHASE17_SOURCE_ENV" --directory "$PHASE17_BACKUP_DIR"
python3 scripts/backup-restore.py restore --project "$PHASE17_RECOVERY_PROJECT" --env-file "$PHASE17_RECOVERY_ENV" --directory "$PHASE17_BACKUP_DIR"
python3 scripts/health-load.py --origin "$PHASE17_SMOKE_ORIGIN"
```

복구 후 동일 버전 migration/seed 멱등성·web/worker health·원장/체크/snapshot/비어있지 않은 프로젝트와 세션·파일 checksum을 대조한다. readiness 관측은 공급자 처리량/SLA/RPO/RTO 합격값이 아니다. 이전 image digest 미확보는 구 코드 호환 기술 시험 BLOCKED다. 실제 운영 승인/RPO/RTO 미정은 §7 외부 표에 기록하고 기술 필수에 섞지 않는다.

### en-GB 정리 및 별도 demo 회귀 (후속 실행용)

생성기는 en의 모든 JSON을 복사하므로 evidence/review namespace와 호환된다. 생성 성공 후 만든 manifest는 이번 생성물의 소유 증거다. 전체 E2E가 끝나고 시험 서비스를 정지한 뒤 **checksum이 그대로인 자신의 파일만** 제거한다. 검사 실패/추가 사용자 파일이 있으면 정리를 중단하고 기존/수정 파일은 보존한다. 이 정리는 ja 운영 팩을 제거하지 않는다.

```bash
if sha256sum --check "$PHASE17_PACK_MANIFEST" && test "$(rg --files messages/en-GB | wc -l)" -eq "$(wc -l < "$PHASE17_PACK_MANIFEST")"; then
  while read -r pack_checksum pack_file; do
    rm -- "$pack_file"
  done < "$PHASE17_PACK_MANIFEST"
  if rmdir messages/en-GB; then
    rm -- "$PHASE17_PACK_MANIFEST"
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

**기술 필수 항목 (사용자의 독립 기술 범위 승인 후 적용):**

1. T01~T34 **34/34**와 L01~L06/E01~E02/M01~M02/R01~R02/A01 기술 회귀가 실제 PASS이며 누락은 0건이다.
2. 비어 있지 않은 프로젝트/세션·evidence/feedback/check/snapshot 표본으로 DB+파일을 복구하고 행/파일 checksum 불일치는 0건이다.
3. 이전 이미지 digest를 확보하고 추가 schema와의 구 코드 호환·파일팩 fallback을 실제 검증한다. 이미지가 없으면 이 기술 필수는 BLOCKED다.
4. 격리 DB의 관리자 추가인증/version/감사와 ja 활성·비활성·fallback smoke를 통과한다. 운영 DB 활성화는 수행하지 않는다.
5. 원어민 검수 **요청자료 준비**를 완료한다: 전체 ja 키/용어표, placeholder 대응, 화면/오류/메일/인쇄 표본, 성명 표기 질문, 검수 담당/요청 경로. 원어민 승인 결과 자체는 기술 필수가 아니다.

운영 ja 승인·원어민 승인 결과·운영 RPO/RTO·실제 공급자/OAuth/법무는 §7의 외부 표에서 BLOCKED/대기로 보고한다. 이 외부 상태는 승인된 Phase17 기술 완료를 막는 선행조건이 아니며 Phase11의 기존 외부 필수를 N/A/PASS로 변경하지 않는다. 최종 feature/backend PR은 기술 COMPLETED·완료 리뷰 외에 실제 사용자 통합 권한과 coordinator 게이트가 필요하다(roadmap §5).

공통 정량/보고 게이트는 [roadmap §3](feat_plan/phase-roadmap.md)을 적용한다. **승인된 기술 범위**의 필수 FAIL/BLOCKED/PENDING/skip 또는 테스트 0개 통과는 허용하지 않는다. 실제 체크리스트·동일 MD/HTML·완료 리뷰·인계를 갖춘 경우만 해당 범위 COMPLETED로 판정한다. 현재 모든 시험은 미실행이다.

## 12. 위험과 대응

이전196 PASS로 이번 시험을 대체하거나 빈 표본 복구로 확대 해석할 위험이 있다. 신규 비빈 fixture와 고유 시험/복구 대조를 수행한다. 이전 이미지 미확보는 기술 BLOCKED, RPO/RTO 미정은 외부 게이트로 구분한다. 공통 착수/범위 변경 통제는 [roadmap §2~3](feat_plan/phase-roadmap.md)을 따른다.

## 13. rollback/복구

시험 서비스를 중지하고 합성 자료만 정리한다. stage6 검증/문서 PR revert는 기존 schema/데이터를 바꾸지 않는다. 실패 복구본은 writer 정지 상태로 보존하고 별도 빈 환경에서 다시 복구한다. 공통 PR revert·DB down 금지·같은 정지점 DB+uploads 백업/빈 환경 복구는 [roadmap §5](feat_plan/phase-roadmap.md)을 따른다.

## 14. 결과 증거와 다음 Phase 인수인계

미래 산출물은 `md/phase17-test-checklist.md`(구현 후 시험 전),`md/phase17-result.md`/`md/phase17-result.html`(실제 시험 후),`md/evidence/phase17/`다. 명령/exit code·고유 시험 수·최초 실패/재시험·Phase별 고유 증거를 남긴다. 개인정보 제거·동일 MD/단일 HTML·완료 리뷰 규칙은 [roadmap §3](feat_plan/phase-roadmap.md)을 따른다. 지금 결과/체크리스트를 생성하지 않는다.

기술 검증 범위·전체 trace/실제 수치·migration/backup manifest·이미지 digest·격리 ja 활성/비활성 기록을 coordinator에게 인계한다. 원어민 승인·법무/공급자/운영 미완료는 §7 표의 책임자/재개 조건과 함께 별도 인계한다. 새 Phase18은 이번 범위에 없다. 이 plan과 미래 체크리스트/MD/HTML/완료 리뷰를 전달하고 미해결 차단을 숨기지 않는다.

## 15. 변경 이력

| 날짜 | 변경 | 근거/상태 |
| --- | --- | --- |
| 2026-10-01 | 승인통합 stage6를Phase17 실행계획으로분할 | 사용자후속요청·규칙§6.2/§13;DRAFT/reviewer계획검토전,구현/시험미실행·predecessor gate BLOCKED |
| 2026-10-01 | Phase 리뷰 Round1 PM1/PM2·Minor6 반영 | REVISED / 재검토 대기; 실행 BLOCKED·착수 결정 미승인, 기술 범위/외부 게이트 분리 |
| 2026-10-01 | [Phase Round2 계획 승인 반영](feat_plan/phase-review-round-2.md) | APPROVED·Major 0; 계획 승인은 착수 승인 아님, 실행 BLOCKED·예외 현재 미승인 유지 |


## 16. Phase17 live 실행 권한과 구현 인계

2026-10-01 live task_b9e371f25c19 / ctx_6fad68e01617; 사용자 지시와 Phase12 §16의 B 승인 승계로 실제 부모 `/mnt/f/claps-product`에서 독립 로컬 기술 범위만 실행한다. 앞 §3/§7의 미착수·예외 미승인 문구는 계획 작성 당시 이력이다. Phase16 local COMPLETED/EXECUTED350 고유 PASS 및 원본 CR C0/M0/m2/n4/수정5/필수미해결0/조건3을 입력으로 보존했다. 독립 reviewer APPROVED를 주장하지 않는다.

현재 실행 체크리스트를 시험 전에 작성하고 전 suite 및 production78/별도demo1을 실제 수행했다. 복구/구 application image/규모100·1000·10000/격리 role/관리자ja/원어민 요청자료와 최종3팩 결과는 `phase17-result.md`/동일HTML/체크리스트/evidence에 최종 인계한다. 초기 coder 상태는 REVIEW_READY / IN_PROGRESS까지이며 독립 review와 same coder fixes/closure가 다음 gate다. Phase11 전체 IN_PROGRESS/외부 BLOCKED·운영ja false·운영role/원어민/제품/법무/provider/OAuth/RPO/RTO gate 유지. Commit/push/PR/deploy/실송신/Phase18/clear0.

실제 현재 결과:351고유PASS(70unit+193integration+9i18n+78production+1demo), 최종3팩관련12재시험;34/34fullSHA/13feature/missing0. 복구21tables/80files mismatch0·기존application838d8cd실행/보존·격리adminja/1205key요청자료·조건3local evidence PASS. 필수미해결0, 독립review/coderclosure PENDING으로 REVIEW_READY/IN_PROGRESS까지만 기록한다. [결과](phase17-result.md)/[체크리스트](phase17-test-checklist.md)/[인계](phase17-handoff.md)/[감사](evidence/phase17/final-audit.json). 운영외부승인/실명배정/Phase18/clear0.


## Phase17 SAME CODER fixes — current local COMPLETED / EXECUTED

2026-10-01 task4c669be04d81/ctx_b8b50122ea23 supersedes the INITIAL coder REVIEW_READY/IN_PROGRESS state above, which remains historical. Original independent CHANGES_REQUESTED C0/M1/m3/n6 unchanged; SAME CODER fixed all10 with actual retests, requiredtechnical0, no independent APPROVED invented. Current354unique PASS=73unit+193integration+9i18n+78wholeproduction(one fresh noncoderDB)+1demo; final3pack related15repeats and actualdemoCLI3 preservation. Recovery21/21nonemptytables82files0mismatch/replays preserved; oldappenabledjaabsentpack+oldworker25s/21fingerprints unchanged; appoperationalroleA/B/16denials/readerSELECTonly,12proofrolesNOLOGIN.7ownDBja=false, ownedruntimes/dbcontainers stopped, oldevidence/privatefixtures/volumes retained, protectedruntimes unchanged. Native1205keys/durable78FINALsample packet unsent/unapproved/realownerspending; THREE inheritedlocalconditions supported, operatingrate/budget/grantsBLOCKED. Phase11wholeIN_PROGRESS/externalBLOCKED, SIGSEGV139causeunresolved. NoPhase18/clear/commit/push/PR/deploy/sending.

[Current result](phase17-result.md), [fixes](phase17-review-fixes.md), [checklist](phase17-test-checklist.md), [handoff](phase17-handoff.md), [audit](evidence/phase17/fixes/final-audit.json).
