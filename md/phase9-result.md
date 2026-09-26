# Phase 9 결과 — 기준 저장·규칙 기반 파트너 추천

상태: **IN_PROGRESS — 사용자 선택 규칙 기반 구현·자동 검증 완료, 실제 파트너 사업 품질 검수 대기.**
작업일: 2026-09-24. 담당: Codex 단독. Phase 7·8 실제 공급자 보류 유지.

## 목표와 범위 판정

사용자가 Phase 9 진행과 외부 공급자 없는 규칙 기반 추천을 선택했다. 기준·참조 이미지를 서버에 저장하고 공개 파트너 DB를 대상으로 실제 계산한 점수와 근거를 보여준다. 운영 목업이나 가짜 연락처를 seed하지 않았다. [상세 계획](phase9-plan.md) 16.1절에 엔진과 점수 계약을 먼저 기록했다.

| 범위 | 판정 |
| --- | --- |
| 기준·칩·참조 이미지 저장/복원·계정/동시 수정 보호 | PASS |
| 공개 파트너·게시 번역·원본 연락처 연결 | PASS |
| 실제 rules-v1 worker·입력/후보/엔진 snapshot·4개 점수/근거 | PASS |
| Hero/목록 정렬·재추천·실패 시 이전 성공 유지 | PASS |
| 비공개 전환·권한·사용량·ko/en·모바일 자동 검증 | PASS |
| 실제 운영 파트너 코퍼스·기대 추천 검수 | BLOCKED — 실제 데이터 및 사업 품질 기준 미제공 |
| 전체 Phase COMPLETED | 미충족. 독립 구현과 합성 검증만 완료 |

## 실제 구현과 결정

기준은 `users.preferences.matching`에 revision과 함께 저장한다. IP명·카테고리·세계관·키워드·브랜드·업종·매출·콜라보 이력과 참조 이미지 최대 3개를 복원한다. stale revision은 409이며 계정 locale을 덮어쓰지 않는다. 업로드는 PNG/JPEG/WebP, 장당 10MiB/40MP/단일 프레임이며 실제 디코딩·checksum·소유권을 검사한다. 저장 전 임시 업로드는 15분 만료, 타인·제거된 이미지 접근은 거절한다. IO 전 ledger를 남기고 제거 후에도 과거 job의 파일 참조와 원본을 보존한다.

`rules-v1`은 NFKC·소문자 정규화 후 문자/숫자 토큰의 정확한 일치를 계산한다. IP·세계관·브랜드·업종 네 항목마다 입력 토큰 중 일치 비율을 백분율로 표시하고, 입력된 항목의 동일 가중 평균을 종합 점수로 사용한다. 미입력 항목은 null/평가 없음, 0점 후보는 제외, 동점은 ID순, 최대 20개다. 매출·이력·이미지는 저장하지만 현재 계산에는 사용하지 않는다. 가격·팬덤 수치·의미/이미지 유사도·협업 성공 확률을 추정하지 않는다.

추천 요청은 저장된 기준과 공개 후보 master의 당시 텍스트/버전을 job input에 snapshot한다. 후보 200개와 전체 metadata 64KiB 한도를 초과하면 거절한다. 멱등 키·기준 revision·계정당 진행 추천 1개·공통 시간당 60회·matching 30초 timeout을 적용한다. worker는 외부 호출 없이 계산하고 완료 시 결과를 다시 검증한다. 기존 lease/취소/계정 가드를 재사용하며 비용 상태는 none이다.

최신 시도와 최신 성공 결과는 분리한다. 실패/취소/진행 중 기존 성공을 유지하며, 조회 시 현재 비공개 후보를 제외해도 원본 job 증거는 변경하지 않는다. 화면 언어 변경은 새 추천을 만들지 않는다. 현재 파트너 정보는 게시 번역/fallback, 점수 근거는 당시 원문 토큰과 요청 언어 snapshot을 따른다. 연락처가 없는 파트너도 조회되며 임의 이메일을 만들지 않는다. 복사 직전에 공개 상세를 다시 조회하고, 브라우저 복사 권한이 없으면 상세 창을 유지하며 수동 복사를 안내한다.

## API와 배포

| Endpoint | 계약 |
| --- | --- |
| GET/PUT /api/me/matching-criteria | revision/criteria/referenceIds 저장 및 복원 |
| POST /api/me/matching-images | name/mime/size → referenceId/ticket/uploadUrl |
| PUT /api/uploads/:token | 실제 디코딩 후 업로드 ready; 기준 저장 때 연결 |
| GET /api/me/matching-images/:id | 현재 소유 참조 또는 만료 전 ready 이미지 |
| POST /api/matches | revision/outputLocale/idempotencyKey → 202 job |
| GET /api/matches/latest | 최근 시도 + 현재 공개된 최신 성공 결과 |
| GET /api/partners 및 /:id | 게시 번역·원문 연락처, 비공개 상세 404 |

배포 전 `0006_fluffy_overlord.sql`을 적용하고 web/worker를 함께 갱신한다. migration은 기존 storage_tickets target 제약에 matching을 추가할 뿐 새 테이블·외부 서비스·패키지는 없다. 격리 테스트 DB에서 migration/seed/locale 활성화를 검증했으며 운영 DB에는 적용하지 않았다.

장애 시 신규 matching 요청/handler 등록을 제한하고 기존 job/파일·비공개 필터는 보존한다. 이미 matching ledger가 생긴 DB에서 이전 제약으로 무리하게 되돌리지 않는다. 물리 파일 영구 삭제는 기존 보존 정책 결정 전 수행하지 않는다.

## 계획 대비 변경과 파일

착수 시 문서의 이전 Phase 결과 미생성/테스트 스크립트 미존재 설명을 현재 코드에 맞게 바로잡았다. 사용자 Phase 9 진행 요청을 독립 범위 착수로 반영하고 Phase 7·8 실공급자 보류를 유지했다. 엔진 결정 후 기존 목업의 가격·팬덤 항목을 실제 데이터로 계산할 수 있는 IP·세계관·브랜드·업종으로 변경했다. 해당 변경은 구현 전에 계획/전체 플랜에 기록했다.

기존 미커밋·미추적 사용자 변경을 보존했다. 기존 PartnerCard/FactorBars/mock 파일은 삭제하지 않았으며 새 partners 런타임 페이지는 이를 import하지 않는다.

| 영역 | 생성/변경 파일 |
| --- | --- |
| 계약/추천 서버 | lib/contracts/{matching,matching-data}.ts; lib/server/matching/{engine,service,handler,http}.ts; lib/contracts/metadata.ts |
| 공유 서버 | lib/server/partners/service.ts; lib/server/storage/service.ts; lib/server/assets/lifecycle.ts; lib/server/adapters/registry.ts; lib/server/jobs/policy.ts |
| API | app/api/me/matching-criteria/route.ts; app/api/me/matching-images/route.ts; app/api/me/matching-images/[id]/route.ts; app/api/matches/route.ts; app/api/matches/latest/route.ts; app/api/partners/[id]/route.ts |
| UI/언어팩 | app/(app)/partners/page-content.tsx; app/(app)/partners/criteria/page-content.tsx; messages/{ko,en}/partners.json |
| DB | db/schema.ts; db/migrations/0006_fluffy_overlord.sql; meta journal/0006 snapshot |
| 검증 | tests/unit/phase9.test.ts; tests/unit/jobs.test.ts; tests/integration/phase9.test.ts; tests/e2e/phase9.spec.ts; tests/helpers/phase9-worker.ts |
| 문서 | README.md; HANDOFF.md; scripts/README.md; md/development-plan.md; Phase 9 계획/체크리스트/결과 MD·HTML·증거 |

## 검증 결과

[체크리스트](phase9-test-checklist.md)에 명령·환경·초기 실패/중단·수정·최종 결과를 기록했다.

| 검사 | 최종 결과 |
| --- | --- |
| 단위 + i18n | 11 files / 43 PASS / 0 FAIL/skip — 단위 36, i18n 7 |
| 서버 통합 | 8 files / 고유 102 PASS / 0 최종 FAIL/skip — 전체 101 PASS 후 추가 1개, 영향 범위 24개 재검증 |
| production Chromium | 2 files / 2 PASS / 0 최종 FAIL/skip — 신규 매칭 전체 흐름 1 + 기존 관리자 catalog 경계 1 |
| 고유 자동 테스트 합계 | 21 files / 147 PASS. 반복 실행 중복 미합산 |
| typecheck/lint/build | exit 0; lint 오류 0, 기존 경고 6, 신규 경고 0 |
| migration/seed/locale | 격리 claps_test에서 exit 0 |
| 문서/공백 | 로컬 링크·단일 HTML·MD/HTML 본문 일치 검사, git diff --check |

매칭 전용 테스트는 단위 5 + 통합 8 + 브라우저 1이다. 실제 운영 handler를 실행했으며 외부 공급자 mock으로 추천 성공을 대체하지 않았다. A/B 합성 데이터의 기대 순위·점수·0근거 제외·200개 후보 CPU 계산 1초 미만을 확인했다. 전체 요청 지연 SLA, 실사업 추천 정확도 및 대규모 부하는 측정하지 않았다.

초기 통합의 잘못된 환경 설정, strict DTO 동기 예외와 rejects assertion 불일치를 수정했다. Docker slim 이미지에는 기존 ZIP 독립 검증에 필요한 python3가 없어 해당 재실행이 실패했으며, Python이 설치된 host에서 전체 43개를 다시 통과시켰다. 첫 브라우저 정렬 선택자 대기는 중단 후 역할 기반 선택자로 수정했다. 다음 실행의 클립보드 권한 거절은 사용자 안내/수동 복사 경로를 보완하고, 최종 실행에서 실제 권한 거절·허용과 clipboard 내용을 모두 검증했다. 실패·중단을 성공으로 집계하지 않았다.

[390px 모바일 캡처](evidence/phase9/matching-mobile.png)를 직접 열어 점수·근거·버튼과 가로 넘침 없음을 확인했다. 자동 브라우저 검증과 캡처 검토이며 별도 사람의 수동 클릭 품질 평가는 수행하지 않았다.

## 남은 항목과 인수인계

규칙 기반 기능의 구현·자동 검증은 완료했다. 실제 공개 가능한 파트너와 운영자의 기대 추천 데이터가 제공되지 않아 사업 품질 검수는 BLOCKED다. 목업 연락처를 운영으로 전환하거나 실제 품질을 합성 평가로 대체하지 않았다. 운영자가 검수한 데이터를 기존 관리자에서 등록한 뒤 기준 A/B·기대 상위 후보·근거·응답 지연을 평가하고 전체 Phase 완료 게이트를 다시 판정해야 한다. 그 전에는 Phase 9 전체 COMPLETED나 Phase 10 자동 착수를 선언하지 않는다.

[서버 인수인계](../HANDOFF.md)와 [실행 안내](../scripts/README.md)에 migration·API·한도·보존 계약을 기록했다. Phase 10은 job snapshot, 이전 성공 유지, 현재 공개/소유권 재검사 패턴을 참고할 수 있다. Phase 7·8 실제 공급자 재개는 별도 미완료 상태를 유지한다.

최종 정리: 격리 DB users/partners/jobs/storage_tickets 모두 0건 확인. 이번 테스트 web 컨테이너 제거·test DB 중지, 임시 메일/업로드 디렉터리 정리 완료. DB volume·migration·빌드 이미지는 보존했다. 문서 검사 3항목 및 `git diff --check`는 PASS다.
