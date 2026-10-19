# Phase12~17 계획 독립 검토 — Round 1

- 검토 대상: `md/feat_plan/phase-roadmap.md`, `md/phase12-plan.md` ~ `md/phase17-plan.md`, `md/feat_plan/README.md` 인덱스
- 기준: `md/phase-development-process-rules.md`(§5.2, §6.2, §6.4, §8, §9, §10, §12), 승인된 feat_plan 3개와 review-round-1/2, Phase11 실제 상태(`md/phase11-{plan,test-checklist,result}.md`, `phase11-result.html`)
- 검토자: reviewer (Orca task_f7f4fd424a21), 2026-10-01
- 방법: 문서를 직접 읽고 대조했다. 로컬 링크는 스크립트로 검사했고, `scripts/phase11-locale.mjs`와 `scripts/README.md`는 소스를 확인했다. plan·기존 리뷰·코드는 수정하지 않았다. merge, commit, 앱 테스트, DB 쓰기는 하지 않았다.

## 판정: **CHANGES_REQUESTED**

Blocker 0건, Major 2건, Minor 6건.

계획 구조는 대부분 규칙을 따른다. 17개 필수 항목, 34행 매핑, 테스트 ID 대응, migration 선검증, 세 팩 동등성, ja 활성화 순서, 브랜치와 PR 단위가 이에 해당한다. Phase11을 COMPLETED로 취급하지 않고 예외도 승인된 것처럼 쓰지 않은 점 역시 정확하다.

그러나 **실제로 실행할 수 있는지**에서 두 가지 Major가 있다.
- (PM1) 모든 Phase의 착수를 막는 predecessor 게이트에 대해, 규칙 §6.4가 요구하는 결정 질문(선택지·권장안·영향)이 없다.
- (PM2) Phase17 완료조건이 외부 승인을 필수 시험으로 포함해 구조적으로 COMPLETED에 도달할 수 없다. 이는 승인된 통합계획 §7과 충돌한다.

**문서 승인과 착수 게이트의 구분:** 이번 리뷰가 승인하더라도 그것은 계획 문서에 대한 승인일 뿐이다. 규칙 §5.2의 착수 게이트(Phase11 COMPLETED 또는 권한자의 명시적 예외 결정)를 대체하지 않는다.

---

## 1. 계획과 일치하는 부분 (확인 완료)

| 항목 | 확인 내용 |
| --- | --- |
| Phase11 상태 | roadmap §2와 각 plan §3은 Phase11을 **IN_PROGRESS / 출시 BLOCKED**로 정확히 인용한다(`phase11-result.md:3`, T-07/08/11/16 BLOCKED). 196 PASS를 이번 통합 PASS로 재사용하지 않는다. 독립 로컬 범위 예외도 "제안이며 현재 승인 없음"으로 명시되어 있다. 규칙 §5.2를 오용하지 않았다 |
| 34행 매핑 | roadmap §6에 T01~T34가 모두 있고, 각 Phase 범위와 합치면 누락 없이 포함된다(T22만 Phase12 §5 문구에서 빠짐 → m1) |
| 테스트 ID 대응 | T행의 테스트 ID가 Phase별 필수 ID에 모두 들어 있다. Phase12는 L01~L06/A01, 13은 L01/E01, 14는 L01/L05/E01/E02, 15는 L01/L03/M01/M02, 16은 L01/R01/R02, 17은 전체다. L06과 A01은 통합계획과 같이 1단계와 6단계에 배정되었다 |
| 의존과 migration 순서 | Phase12의 users 성명 migration이 가장 먼저다. 13(evidence), 15(feedback), 16(review) migration은 각각 빈 DB, 0008 복제 DB, 앞 Phase schema, 구 코드 호환을 검증한다. 14와 17은 schema 변경이 없다 |
| 세 팩과 ja 순서 | 전 Phase에 L01(세 팩 키 동등 + en 선택 가능 유지)을 적용한다. ja는 Phase12에서 비활성 → 16 완료 → 17 검수 → 관리자 절차 순이다. round-2의 N1~N5도 통합계획과 branch-analysis에 반영된 것을 확인했다(resultId 0~49, account-store 문맥 한정 등) |
| Git 단위 | stage1~6 PR은 Phase12~17과 1:1이다. trailer, drift 재확인, PR 단위 revert, migration forward-fix가 승인 통합계획 §1.1과 일치한다 |
| §6.2 17개 필수 항목 | 여섯 plan 모두 §1~§15로 대응한다. 번호·상태·작성일·기간, 목표, 입력·인계, 현 상태, 범위·제외, 결정, 작업 순서·담당, 파일/API/DB, 시험·명령, 정량 완료, 위험, rollback, 증거·인계, 변경이력이 모두 있다 |
| 미실행 구분 | 체크리스트와 결과 MD/HTML은 "미래 산출물"로만 적었고 지금 생성하지 않았다. 모든 명령은 "미실행"으로 표기되어 있다. 규칙 §8·§9·§10과 일치한다 |
| 테스트 환경 | `TEST_DATABASE_URL` 전달, 격리 DB migrate/seed, production 빌드 후 별도 기동, en-GB 시험팩 선준비가 반영되었다. `scripts/phase11-locale.mjs`는 `messages/en/*.json`을 모두 복사하므로 새 namespace(evidence/review)와 자동 호환된다 |
| 링크 | roadmap, README, 6개 plan의 로컬 상대 링크에서 깨진 링크 0건 |

---

## 2. Major

### PM1. predecessor 게이트의 결정 질문이 규칙 형식을 갖추지 않아 계획 전체가 실행 불능 상태로 남는다

- **위치**: `phase-roadmap.md` §2 "독립 로컬 범위만 착수하는 예외는 제안일 뿐…", 각 plan §3 마지막 단락과 §7 둘째 단락.
- **근거**:
  - 규칙 §5.2: 이전 Phase가 COMPLETED이고 필수가 모두 PASS여야 착수할 수 있다.
  - Phase11의 필수 BLOCKED(T-07/08/11/16)는 공급자 계약, 사업 품질, 운영 RPO/RTO 같은 **외부 조건**에 달려 있어 해소 시점을 알 수 없다. 따라서 Phase12~17은 무기한 BLOCKED다.
  - 규칙 §6.4는 이런 결정을 "선택지, 권장안, 영향과 trade-off"와 함께 질문하라고 요구한다. §12 차단 보고도 "사용자가 제공해야 할 결정"과 "재개 위치"를 요구한다.
  - 지금 roadmap은 승인서에 들어가야 할 필드만 나열하고, 선택지·권장안·영향이 없다.
  - 선례도 인용하지 않았다. `phase11-plan.md` §16을 보면 Phase11 자체가 Phase10 IN_PROGRESS 상태에서 사용자 진행 요청을 독립 범위 실행 지시로 해석해 착수했다.
- **수정 요구**: roadmap §2에 결정 요청 블록을 추가한다(planner가 결정하지 않고 형식만 갖춘다).
  1. **선택지**
     - A: Phase11 COMPLETED까지 대기(공급자 의존으로 기간 미정).
     - B: Phase11 §16 선례와 같은 명시적 독립 로컬 범위 예외.
     - C: 필요하면 기타 방안(예: Phase11 이월 항목을 별도 트랙으로 분리하는 규칙 해석).
  2. **권장안과 이유.** 예: B를 권장하되, 허용 작업은 Phase12~17의 격리 로컬 구현과 시험, 금지 작업은 공급자·운영 배포·ja 운영 활성화·feature/backend 최종 통합 PR로 한정한다.
  3. **B 선택 시 게이트 연쇄 정의**
     - Phase12가 "예외 하 독립 범위 COMPLETED"가 될 수 있는지, 아니면 전체 IN_PROGRESS로 두는지.
     - Phase13 착수 조건이 Phase12의 독립 범위 완료인지.
     - Phase11 이월 BLOCKED를 각 결과보고에서 어떻게 표기하는지(N/A로 바꾸기 금지 유지).
  4. **영향과 trade-off**: 기간, 선행 품질 증거가 없는 채 쌓이는 위험, 되돌림 비용.
  5. **재개 위치**: 결정 후 Phase12 §8의 1단계.
- **수용 조건**: roadmap에 선택지 A/B(/C), 권장안, 게이트 연쇄 정의, 영향, 재개 위치가 있다. 각 plan §7은 이 블록을 링크하고 "결정 전 BLOCKED"를 유지한다. 승인 판단은 여전히 권한자 몫으로 명시되어 있다.

### PM2. Phase17 완료조건이 외부 승인을 필수 시험에 섞어 COMPLETED에 구조적으로 도달할 수 없다

- **위치**: `phase17-plan.md` §7(원어민/제품 검수·활성화 승인 후 ja 활성화, "외부 승인 전 준비 검증만 가능하고 필수 BLOCKED로 남긴다"), §11("ja 검수·활성화 게이트 증거가 없으면 필수 BLOCKED/미완료 유지"), §8 4단계, §10(RPO/RTO·이미지 digest 미확보 시 필수 BLOCKED), roadmap §4 ja 순서.
- **근거**:
  - 승인된 `integration-plan.md:225`는 "외부 게이트는 **기술 구현 완료와 별도로** 상태를 보고"한다고 정했고, §7 표도 외부 조건을 "활성화/출시 게이트"로 분리했다.
  - 규칙 §10에 따르면 필수 BLOCKED가 하나라도 있으면 COMPLETED가 될 수 없다.
  - Phase17이 원어민 검수, 운영 ja 활성화 승인, 운영 RPO/RTO를 필수로 가지면 Phase11과 같은 영구 IN_PROGRESS가 반복된다. 그 결과 통합이 기술적으로 끝났는지 판정할 기준이 사라진다.
  - `integrate/feat-1-4` → `feature/backend` 최종 통합 PR의 착수 조건도 정의되지 않는다(roadmap §5는 "후속 승인된 작업"이라고만 적었다).
- **수정 요구**
  1. Phase17 필수 시험은 **기술 범위**로 한정한다.
     - 34행과 모든 ID 회귀.
     - 비어 있지 않은 표본으로 DB+파일 복구.
     - 이전 이미지 호환.
     - 격리 DB에서 관리자 ja 활성/비활성 절차 smoke.
     - 원어민 검수 **요청 자료 준비** 완료.
  2. 원어민 검수 결과, 운영 ja 활성화 승인, 운영 RPO/RTO, 공급자·OAuth·법무는 **Phase 완료와 분리된 외부 활성화 게이트 체크리스트**로 옮긴다. 결과보고에는 "외부 게이트: BLOCKED/대기"로 기록하되 Phase 필수 항목에서는 뺀다. 이 분리의 근거로 통합계획 §7을 명시한다.
  3. 최종 feature/backend 통합 PR의 조건을 정의한다. 예: Phase17 기술 COMPLETED + reviewer 완료 검토 + coordinator 승인. 운영 배포와 ja 활성화는 이 PR과 별개다.
  4. roadmap §4의 ja 순서에서 "Phase17 … 외부승인 → 활성화"를 "Phase17 기술 완료 → 외부 게이트 충족 시 운영 활성화"로 고쳐 쓴다.
- **수용 조건**: Phase17 §11의 필수 항목에 외부 승인 의존 항목이 0개다. 외부 게이트는 별도 표로 소유자·조건·재개 절차를 가진다. 최종 통합 PR 조건이 roadmap §5에 정의되어 있다.

---

## 3. Minor (비차단, 반영 권장)

| ID | 위치 | 내용 | 요구 |
| --- | --- | --- | --- |
| m1 | `phase12-plan.md` §5 | 범위가 "T01~T18/T27/T33~T34"로 적혀 있어, roadmap §6이 Phase12에 배정한 **T22**(366b1be, backend로 이미 충족, L05)가 빠졌다 | T22를 추가한다(기존 충족 유지 검증 = inline locale 스크립트 미도입·hydration 경고 0) |
| m2 | `phase12-plan.md` §1 예상 기간 | 4~6일이 과소 추정일 가능성이 있다. 이 안에 19커밋 이식, 11+2개 namespace 전체 ja 팩 **초안 작성**(검수는 외부), users migration, 글꼴 로컬화, 하드코딩 6곳이 모두 들어 있다. ja 번역 초안을 누가 어떻게 만드는지가 없다 | ja 팩 초안 작성 주체·방식과 그 기간을 분리 추정한다. 필요하면 기간 범위를 재산정한다 |
| m3 | 각 plan §9 공통 문단 | schema 변경이 없는 Phase14·17에도 "migration은 새 SQL/meta/journal…"이라는 템플릿 문장이 남아 있어 "새 DB 없음"과 모순되어 읽힌다 | schema 변경 없는 Phase는 "migration 해당 없음(사유)"으로 바꾼다 |
| m4 | `phase12-plan.md` §10, `phase17-plan.md` §10 | 명령 블록에 en-GB 시험팩 생성(`node scripts/phase11-locale.mjs`, 빌드 전)과 정리 단계가 없다. 이 단계 없이 `test:e2e`를 돌리면 phase11 suite가 실패한다(`scripts/README.md:180`). L06의 demo 회귀(`db:seed:demo`, `test:demo`, `.env.seed.local`)도 참조만 있다 | 두 plan의 명령 블록에 en-GB 생성·정리와 demo 회귀 절차를 명시한다(secret은 placeholder) |
| m5 | 여섯 plan 전반 | 공백을 생략한 압축 문장(예: "정량공통:필수feature ID 전부실제PASS,…")과 §6·§12 후반·§13의 템플릿 반복 때문에 Phase별 고유 판단을 읽기 어렵다. 규칙 §6.3 5~7항("측정 가능한 조건")의 실용성이 떨어진다 | 공통 문구는 roadmap 한 곳으로 모으고, plan에는 Phase 고유 조건만 띄어쓰기를 복원해 남긴다 |
| m6 | `phase17-plan.md` §3 | "Phase11 공급자·출시 보류도 해소되지 않았다"가 Phase17의 선행조건처럼 읽힌다 | PM2 분리와 맞춰 "외부 게이트로 인계, Phase17 기술 완료의 선행조건 아님"으로 명확히 한다 |

---

## 4. Round 2 승인 조건

1. PM1: roadmap §2에 규칙 §6.4 형식의 결정 요청 블록과 게이트 연쇄 정의가 있고, plan들이 이를 링크한다.
2. PM2: Phase17 필수 항목이 기술 범위로 한정되고, 외부 활성화 게이트 표와 최종 통합 PR 조건이 정의되어 있다.
3. m1~m6은 반영하거나 미반영 사유를 기재한다.
4. 모든 plan의 상태 표기 유지: 계획은 DRAFT 또는 reviewer 승인, 실행은 BLOCKED. 체크리스트와 결과 파일은 여전히 만들지 않는다.

Round 2에서 승인되더라도 그것은 **문서 계획 승인**일 뿐이다. 구현 착수는 PM1 결정 요청에 대한 권한자의 실제 결정이 기록된 뒤에만 가능하다.
