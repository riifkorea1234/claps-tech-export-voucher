# Phase 11 검증 체크리스트

상태: 독립 로컬 범위 PASS, 전체 IN_PROGRESS/운영 출시 BLOCKED. 2026-09-24. 독립 로컬 검증과 전체 출시 조건을 구분한다. 공급자 보류·운영 목표 미정은 PASS로 간주하지 않는다.

환경: Node22.22.0, pnpm10.34.5, Next16.3.3, PostgreSQL17.11. 기존 통합 회귀는 claps-tests의 claps_test(55433). 새 배포/브라우저는 claps-phase11의 claps_test(55434)/web3191/worker/별도 uploads volume. 복구는 claps-phase11-recovery의 빈 DB(55435)/web3192/별도 uploads volume. 모든 계정·메일·이미지·파트너는 합성 자료이며 sandbox 외부 발송 없음.

| ID | 로컬 검증 | 실행 상태 |
| --- | --- | --- |
| P11-T01 | 기본 검사·전체 회귀·runtime mock 감사 | 기본/회귀 PASS; 잔여 가이드 시연 때문에 전체 mock0 조건 BLOCKED |
| P11-T02 | 파일팩/ko/en 오류·제3locale 등록/초안/게시/활성화/비활성/입력/선호/메일/작업 언어 | PASS — 시험 locale/자동 검증; 사람 검수 별도 |
| P11-T03 | 전체 unit/integration/E2E·권한/보관·오류 | 자동196 PASS; 실제 공급자/합의 부하 평가는 BLOCKED |
| P11-T04 | 새 Compose·재시작·DB+파일 백업·빈 환경 복구·이전 이미지 | 로컬 복구 PASS; 운영 RPO/RTO는 BLOCKED |
| P11-T05 | T-01~24·MD/HTML·문서 정합성 | 문서 정합성 PASS; 전체 출시 판정 BLOCKED |

## 최초 실행과 수정

- unit/i18n 12 files / 46 PASS / 0 FAIL/skip, exit0, 18.56초.
- integration 9 files / 111 PASS / 0 FAIL/skip, exit0, 249.60초.
- 최초 production build/typecheck/lint exit0; 기존 lint 경고2, 오류0.
- 최초 전체 Chromium 35개 중30 PASS/5 FAIL/0 skip, exit1, 3.7분. 실패: UI errors namespace 누락, 추천 sort 테스트의 구형 dropdown locator, 커버/PDF input locator 중복, queued job UI fixture와 실제 worker 경쟁, 추천 worker helper와 실제 worker 경쟁. 코드/fixture/locator를 수정하고 전체 재실행한다.
- 제3 locale 확장 기본 E2E는 최초 실행에서 PASS. 이후 메일·job 언어/오류팩 검증을 추가했다.
- API locale 전달을 string으로 확장한 중간 build는 account-store의 ko/en fallback map 인덱싱 TypeScript 오류로 exit1. 요청 locale과 오류 fallback을 분리해 수정했다.
- 백업 도구가 실행 중인 web/worker 환경에서 작업을 거절했고 백업 폴더를 생성하지 않았다.

최종 명령·결과·복구 실측은 아래 실행 기록을 따른다.

## 최종 자동 검사

| 명령 | 결과 |
| --- | --- |
| `docker build --target web -t claps-phase11-web .` | 수정 후 production build exit0 |
| Docker test의 `pnpm typecheck && pnpm lint` | exit0, 오류0·기존 경고2·신규 경고0 |
| Docker test의 `pnpm exec vitest run --project unit --project i18n` | 13 files / 50 PASS(단위42+i18n8) / 0 FAIL/skip, exit0, 3.38초 |
| `docker run --rm --network claps-tests_default -e TEST_DATABASE_URL=<격리 db-test URL> claps-phase11-test pnpm test:integration` | 9 files / 111 PASS / 0 FAIL/skip, exit0, 28.83초 |
| `E2E_BASE_URL=http://127.0.0.1:3191 E2E_MAIL_DIR=/tmp/claps-p11-mail TEST_DATABASE_URL=<격리55434 URL> E2E_EXTERNAL_WORKER=1 corepack pnpm test:e2e` | production Chromium 10 files / 35 PASS / 0 FAIL/skip, exit0, 2.9분 |
| 같은 환경 `PHASE11_KEEP_RECOVERY_FIXTURE=1 corepack pnpm exec playwright test tests/e2e/phase11.spec.ts` | 복구 fixture를 남기는 재실행 1 PASS, exit0, 22.0초; 고유 합계에는 중복 포함하지 않음 |
| `python3 scripts/health-load.py --origin http://127.0.0.1:3191` | 100 requests·동시5·오류0, 2.898초, 34.5req/s, p50 139.41ms·p95 173.76ms·max244.73ms |

고유 자동 테스트: **32 files / 196 PASS / 0 FAIL/skip**. [정적·단위·언어 로그](evidence/phase11/checks.txt), [통합 로그](evidence/phase11/integration.txt), [브라우저 로그](evidence/phase11/e2e.txt), [readiness 부하 실측](evidence/phase11/health-load.json).

Docker test의 첫 단위 재실행은 Python3가 없어 기존 ZIP 독립 reader 테스트 1 FAIL/49 PASS였다. Dockerfile의 **test stage만** Python3를 설치하도록 수정했고 최종50 PASS를 확인했다. host 통합 재검증도111 PASS/268.04초였으며 최종 Docker 실행과 중복 합산하지 않는다. 부하 smoke는 readiness endpoint만 대상으로 다른 로컬 검증과 함께 실행한 관측값이다. 공급자 작업 처리량/운영 SLA의 합격 근거가 아니다.

## 배포·복구 실제 실행

실행 구성: [검증 Compose snapshot](evidence/phase11/compose.yaml), [합성 환경 예시](evidence/phase11/environment.example). 예시의 DB 비밀번호는 격리 시험 전용 공개 값이다. 실제 운영 비밀번호로 사용하지 않는다. 빌드 tag와 정확한 실행 이미지 ID는 [백업 manifest](evidence/phase11/backup-manifest.json)에 기록했다. 이미지 archive/registry 보관 자체는 운영자가 별도 확보해야 한다.

1. 별도 `claps-phase11` 볼륨에서 migration 8건·seed·i18n:activate와 web/worker health 성공. web/worker 재시작, migration/seed 재실행 후 세션·선호·게시본·원본 바이트 유지.
2. web/worker 정지 후 `python3 scripts/backup-restore.py backup --project claps-phase11 --env-file /tmp/claps-p11.env --compose-file /tmp/claps-p11-compose.yaml --directory /tmp/claps-p11-backup`: **3.896초**, exit0. DB dump와 uploads tar SHA-256 기록.
3. 새 `claps-phase11-recovery` DB/파일 볼륨에 `restore` 수행: **3.562초**, exit0. 이후 migration/seed, web/worker health, HTTP smoke까지 **17.574초**. 이미지는 미리 빌드되고 DB는 준비된 상태에서 측정했다. 호스트 준비/이미지 다운로드/외부 백업 전송/TLS 전환 시간은 제외된다.
4. source/recovery의 users·partners·monitoring_records·localized_contents·locales 전체 행 checksum 일치. projects·asset_sessions는 두 환경 모두0건이므로 **프로젝트 실데이터 복구의 증거로 삼지 않는다**. 합성 user1·monitoring1·partner1·localized2, migration8건. 파일 **34개 모두 SHA-256 일치**. [DB/파일 대조](evidence/phase11/parity.json), [복구 smoke](evidence/phase11/recovery.json).
5. 이전 web `claps-phase10-web`(4074b013f273)와 이전 코드 snapshot `claps-phase10-test`(e89d1d75cb7f)의 production worker 명령으로 교체. 양쪽 health, 기존 세션/선호·원본 byte 확인. 이전 파일팩에는 en-GB가 없어 SSR=en·콘텐츠 원문 fallback. DB 게시 번역/선호/원본 metadata checksum은 그대로다. [이전 이미지 smoke](evidence/phase11/previous.json). 이전 worker는 전용 production tag가 없어 보존된 Phase10 test 이미지에서 `workers/index.ts`를 NODE_ENV=production으로 실행한 검증이며 운영 배포 이미지로 권장하지 않는다.
6. 최신 시험 이미지 복귀 후 SSR=en-GB·게시 번역 다시 표시. DB schema/locale 컬럼 변경 **0건**. en-GB는 영어 기반 시험 locale이며 사람 번역 검수 또는 새 공개 언어 지원을 의미하지 않는다.
7. 실행 중 writer, checksum 불일치, tar 경로 탈출, 비어 있지 않은 파일 볼륨, 비어 있지 않은 DB의 **5개 거절 검사 PASS**. 거절 뒤 실제 데이터가 덮어써지지 않았다. [안전 가드 결과](evidence/phase11/guards.json).

이전 이미지 첫 smoke는 게시 번역을 계속 표시해야 한다는 잘못된 기대값 때문에 FAIL했다. 미배포 언어를 선택 불가 처리하는 기존 계약에 따라 원문 fallback을 기대하도록 고쳤고, 표시 fallback과 DB 게시 행 보존을 각각 재검증했다. 이 오류를 구현 성공으로 집계하지 않았다.

운영 RPO/RTO·외부 별도 보관·TLS·실메일·실제 공급자 품질·사업 데이터/번역 검수는 **BLOCKED**. 로컬 실측으로 임의 합격 판정을 만들지 않았다. 최종 T-01~24 매핑과 전체 상태는 [결과 보고서](phase11-result.md)를 따른다.


최종 기본 ko/en 이미지: web `sha256:838d8cd75bc23fd6b6b8ac7adf4ad9a03c229bf1f65d39add6a9a52f34ad27ef`, worker `sha256:23c2d2ce0998792d0f1323033b307dc694b3ab268216aa14d23ee9eebbe62ede`. 시험 en-GB 폴더 제거 후 각각 build exit0, 같은 복구 DB에서 health·세션·원본·en/원문 fallback smoke PASS. [기본 팩 smoke](evidence/phase11/release-smoke.json), [시험 이미지 복귀](evidence/phase11/return-current.json).

문서 검증: 로컬 링크55개, MD/HTML 본문 일치, 외부 script/CDN 없는 단일 HTML 구조 PASS. Chromium1280/390px 렌더·가로 overflow0·브라우저 오류0, 모바일 캡처 직접 확인. [PC](evidence/phase11/report-1280.png) · [모바일](evidence/phase11/report-390.png). `git diff --check` PASS. 신규 mjs 스크립트 lint exit0.

정리 완료: source/recovery DB의 users·monitoring_records·jobs·storage_tickets 각0건, 생성한 locale/파트너/게시 fixture 제거. 세 Compose 검증 DB와 web/worker를 중지했다. 임시 sandbox 메일·세션/fixture JSON·손상 백업 복사본은 제거했다. [정리 증거](evidence/phase11/cleanup.json). 볼륨·빌드 이미지와 0700 디렉터리/0600 파일의 합성 백업 `/tmp/claps-p11-backup`은 보존했다. 이는 임시 로컬 실험 자료이며 운영 백업이 아니다.

정리 중 첫 host helper 호출은 tsx의 CJS export 형식 때문에 실패했고 namespace/default 호환으로 다시 호출했다. 첫 삭제 순서는 localized_contents.updated_by FK가 계정 삭제를 차단했으며 게시 fixture를 먼저 제거한 후 최종0건을 확인했다. FK를 끄거나 운영 데이터를 삭제하지 않았다.
