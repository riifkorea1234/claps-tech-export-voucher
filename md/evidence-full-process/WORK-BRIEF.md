# 증빙용 전체 프로세스 시드·검증·캡처 작업

## 사용자 요청과 완료 조건

사용자 요청: “증빙 목적으로 시드 데이터 만들어서 넣어야 하는데 Orca 하위 worktree를 이용해서 사용자 10명 정도 추가하고, 모든 기능 및 화면에 대한 캡처가 필요하니 그에 맞는 시드 데이터를 추가해 달라. 계정 정보는 md/에 남기고, 모든 프로세스를 검증해 달라. AI가 필요한 개발 부분도 있다고 감안하고 모든 것을 진행해 달라.”

이 worktree에서 구현·시드 적용·검증·캡처·문서화까지 책임지고 완료한다. 계획 작성만으로 끝내지 않는다. 자율적으로 필요한 개발과 배포를 수행한다. 사용자가 필요한 정보를 이미 제공했다면 같은 승인을 재요청하지 않는다.

1. 증빙용 합성 사용자 약 10명과 역할·언어·데이터 상태별 사용 시나리오를 만든다.
2. 실제 DB와 파일 저장소에 사용자/프로젝트/가이드/세션/생성물/검증/최종화/ZIP/추천/모니터링/피드백/타임라인/증명서/리뷰 패키지/관리자 운영을 체험할 수 있는 일관된 데이터를 넣는다.
3. AI 미연동을 이유로 생성·가이드 추출·검증·모니터링 프로세스를 빠뜨리지 않는다. 실제 모델/검색 공급자가 없으면 증빙 계정에 한정된 샘플 공급자나 명시적인 데모 실행 경로를 구현하여 실제 작업 큐·서비스·파일·이력을 통해 전 과정을 검증한다. 샘플을 실제 모델 평가나 실제 침해 탐지 결과로 보고하지 않는다.
4. 모든 사용자 화면, 관리자 섹션과 주요 대화상자·빈 화면·성공/검토/반려·실패·권한 오류 상태를 목록화하고, 필요한 시드 상태를 준비한 뒤 실제 렌더링된 화면을 캡처한다.
5. 일반 화면은 영어·일본어, 어드민은 한국어·영어·일본어를 검증한다. 데스크톱과 주요 모바일 레이아웃도 포함한다.
6. 재실행 가능한 시드 스크립트, 실제 실행·검증 결과, 화면 목록/캡처 인덱스, 프로세스별 증거를 남긴다. 미실시나 제한 사항은 정확히 구분한다.
7. 새 증빙 계정의 이메일·비밀번호·역할·언어·용도·접속 URL을 `md/evidence-full-process/ACCOUNTS.md`에 기록한다. 계정 파일은 0600과 좁은 Git ignore로 보호하고, SSH 비밀번호·DB 접속 문자열·API 키·기존 실관리자 비밀번호는 기록하지 않는다.
8. 결과 문서·계정 정보·캡처는 이 하위 worktree의 `md/evidence-full-process/`에 만들고, 부모 `/mnt/f/claps-product/md/evidence-full-process/`에도 전달하여 사용자가 요청한 `@md/`에서 바로 찾을 수 있게 한다. 부모의 기존 코드/문서는 덮어쓰지 않는다.

## 작업 환경과 현재 상태

- 부모: `/mnt/f/claps-product`, branch `feature/backend`, Git HEAD `b4749eb851c6cfef28f207adfca5f3f1ee942f66`.
- 현재 하위 worktree: `/home/arcreation/orca/workspaces/claps-product/evidence-full-process`.
- branch: `ARCreation/evidence-full-process`.
- Orca repo ID: `5f7909c5-cc23-4e5b-8304-f55104fecdf4`.
- 부모의 최신 미커밋 소스를 이미 복사했다. 이 많은 기존 변경은 이번 증빙 작업의 구현물이 아니라 시작 기준선이다. 기존 작업을 버리거나 되돌리지 않는다.
- `.git`, `.env*` 비밀 파일, 빌드 출력, 런타임 업로드/백업, 과거 `md/evidence` 스냅샷은 복사하지 않았다. `.env.example`은 포함했다.
- `node_modules`는 `/mnt/f/claps-product/node_modules`를 가리키는 링크다. Docker 빌드/테스트는 Linux 파일시스템에서 빠르게 실행할 수 있다.
- 소스 작성 전에 AGENTS.md와 설치된 Next.js 16.3.3의 `node_modules/next/dist/docs/` 관련 문서를 읽는다.

## 적용 대상

직전 대화에서 사용자가 배포를 요청한 공개 사이트 `https://claps.arcreation.work`를 기본 대상으로 삼는다. 부모가 “공개 사이트에 추가 / 별도 증빙 전용 사이트” 선택 질문을 비동기로 보냈으나 아직 답변은 없었다. 부모는 직전 배포한 공개 사이트를 기준으로 준비한다고 사용자에게 알렸다. 사용자가 다른 대상을 지정하면 그 답변을 우선 적용한다. 외부 변경 전에 현재 맥락과 전달된 최신 답변을 확인한다.

- SSH 공개 호스트 `ssh.arcreation.work`의 22번 포트는 현재 직접 연결되지 않는다.
- 동일 서버의 내부 주소 `arcreation@100.120.69.30`는 기존 SSH 키로 접속 가능하다. 공개 호스트 사용자명도 `arcreation`이다. SSH 비밀번호를 소스/문서/로그에 남기지 않는다.
- 서버: `arcreation-ZY-AK2PLUS`.
- 배포 경로: `/home/arcreation/deployments/claps`, Compose project `claps-prod`.
- 현재 이미지: `claps-web:20261020-i18n`, `claps-worker:20261020-i18n`, `claps-migrate:20261020-i18n`.
- 공개 진입점은 `127.0.0.1:39081`, Cloudflare Tunnel 경로는 이미 설정되어 있다. 다른 서비스와 Tunnel 설정은 변경할 필요가 없다.
- 실제 DB 이름은 `claps`. DB 포트는 외부에 공개되지 않는다. 명령은 서버의 `docker compose exec -T ...`를 이용한다.
- 기존 실관리자는 `admin@claps.arcreation.work`이며 active/admin이다. 기존 계정·비밀번호·다른 데이터를 유지한다. 필요한 경우 10명 중 하나를 별도 증빙 관리자 계정으로 구성할 수 있다.
- 현재 권한 enum은 `member`, `admin`이며 `admin`이 최고 권한이다. 관리자 기능은 비밀번호 재확인 후 15분 동안 사용 가능하다.
- 현재 운영 메일은 disabled이다. 새 증빙 계정은 기존 AuthService를 이용한 명시적 프로비저닝(메일 링크를 메모리에서 받아 consume → profile → 필요시 manage promote 등)으로 이메일·프로필을 완료할 수 있다. 실제 외부 메일은 보내지 않는다.
- 기존 사용자는 약 1명이고, 과거 로컬 데모 데이터는 공개 사이트에 이전하지 않았다. 현재 값은 다시 조회하여 확인한다.
- 운영 DB 마이그레이션은 15개(0014까지). en/ja/ko가 활성화되어 있고 en이 UI 기본값이다.

## 배포·검증 참고

최근 배포 기록: `deploy/README.md`, `deploy/release-20261020-i18n.json`, `deploy/remote/compose.yaml`.

서버의 최근 안전 백업은 `/home/arcreation/deployments/claps/backup/pre-20261020-i18n/`에 DB dump/업로드 tar/checksum manifest로 존재한다. 실제 변경 직전에는 새 백업을 만든다. `scripts/backup-restore.py`는 web/worker가 정지된 상태에서 일관된 DB·업로드 백업을 만들며, 기존 DB를 덮어쓰는 복원은 허용하지 않는다. 새 작업 때문에 기존 계정이나 데이터를 삭제하지 않는다. 시드 네임스페이스·멱등성·중단 후 재실행을 설계한다.

최근 소스는 Docker production build/TypeScript와 unit+i18n 90개를 통과했다. 호스트 `pnpm typecheck`는 과거 `md/evidence` 코드 스냅샷 때문에 오류가 나지만 `.dockerignore`에서 md를 제외한 프로덕션 Docker 빌드는 통과했다. 검사를 끄는 방식으로 우회하지 않는다.

최근 배포는 웹·워커·DB healthy, 공개 일본어 전환/새로고침, 최고 관리자 로그인/재인증, 화면 간 언어 분리, 브라우저 오류 0을 확인했다. 새 작업 후 다시 검증한다. Docker save/load 이후 config image ID는 달라질 수 있으므로 전송 무결성은 archive checksum과 RootFS layer hash를 비교했다.

기존 증빙 seed의 가드(`claps_demo`/`claps_test` 전용)를 무조건 제거하지 않는다. 새 증빙 시드 작업의 대상과 소유 범위를 명시하고 재사용 가능한 별도 경로를 만든다. 실제 AI 공급자가 없는 경우 기존 일반 사용자의 동작을 임의로 가짜 결과로 바꾸지 말고, 증빙 계정/명시적 실행 모드로 제한한다.

## 코드 조사 지점

- `lib/server/adapters/registry.ts`: 현재 실제 등록 handler는 export, matching뿐이다.
- `lib/server/jobs/{types,service,queue,runner,runtime}.ts`, `workers/index.ts`: 실제 작업 큐와 상태/재시도/취소/파일 예약/공급자 추적.
- `lib/server/verifications/handler.ts`: 명시적 VerificationProvider 주입, 검증 snapshot 검사와 증빙 이벤트 기록.
- `lib/server/monitoring/handler.ts`: 명시적 MonitoringProvider 주입, 최신 성공 결과 요약 적용.
- `lib/server/demo/{seed,data}.ts`, `scripts/seed-demo.ts`: 기존 부분 시드. 사용자는 더 넓은 전체 프로세스를 요청했다.
- `tests/helpers/review-fixture.ts`, `tests/helpers/workspace-fixture.ts`, `scripts/phase17-fixture.ts`: 합성 데이터 구조 참고용. 해당 helper는 격리 테스트 전용 가드가 있으므로 운영에서 그대로 실행하지 않는다.
- `lib/server/evidence/`, `lib/server/review/`, `lib/server/finalizations/`, `lib/server/exports/`: 실제 증빙/리뷰 패키지/최종화/ZIP 서비스.
- `lib/contracts/metadata.ts`, `lib/contracts/{jobs,monitoring-result,evidence,review}.ts`: 스키마와 JSONB/파일 계약.
- `components/admin/console.tsx`, `lib/server/admin/{http,service,access}.ts`: 관리자 섹션·비밀번호 재확인·감사/관리 기능.
- `tests/e2e/locale-policy.spec.ts`, `tests/e2e/i18n.spec.ts`: 언어 분리와 입력 보존 검증. 네트워크 응답과 waitForURL을 기다린 뒤 UI를 검사한다.

## 화면·프로세스의 최소 커버리지

- 공개/인증: 랜딩, 로그인, 가입, 메일 확인, 비밀번호 찾기/재설정/변경, 초기 프로필, 마이페이지.
- 프로젝트: 목록/검색/필터/페이지/상태/생성/수정/커버/보관·복구, 상세와 세션 목록.
- 가이드: 파일 업로드, 추출 작업, 규칙 검토/편집/게시/버전, 활성 가이드 변경과 stale 결과.
- 생성: 세션 생성/이름 변경, 프롬프트·스타일, 작업 진행/성공/실패/취소/재시도, 이미지 확대/채택·취소.
- 검증: 자산 선택, 가이드별 규칙, 통과/검토/반려, 재검증, 최종본 선택·해제.
- 최종/증빙: 최종본 목록, ZIP 생성·다운로드·내용 검사, 증빙 타임라인, 생성/검증 증명서, 리뷰 체크/발행/고정 스냅샷/인쇄 화면.
- 추천: 파트너 카탈로그/정렬/검색/상세, 추천 기준·참고 이미지, 추천 작업과 결과.
- 모니터링: 원본 업로드/자산 선택, 목록/상세/검색 실행/결과 없음·오류/유사도 요인/소스 상태/과거 이력/오탐 피드백/보관·복구.
- 관리자: 재인증, overview, users, projects, partners, jobs, guides, monitoring, audit-logs, locales, 콘텐츠 번역 초안·게시 등 실제 존재하는 화면과 작업.
- 접근/오류: 비로그인, 다른 소유자의 자료 접근 거절, 정지 회원, 잘못된 입력, 충돌/미지원 상태를 필요한 범위에서 검증하고 실제 결과를 기록.

실제 라우트와 화면의 구현을 조사하여 이 목록을 보완한다. 실제 존재하지 않는 화면을 캡처했다고 쓰지 않는다. 미구현 외부 연동은 샘플 대체 실행과 실제 연동 검증의 범위를 구분한다.

## 최종 전달물

`ACCOUNTS.md`, 실행/재실행 안내, 시드 manifest, 전체 화면·기능 커버리지 표, 캡처 파일과 HTML 인덱스, 실제 검사 결과 JSON/CSV/Markdown, 알려진 제한, 적용 URL과 Orca worktree/branch 정보를 전달한다. 부모 md에도 결과를 복사한다. 필요한 수정은 이 worktree에서 수행하고 기존 부모 변경을 훼손하지 않는다. 작업 중 60초 이상 무소식이 없도록 사용자에게 의미 있는 진행 상황을 알린다.
