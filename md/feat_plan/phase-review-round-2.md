# Phase12~17 계획 독립 검토 — Round 2

- 대상: `md/feat_plan/phase-roadmap.md`, `md/phase12-plan.md`~`phase17-plan.md`, `md/feat_plan/README.md` 수정본
- 기준: [phase-review-round-1.md](phase-review-round-1.md) PM1/PM2/m1~m6, `md/phase-development-process-rules.md` §5.2/§6.2/§6.4/§10/§12, 승인 통합계획 §7
- 검토자: reviewer (Orca task_5995617760bb), 2026-10-01. 문서 직접 대조, 로컬 링크와 §1~15 존재 여부는 스크립트로 검사. 계획·이전 문서·코드 편집, Git 변경, 앱 테스트, DB 쓰기는 하지 않았다.

## 판정: **APPROVED (계획 문서 승인)**

Blocker 0건, Major 0건. Round 1의 PM1, PM2, m1~m6이 모두 해소되었다. 비차단 잔여 사항 2건(§3)만 남는다.

> **계획 승인 ≠ 착수 승인.** 이 판정은 Phase12~17 계획 문서만 승인한다. 현재 A/B 착수 결정, 독립 로컬 범위 예외, 코드·Git·push·PR 권한, `feature/backend` 최종 통합 권한, 운영 ja 활성화 중 어느 것도 승인되지 않았다. roadmap §2.1에 따라 권한 있는 사용자의 결정 기록이 생기기 전까지 모든 Phase의 실행 상태는 **BLOCKED**로 유지된다. Phase11은 계속 IN_PROGRESS다. plan 파일의 `REVISED / 재검토 대기` 표기는 이 판정 뒤 planner가 최종 상태로 갱신할 대상이며, 지적 사항이 아니다.

## 1. Round 1 이행표

| ID | 요구 | 수정 위치 | 확인 결과 | 판정 |
| --- | --- | --- | --- | --- |
| PM1 | 규칙 §6.4 형식의 착수 결정 요청(선택지·권장안·게이트 연쇄·영향·재개 위치) | roadmap §2.1, 각 plan §3·§7 | 아래 1~7이 모두 확인된다(목록 참조) | 해소 |
| PM2 | Phase17 기술 필수와 외부 게이트 분리, 최종 PR 조건 | phase17 §3·§7·§10·§11, roadmap §4·§5 | 아래 1~4가 모두 확인된다(목록 참조) | 해소 |
| m1 | Phase12 범위에 T22 | phase12 §5(line 36), §11(line 131) | T22 추가. 완료조건은 inline 스크립트 미도입과 hydration 경고 0 | 해소 |
| m2 | 기간 재추정과 ja 초안 담당 | phase12 §1·§7(line 46), roadmap §1 | 기간은 7~11일(개발 4~6 + ja 초안 3~5)로 재추정. 초안 방식(원본 재사용, 용어표 기준)과 역할이 명시되었다. 원어민 승인은 외부 게이트로 분리 | 해소 |
| m3 | 스키마 변경 없는 Phase의 migration 문구 | phase14 §9·§13, phase17 §9 | "새 migration 해당 없음"과 사유 명시, 기존 migration 회귀는 유지 | 해소 |
| m4 | en-GB 생성·정리, demo 회귀 명령 | phase12·17 §10 | 빌드 전 `phase11-locale.mjs` 실행, manifest 기반으로 자기 파일만 정리(checksum 불일치 시 중단), demo를 `.env.seed.local`로 분리하고 `claps_demo`인지 검증, `db:seed:demo`/`test:demo` 실행. secret은 기록하지 않음 | 해소 |
| m5 | 압축 문장과 템플릿 반복 | roadmap §3로 공통 게이트 집약, phase12·17 서술 복원 | 공통 정량 게이트를 roadmap §3 한 곳으로 모았다. 잔여는 §3 참조 | 해소(잔여 경미) |
| m6 | Phase17 §3의 선행조건 표현 | phase17 §3 | "Phase11 공급자·출시 보류는 외부 게이트, Phase17 기술 완료의 선행조건 아님"으로 명시 | 해소 |

**PM1 확인 내용** (roadmap §2.1)
1. 결정 질문과 선택지가 있다. A는 Phase11 완료까지 대기, B는 명시적 독립 로컬 범위 예외이며 B를 권장한다.
2. 권장 이유와 위험, 기간(B는 21~33일)이 적혀 있다. 기간은 roadmap §1 합계와 일치한다.
3. B의 금지 범위가 명시되었다: 공급자, 운영 배포, 운영 ja, 최종 통합, 자동 Git 권한.
4. 게이트 연쇄가 정의되었다. 각 Phase 결과에 "승인된 독립 로컬 기술 범위 COMPLETED"를 기록하고, 그것이 다음 Phase의 조건이 된다. Phase11 IN_PROGRESS와 외부 BLOCKED는 별도로 유지하며 N/A로 바꾸지 않는다.
5. 승인 기록에 들어갈 필드와 유효기간·재승인 조건이 있다.
6. 재개 위치는 Phase12 §8의 1단계다.
7. Phase11 §16 선례를 인용하되 "선례가 현재 승인을 만들지 않는다"고 명시했다. planner와 reviewer는 승인자가 아니다.

**PM2 확인 내용** (phase17)
1. §11 기술 필수는 5개 항목이다: 34행과 전체 ID, 비어 있지 않은 표본으로 DB+파일 복구, 이전 image digest와 구 코드 호환, 격리 DB에서 관리자 ja 활성·비활성 smoke, 원어민 **요청자료 준비**. 외부 승인에 의존하는 항목은 0개다.
2. §7에 외부 게이트 표 6행이 있고, 각각 소유자·조건·상태·재개 절차를 가진다.
3. 최종 `feature/backend` PR 조건이 roadmap §5에 정의되었다: 기술 COMPLETED + 완료 리뷰 + 사용자의 실제 통합 권한 + coordinator 게이트. B 예외나 계획 승인만으로는 불가하며, 현재 권한은 없다.
4. ja 순서는 roadmap §4의 "기술 완료 → 외부 게이트 충족 시 운영 활성화"로 고쳐졌다.

## 2. 유지 확인

- **17개 필수 항목:** 여섯 plan 모두 §1~§15가 있다(누락 0). 17개 항목과의 대응은 roadmap §3에 명시되어 있다.
- **34행과 테스트 ID:** roadmap §6에 T01~T34가 있고 Phase별 필수 ID와 대응한다. T22가 Phase12 범위에 반영되었다.
- **migration 순서:** Phase12의 users migration이 가장 먼저이고, 13·15·16도 같은 게이트(빈 DB/0008 복제/앞 Phase schema/구 코드 호환)를 따른다. 14·17은 해당 없음. 기존 0000~0008은 변경하지 않고 down migration도 없다.
- **언어:** 모든 Phase에 L01(세 팩 동등 + en 선택 가능 유지)이 적용되고, 운영 ja는 외부 게이트 이후에만 활성화된다.
- **Git:** stage1~6과 Phase12~17 PR이 1:1이다. trailer, drift 재확인, PR 단위 revert, migration forward-fix는 그대로다.
- **검증 명령:** `TEST_DATABASE_URL`이 들어 있고, 격리 DB에 migrate/seed를 적용하며, production 빌드 후 별도로 기동한다. 모든 명령은 "후속 실행용·미실행"으로 표기되어 있다.
- **파일과 링크:** 로컬 링크 깨짐 0건. 체크리스트, 결과 MD/HTML, 코드 변경은 생성되지 않았다(`git status`상 계획 파일만 untracked).

## 3. 잔여 (비차단)

| ID | 위치 | 내용 | 권고 |
| --- | --- | --- | --- |
| R1 | phase13~16 §7~§9 일부, phase17 §8~§9 | 띄어쓰기를 생략한 압축 문장이 일부 남아 있다(예: phase14 §9 "새DB/seed/APIwrite/workerkind 없음"). 의미는 판별할 수 있어 차단 사유는 아니다 | 해당 Phase 착수 전 READY로 바꿀 때 가독성을 정리 |
| R2 | 외부 게이트 소유자, phase12 §7 | 게이트 소유자와 구현 담당이 역할명으로만 적혀 있다("착수 전 실명 지정") | B 결정 기록을 만들 때 coordinator가 실명과 일정을 확정 |

## 4. 다음 절차

1. planner가 계획 상태를 reviewer 승인 반영 상태로 갱신한다(실행은 BLOCKED 유지).
2. coordinator가 roadmap §2.1의 A/B 결정 요청을 권한 있는 사용자에게 전달하고 답변을 기록한다.
3. B 승인 기록(범위·금지 사항·Git 권한·유효기간)이 확인된 뒤에만 Phase12 §8의 1단계를 착수하고, 체크리스트를 만들어 실제 시험을 진행한다.
