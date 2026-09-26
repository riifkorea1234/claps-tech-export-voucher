# CLAPS 백엔드·어드민 개발 플랜

> 작성일: 2026-09-22 · 조사 기준: `7f488bb` 및 현재 작업 트리 · 작업 브랜치: `feature/backend`
>
> 상태(2026-09-24): **Phase 0~6 개발 범위 COMPLETED / Phase 7 실연동 PAUSED / Phase 8~10 독립 기능 검증 완료·전체 IN_PROGRESS / Phase 11 로컬 통합·복구 검증 완료·출시 BLOCKED**. 실제 공급자·운영 출시 게이트는 유지한다. 각 결과 보고서가 실행 증거의 기준이다.

## 1. 목표와 작업 원칙

브라우저 저장소와 목업으로 동작하는 현재 서비스를 실제 인증·DB·파일 저장·AI 처리와 연결하고, 운영자가 간편하게 관리할 수 있는 어드민을 만든다. 최종 결과물은 Docker로 실행하고 배포할 수 있어야 한다.

- 이 파일은 **전체 범위·공통 DB/API 계약·Phase 의존성·최종 검증 기준**을 관리한다. Phase별 작업·검증·복구·인수인계는 `phase{N}-plan.md`에 상세화하고, 실제 실행 증거는 각 Phase 체크리스트와 MD/HTML 결과 보고서에 기록한다.
- 어드민은 기존 Next.js 앱 안에 구현하고, 필요한 목록·검색·상세·수정·재시도 중심으로 구성한다.
- 어드민은 **대시보드·회원·프로젝트·파트너·가이드·작업·모니터링의 7개 메뉴**로 구성한다. 언어 관리는 기존 메뉴의 탭으로 제공한다.
- 초기 지원 언어는 **한국어(`ko`)·영어(`en`)**다. 이미 작성된 프런트의 고정 문구·랜딩 콘텐츠는 별도 언어팩 파일로 추출하고 Git으로 관리한다. DB에는 운영 데이터의 언어별 콘텐츠만 저장하며, 어드민에서는 그 콘텐츠만 입력·업로드·게시한다.
- 새 언어는 언어팩 파일 추가·배포와 DB 언어 등록·콘텐츠 번역 추가로 확장한다. DB schema나 언어별 컬럼 추가는 필요하지 않다.
- DB는 소유권, 관계, 독립적인 조회·수정, 이력 보존이 필요한 단위로 나눈다. 선택지·태그·점수 항목마다 테이블을 만들지 않는다.
- API와 도메인 로직은 현재 저장소에 함께 둔다. 시간이 오래 걸리는 AI·파일 작업만 별도 worker 프로세스로 실행한다.
- Redis, 별도 백엔드 프레임워크, 별도 어드민 서비스, 범용 CMS는 초기 필수 구성으로 추가하지 않는다.
- 데이터·파일 영속화, migration, 백업·복구, worker 재시작을 포함해 Docker에서 검증한다.
- 어드민 요구는 기존 화면에서 발견한 기능이 아니라 서비스 운영을 위해 도출한 제안이다. 현재 사용자 기능과 추가 운영 기능을 구분한다.

사용자의 후속 요청에 따라 단일 파일 운영 방침을 **Phase별 문서 분리 방식으로 변경**한다. [Phase 개발 진행 규칙](phase-development-process-rules.md)을 전체 적용하며 규칙 원문은 수정하지 않는다. 전체 계약은 이 파일에 유지하고, 상세 계획과 실제 구현이 달라지면 해당 Phase 계획과 이 파일의 계약/진행 기록을 함께 갱신한다.

## 2. 조사 결과 요약

### 2.1 실제 현재 상태

- Next.js `16.3.3`, React `19.2.8`, TypeScript, pnpm 기반 프론트엔드다.
- 계정·프로젝트·세션·에셋·탐지 기록은 `localStorage`에 저장된다. 일부 입력은 React 상태에만 남는다.
- 저장소 내 API Route Handler, DB schema/migration, 서버 인증, worker, 어드민 화면, Docker 설정, 자동 테스트 구성이 확인되지 않았다.
- `package.json`에는 `dev`, `build`, `start`, `lint`만 있다.
- `vercel.json`은 프레임워크 선언뿐이다. Docker 실행 구성은 새로 필요하다.
- 로그인 사용자별로 프로젝트·세션·탐지 저장 키가 분리되지 않는다. 동일 브라우저에서 계정을 바꾸어도 같은 데이터에 접근할 수 있는 구조다.
- `HANDOFF.md`의 store 교체 지침은 출발점이다. 실제 연결에는 비동기 화면 상태, 실제 이미지 모델, 서버 상태 전이, 권한 검사도 함께 변경해야 한다.
- `HANDOFF.md`의 lint 경고 19건은 기존 문서의 기록이다. 이번 조사에서 실행해 확인한 수치가 아니다.

### 2.2 조사 범위와 한계

`app/`의 사용자 화면, `components/domain/`, 인증·레이아웃 컴포넌트, `lib/` 저장소와 목업 타입, `README.md`, `HANDOFF.md`, 패키지·배포 설정을 정적으로 조사했다. 아래 파일 경로는 저장소 루트 기준이다.

최초 조사 작업은 브랜치 전환과 문서 작성이며, 후속 작업으로 Phase별 상세 계획을 작성했다. 의존성 설치, 브라우저 실행, lint/build, DB·외부 API·Docker 실행은 하지 않았다. 별도 저장소에 존재할 수 있는 백엔드, AI 엔진, 운영 데이터와 외부 계약은 확인하지 않았다.

### 2.3 기능별 발견 사항과 연결 작업

| ID | 영역·코드 근거 | 현재 동작 또는 공백 | 필요한 작업 |
| --- | --- | --- | --- |
| AUTH-01 | `components/domain/login-email-form.tsx`, `lib/account-store.ts` | 이메일의 로컬 등록 여부만 확인하고 로그인 | 이메일 선입력·신규 비밀번호 가입/기존 비밀번호 로그인, 이메일 소유 확인, 서버 세션·요청 제한 |
| AUTH-02 | `app/login/page.tsx` | 구글·카카오 버튼은 `/projects` 링크 | 실제 OAuth 연결 또는 미지원 버튼 비활성화; 계정 연결 정책 |
| AUTH-03 | `components/domain/forgot-password-form.tsx` | 발송 없이 완료 화면 표시; 비밀번호 입력·재설정 화면 없음 | 실제 재설정 메일·새 비밀번호 입력·현재 비밀번호 확인 후 변경 및 세션 폐기 |
| AUTH-04 | `app/profile-setup/page.tsx`, `profile-setup-form.tsx` | URL의 이메일로 프로필 생성 가능 | 인증된 주체의 프로필만 생성·변경, 미완료 프로필의 진입 제한 |
| AUTH-05 | `my-page-dialog.tsx`, `app-sidebar.tsx` | 프로필 수정·탈퇴·로그아웃은 로컬 처리 | 서버 프로필 저장, 세션 폐기, 탈퇴 시 데이터·파일 정리 정책 |
| AUTH-06 | `app/(app)/layout.tsx` | 로그인 가드 없음 | 페이지 접근 검사와 모든 API의 인증·소유권 검사 |
| PROJ-01 | `projects/page.tsx`, `new-project-dialog.tsx`, `projects-store.ts` | 프로젝트 CRUD·이름/IP 검색·상태 수동 변경·KPI·30건 페이지 처리 | 서버 CRUD, 입력 검증, DB 집계, 검색·정렬·페이지 API |
| PROJ-02 | `projects/[id]/page.tsx`, `projects/[id]/sessions/page.tsx` | 없는 ID에 샘플 이름·헤더 사용; 연결 세션을 로컬 집계 | 실제 상세·세션 조회, 없는 항목 404, 접근 불가 처리, 생성/최종 개수 집계 |
| PROJ-03 | `projects/[id]/page.tsx`, `lib/project-cover.ts` | 업로드 커버는 data URL, 라이브러리는 gradient | 실제 파일 또는 에셋 참조; 수동 커버 > 최근 최종본 > 기본 커버 규칙 유지 |
| GUIDE-01 | `projects/[id]/page.tsx`의 `onPickGuide` | PDF 파일명만 상태에 저장; 새로고침하면 사라짐 | PDF 업로드·다운로드·교체·해제, 추출 작업, 규칙 검토·버전 보존 |
| SESS-01 | `assets/page.tsx`, `lib/assets-store.ts` | 세션 생성·이름 변경·삭제·프로젝트 필터; ID에서 시간 파싱 | 서버 ID/시각, 세션 CRUD, 날짜 그룹, 정렬·페이지 처리 |
| SESS-02 | `assets/[id]/page.tsx`, `verify/page.tsx`, `final/page.tsx` | 제목을 빈 mock 배열 또는 URL에서 조회 | 서버 세션명 통일, 프로젝트 연결·변경 제약, 잘못된 ID 처리 |
| GEN-01 | `asset-workspace-body.tsx`의 `generate` | 임의 점수와 gradient 4개 생성 | 생성 공급자 연결, 프로젝트/IP/가이드/스타일/비율/프롬프트 전달 및 저장 |
| GEN-02 | `asset-workspace-body.tsx` | 프롬프트 textarea가 생성 로직에 연결되지 않음; 스타일도 출력에 미반영 | 제어 입력과 서버 검증, 요청별 설정 snapshot, 실제 이미지·크기 반환 |
| GEN-03 | `asset-result-card.tsx`, `image-lightbox.tsx` | CSS placeholder 렌더링, 고정 '가이드 통과', 더보기 무동작 | 실제 이미지 표시, 실제 검사 상태, 더보기 동작 확정 또는 제거 |
| GEN-04 | `asset-workspace-body.tsx`, `session-assets-store.ts` | 채택·검증 이동·생성 목록 전체 비우기는 배열 저장 | 에셋별 채택 API, 검증 요청 생성, 삭제 영향 확인과 참조 정합성 |
| VERIFY-01 | `lib/mock/verify.ts`, `assets/[id]/verify/page.tsx` | 임의 점수 0.88 기준 판정, 고정 규칙·가이드 이름 | 버전이 고정된 규칙 평가, 항목별 근거·판정·오류, 재검증 |
| VERIFY-02 | `verify/page.tsx`, `final/page.tsx` | 최종본 선택·취소를 배열 복사로 저장 | 서버에서 통과 여부 검증, 중복 확정 방지, 최종본 취소·라이브러리 반영 |
| FILE-01 | `verify/page.tsx`, `final/page.tsx`, `projects/[id]/page.tsx` | PNG/선택 다운로드 버튼 무동작 | 단일 다운로드, 선택 ZIP 내보내기, 파일 권한 검사·만료·대용량 처리 |
| FILE-02 | `final/page.tsx` | 최신순 버튼 무동작 | 확정 시각 기준 실제 정렬; 에셋 원본·미리보기 표시 통일 |
| MATCH-01 | `partners/criteria/page.tsx` | 참조 이미지·칩 추가·저장 버튼에 저장 기능 없음 | 폼 상태·검증·파일 첨부, 기준 저장·복원, 저장 후 추천 실행 |
| MATCH-02 | `partners/page.tsx`, `lib/mock/partners.ts` | 고정 10개 후보; 재매칭은 애니메이션 재실행 | 운영 파트너 데이터, 추천 실행·점수·근거 저장, 항목별 정렬·재추천 |
| MATCH-03 | `partners/page.tsx` | 협업 요청은 이메일 표시·복사 | 확인된 연락처 제공; 인앱 요청/자동 발송은 기본 범위에 추가하지 않음 |
| MON-01 | `monitoring/[id]/page.tsx`의 `detect` | 타이머 진행률, 홀수 회차 고정 8건/짝수 회차 0건 | 실제 이미지 탐지 공급자, 비동기 처리, 진행·실패·결과 없음 구분 |
| MON-02 | `monitoring/[id]/page.tsx`, `monitoring-store.ts` | 업로드 이미지는 320px 썸네일만 보관; 라이브러리는 gradient | 원본과 썸네일 별도 보존, 기준 이미지/에셋 참조, 탐지 이력 |
| MON-03 | `monitoring/page.tsx`, `monitoring-store.ts` | 조회·이름 변경·삭제·20건 페이지; 연도 없는 문자열 날짜 정렬 | 서버 검색·정렬·페이지, UTC 일시, 첫/최근 탐지 시각, 재탐지 이력 유지 |
| MON-04 | `monitoring/[id]/page.tsx` | 결과 이미지 placeholder, URL 앞에 `https://` 일괄 추가 | 실제 thumbnail·정규화 URL·발견 시각·유사도·출처, 안전한 외부 링크 |
| UI-01 | 모든 store 호출 화면 | 동기 로딩, 실패 무시, 일부 전체 배열 덮어쓰기 | 로딩/빈 결과/오류/권한 없음 분리, 재시도·중복 제출 방지·충돌 처리 |
| UI-02 | `app-header.tsx`, `auth-shell.tsx`, `app/page.tsx` | 앱·인증 화면 우측 상단 언어 버튼 무동작; 랜딩에는 언어 선택 없음 | 앱·인증 화면 기존 버튼 연결, 랜딩 시작하기 옆 선택기 추가, 모바일에서도 노출; footer 링크 정리 |
| I18N-01 | 사용자 추가 요구; 현재 전역 한국어 문구·목업 표시명 | 언어팩 파일·DB 콘텐츠 번역 구조 없음 | 기존 프런트 문구를 ko/en 파일로 추출, DB 운영 콘텐츠만 어드민 번역, fallback·누락 검증 |
| OPS-01 | 저장소 전체 | 운영자 화면·권한·감사 이력 없음 | 아래 최소 어드민 구현 |
| OPS-02 | 패키지·배포 설정 | DB·파일 보관·작업 큐·Docker·테스트 없음 | 공통 서버 기반, Docker Compose, migration·백업·테스트·운영 문서 |

## 3. 권장 구현 구조

### 3.1 하나의 앱과 작은 worker

```text
사용자 / 운영자 브라우저
           │ HTTPS
           ▼
 web: Next.js (사용자 화면 + /admin + /api)
           ├── PostgreSQL (업무 데이터 + 서버 세션 + 작업 큐)
           └── 파일 저장 adapter (초기: 영속 볼륨)

 worker: 같은 저장소의 별도 실행 프로세스
           ├── PostgreSQL 작업 획득·상태 갱신
           ├── 생성 / PDF 추출 / 검증 / 추천 / 탐지 adapter
           └── 이미지·PDF·ZIP 저장

 migrate: 배포 시 한 번 실행하는 DB migration 작업
```

- Next.js Route Handler는 인증, 입력 검증, 서비스 호출, 응답을 담당한다.
- 서비스 계층은 소유권·상태 전이·트랜잭션을 담당한다. worker도 같은 도메인 규칙을 사용한다.
- 서버 전용 코드를 클라이언트 번들에서 가져오지 않도록 경계를 둔다.
- DB는 PostgreSQL 17.11, ORM/migration은 Drizzle로 확정했다. 고정 버전과 호환성 조사 범위는 9.2절을 따른다.
- 작업 큐는 jobs 테이블과 PostgreSQL 트랜잭션/행 잠금으로 구현한다(Phase 5). 별도 DB 큐 라이브러리/중복 큐 테이블은 도입하지 않는다.
- 작업 상태 조회는 우선 polling으로 구현한다. 실시간 소켓은 필요성이 확인된 이후 검토한다.
- 초기 파일 저장은 `web`과 `worker`가 공유하는 영속 볼륨이다. 다중 서버가 필요해지면 같은 adapter 인터페이스로 객체 저장소를 연결한다.
- 이 기본안은 단일 호스트 운영을 전제로 한다. 다중 호스트 확장 시 로컬 공유 볼륨 전제를 먼저 해소한다.

### 3.2 인증·소유권 기본안

- **이메일·비밀번호 인증 + 서버 세션**으로 확정했다(2026-09-22 사용자 정정). 이메일 입력 후 미가입자는 비밀번호 설정·회원가입 화면, 기존 회원은 비밀번호 로그인 화면으로 진행한다.
- Phase 3에서 회원가입·비밀번호 로그인·찾기/재설정·변경을 구현한다. 이메일 소유 확인은 가입 후 확인 링크로 유지하며 OTP 로그인은 도입하지 않는다. 현재 UI에 없는 화면은 새로 구현하며 상세 경계는 6.6절을 따른다.
- 구글·카카오는 사용할 공급자와 앱 등록 정보가 준비된 항목만 실제 연결한다. 이메일이 같다는 이유만으로 외부 계정을 자동 병합하지 않는다.
- 검증된 인증 라이브러리를 우선 사용하고, 필요한 session/token/provider 테이블은 해당 라이브러리 규약을 따른다. 세션·토큰을 단순화 목적으로 `users` JSON에 몰아넣지 않는다.
- 최초 범위는 개인 계정 소유다. `org`는 프로필의 조직명이며 같은 조직명을 쓴 사용자가 자동으로 데이터를 공유하지 않는다.
- 업무 화면의 `role`은 업종/직무다. 서버 권한인 `member/admin`과 분리해 `job_role`, `app_role`로 관리한다.
- 운영자도 같은 로그인 체계를 사용한다. 최초 운영자 지정은 명시적 관리 명령으로 수행하고, 공개 API나 프로필 수정으로 승격되지 않게 한다.
- 어드민 페이지 검사뿐 아니라 모든 관리 API와 파일 접근에서 서버 권한을 검사한다. 운영자 계정에는 지원 가능한 추가 인증을 적용한다.

## 4. 간편 어드민 설계

별도 디자인 시스템을 만들지 않고 기존 UI 컴포넌트를 재사용한다. **사이드바 7개 메뉴**, 목록에서 검색하고 상세 drawer/페이지에서 처리하는 형태를 기본으로 한다. 메뉴 분리는 탐색 편의를 위한 것이며 같은 업무 데이터를 중복 저장하지 않는다.

| 메뉴 | 기본 화면 | 필요한 동작 | 불필요하게 늘리지 않을 부분 |
| --- | --- | --- | --- |
| 대시보드 `/admin` | 사용자·프로젝트 수, 대기/실패 작업, 기간별 사용량; 감사 기록·언어 현황 탭 | 요약 조회, 배포된 언어팩 준비 상태·DB 콘텐츠 번역 누락 확인, 언어 등록/활성화 | UI 언어팩 업로드/편집기, 별도 통계 플랫폼, 범용 CMS |
| 회원 `/admin/users` | 이메일·이름·조직명·가입일·상태 목록, 상세 | 검색, 이용 중지/해제, 세션 폐기, 관련 프로젝트·작업 확인 | 조직/부서/직무별 복잡한 권한 편집기 |
| 프로젝트 `/admin/projects` | 프로젝트 목록, 상세에 세션·에셋·최종본과 가이드 링크 | 정보 수정, 보관/복구, 검증 상세, 연결 가이드·작업으로 이동 | 세션·파일마다 별도 메뉴 |
| 파트너 `/admin/partners` | 파트너/IP 목록, 상세 폼·언어별 번역 탭 | 등록·수정·공개/비공개, 이미지·연락처·매칭 메타·번역 관리 | 영업 CRM, 협업 메시지 시스템 |
| 가이드 `/admin/guides` | 프로젝트별 가이드 목록, 규칙·버전·번역 탭 | PDF·추출 결과 확인, 규칙 수정·게시, 설명 번역, 검증/추출 재실행 요청 | 규칙마다 별도 화면·메뉴 |
| 작업 `/admin/jobs` | 생성·추출·검증·추천·탐지·내보내기 작업 목록 | 종류/상태/기간 필터, 오류 요약, 재시도·취소, 사용량·공급자 상태 | 자체 스케줄러 편집기, 별도 큐 운영 서비스 |
| 모니터링 `/admin/monitoring` | 탐지 기록·발견 이미지/URL·유사도·실행 이력 | 사용자/프로젝트 검색, 결과 상세, 재탐지 요청, 관련 job으로 이동 | 자동 신고·법적 판정·침해 조치 workflow |

작업 메뉴는 실행 상태와 장애 복구를, 모니터링 메뉴는 탐지 결과와 이력을 관리한다. 가이드의 의미·판정을 바꾸는 수정은 새 가이드 버전으로, 표시 문구 번역은 언어별 콘텐츠로 관리한다. 언어별 편집 폼은 공통 컴포넌트를 사용한다.

공통 동작:

- 검색·필터·페이지네이션·저장 성공/실패·필수값 검증을 공통화한다.
- 삭제는 우선 보관/비활성화로 처리하는 안을 제안한다. 영구 삭제와 보존 기간은 정책 확정 후 적용한다.
- 개인정보·사용자 원본 파일을 처음부터 목록에 모두 노출하지 않는다. 필요한 상세 접근도 감사 대상으로 정한다.
- 변경 작업에는 대상, 실행자, 시각, 변경 필드, 사유를 남긴다. 비밀번호·토큰·원본 파일 전문은 감사 로그에 저장하지 않는다.
- 실패 작업 재시도는 원본 작업과 연결하고 새 시도 기록을 남긴다. 중복 실행·중복 비용 위험을 표시한다.
- 공급자 API 키는 환경변수/secret로 관리한다. 초기 어드민에 API 키 입력창이나 secret 조회 기능을 만들지 않는다.
- 사용량은 요청 수·성공/실패·생성 이미지 수 등을 우선 집계한다. 공급자 비용 데이터가 없으면 금액을 추정해 확정 비용처럼 표시하지 않는다.
- 검증 결과를 운영자가 임의로 '통과'로 덮어쓰는 기능은 기본 범위에서 제외한다. 필요한 경우 원본 판정과 수동 결정·사유·담당자를 분리하는 별도 정책을 추가한다.

## 5. DB 설계: 업무 9개 + 다국어 공통 2개 테이블

업무 테이블 9개에 **언어 목록과 공통 번역 저장소 2개**를 추가한 11개를 기본안으로 한다. 인증 라이브러리의 필수 테이블과 migration 메타데이터는 별도다. 언어별 테이블, `name_ko/name_en` 같은 언어별 컬럼, 번역 필드별 테이블은 만들지 않는다. 메뉴 수와 테이블 수를 맞추지 않는다.

### 5.1 테이블과 책임

| 테이블 | 주요 필드·관계 | 분리 이유 / JSONB로 유지할 항목 |
| --- | --- | --- |
| `users` | id, email, name, org_name, job_role, app_role, status, timestamps | 인증 주체·소유권의 기준. 개인 매칭 기준과 화면 설정은 검증된 `preferences` JSONB |
| `projects` | id, owner_id → users, name, ip_name, partner_id → partners(nullable), status, description, cover, active_guide_id → brand_guides(nullable), version, timestamps, archived_at | 프로젝트 단위 권한·검색·집계. 직접 입력 IP와 파트너 미정을 허용. 커버 메타는 JSONB |
| `partners` | id, name, contact_email, visibility, profile JSONB, timestamps | 운영자가 독립 관리하는 추천 후보. IP 메타·태그·통계·이미지 메타는 JSONB, 점수는 고정 master 값으로 저장하지 않음 |
| `asset_sessions` | id, owner_id → users, project_id → projects(nullable), title, timestamps, archived_at | 세션 이름·목록·연결·삭제가 독립 동작. 생성 시 프로젝트 연결 필수 |
| `assets` | id, session_id → asset_sessions, generation_job_id → jobs, file JSONB, adopted, verification_job_id → jobs(nullable), verification JSONB, finalized_at, finalized_guide_id → brand_guides(nullable), version, timestamps, deleted_at | 실제 에셋과 채택·최종 여부의 단일 원본. 검증 항목 배열은 JSONB |
| `brand_guides` | id, project_id → projects, version, file JSONB, rules JSONB, status, extraction_job_id → jobs(nullable), timestamps | 가이드 교체 후에도 과거 결과가 사용한 버전을 참조해야 하므로 별도 관리 |
| `jobs` | id, owner_id → users, project_id → projects(nullable), kind, status, schema_version, input/output JSONB, provider, provider_request_id, idempotency_key, attempt, retry_of_id, next_run_at, lease_until, locked_by, error_code, error_summary, usage JSONB, timestamps | 생성·추출·검증·추천·탐지·내보내기의 공통 큐와 실행 이력. 종류마다 작업 테이블을 만들지 않음 |
| `monitoring_records` | id, owner_id → users, name, source_asset_id → assets(nullable), source_file JSONB, latest_job_id → jobs(nullable), first_scanned_at, last_scanned_at, latest_result_count, timestamps, archived_at | 사용자가 이름 변경·재탐지·삭제하는 대상. 각 실행의 결과는 jobs.output에 저장 |
| `admin_audit_logs` | id, actor_id → users(nullable), action, entity_type, entity_id, changes JSONB, reason, request_id, created_at | 업무 데이터 변경과 별개로 남기는 감사 이력. 보존·열람 정책을 별도로 적용 |
| `locales` | code(PK), native_name, display_name, enabled, fallback_code → locales(nullable), direction, sort_order, timestamps | `ko/en` 초기 등록, 새 언어는 행 추가로 확장. code는 검증된 BCP 47 언어 태그 문자열이며 고정 DB enum을 사용하지 않음 |
| `localized_contents` | id, resource_type, resource_key, locale_code → locales, source_revision, draft JSONB, published JSONB(nullable), version, published_at, updated_by → users, timestamps | 파트너·가이드 등 DB 운영 콘텐츠의 언어별 필드 묶음. 초안/게시본 분리; UI 언어팩·고정 랜딩 문구 저장 제외 |

`file` JSONB의 공통 구조는 `storageKey`, `originalName`, `mimeType`, `size`, `width/height`, `checksum`, `thumbnailKey` 정도로 제한한다. data URL이나 파일 본문, 임의 외부 경로를 DB에 넣지 않는다. 초기에는 파일의 소유 업무 레코드가 메타를 보유하므로 별도 `files` 테이블을 만들지 않는다.

커버는 `{ kind: 'upload', file: ... }` 또는 `{ kind: 'asset', assetId: ... }`처럼 형태를 검증한다. JSON 안의 에셋 참조는 DB FK가 아니므로 서비스에서 소유권·존재를 검사하고, 삭제 시 참조 정리 검증을 둔다. 참조 관계가 늘면 해당 FK 컬럼으로 승격한다.

### 5.2 과도하게 분리하지 않을 데이터

| 데이터 | 초기 저장 방식 | 분리 검토 조건 |
| --- | --- | --- |
| 업종/직무, 스타일, 비율, 상태 표시명 | 언어에 무관한 코드 enum·설정 + 표시명 언어팩 파일 | 운영자가 선택 항목 자체를 자주 변경해야 하는 확정 요구가 생길 때 |
| 추천 기준·세계관·콜라보 이력 | users.preferences의 matching JSONB | 프로젝트별 기준이나 다중 프로필이 필요할 때 |
| 파트너별 IP 정보·시장 메타 | partners.profile JSONB | 한 파트너의 다수 IP에 독립 권한·계약·검색이 필요할 때 |
| 가이드의 검증 규칙 | 버전별 brand_guides.rules JSONB | 규칙을 여러 가이드가 공유하고 독립 수정해야 할 때 |
| 에셋 검증 항목·근거 | assets.verification과 jobs.output | 규칙별 대량 통계·독립 처리 이력이 필요할 때 |
| 추천 후보·점수·설명 | 추천 jobs.output | 개별 후보의 장기 분석·피드백이 요구될 때 |
| 탐지 결과 URL·이미지·유사도 | 탐지 jobs.output의 결과 배열 | 결과별 조치 상태, 대량 검색/페이지 조회, 장기 통계가 필요할 때 |

JSONB는 스키마 버전·입력 검증·크기 제한을 가진다. 권한 기준, 목록 필터, 상태·시각·FK는 일반 컬럼에 둔다. 목록 API는 큰 input/output JSON을 반환하지 않는다. 탐지 결과 배열의 최대 개수·용량은 공급자 확인 후 정하며, 한 실행 결과를 계속 무제한 누적하지 않는다.

### 5.3 다국어 데이터 관계

- `localized_contents`는 `(resource_type, resource_key, locale_code)` 유일성을 둔다. `partner/<id>/en`, `guide/<version-id>/en`처럼 DB 운영 리소스의 언어별 필드 묶음만 저장한다. `ui`, `email`, 고정 `landing` 유형은 이 저장소의 허용 대상이 아니다.
- `resource_type`과 허용 필드는 코드 계약으로 제한한다. 여러 종류를 가리키는 resource_key는 일반 FK로 보장할 수 없으므로 서버에서 리소스 존재·권한을 확인하고 삭제 정리 및 고아 레코드 검사를 수행한다. 번역 ID를 안다고 원본 권한을 우회할 수 없다.
- `ko`는 초기 기본 언어이고 `en`의 fallback은 `ko`다. fallback 순환·자기 참조·미등록 언어를 금지한다. 기본 언어는 운영 중 삭제/비활성화할 수 없으며 다른 언어도 기본은 비활성화하여 데이터를 보존한다.
- `partners.name/profile`, `brand_guides.rules` 등은 원본 데이터와 계산·규칙의 기준이다. 한국어를 포함한 표시 번역은 localized_contents에서 관리하며, 숫자·연락처·URL·규칙 조건을 번역 레코드로 복제하지 않는다.
- 파트너 이름/설명 등 기준 원문은 기본 언어 편집을 통해 원본과 기본 언어 게시본을 같은 트랜잭션에서 동기화한다. source_revision은 리소스별로 관리해 원문이 바뀌면 다른 언어의 번역 갱신 필요 상태를 계산한다.
- 가이드 번역은 규칙 ID별 제목·설명만 바꾼다. 규칙 의미나 조건이 달라지면 새 가이드 버전과 번역 레코드를 만든다. 번역 저장이 판정 기준을 몰래 바꾸지 않게 한다.
- 공개·사용자 응답은 `published`만 조회한다. 관리자 저장은 `draft`, 게시는 검증 후 `published`의 원자적 교체와 version 증가로 처리한다. 게시 실패 시 기존 게시본은 유지한다.
- 사용자 작성 프로젝트명·프롬프트·업로드 원문은 입력 언어 그대로 보존한다. 화면 언어 변경으로 원본을 번역/덮어쓰기하지 않는다. 원본 언어는 해당 메타에 기록할 수 있다.
- 회원 언어 설정은 `users.preferences.locale`, worker 출력 언어는 `jobs.input.outputLocale`에 보관한다. 작업 진행 중 화면 언어를 바꾸어도 원래 출력 언어와 근거는 유지한다.

### 5.4 무결성·인덱스·삭제

- email 정규화·유일성, 프로젝트 내 가이드 버전 유일성, 작업 멱등성 키의 owner/kind 범위 유일성을 둔다.
- 기본 인덱스는 소유자+갱신 시각, 프로젝트+세션 생성 시각, 세션+에셋 생성/최종 시각, 작업 상태+실행 예정 시각, 감사 시각이다. 실제 조회를 근거로 추가한다.
- `owner_id`와 연결된 프로젝트/세션 소유자가 일치하는지 트랜잭션에서 검증한다. 사용자 입력의 owner_id를 신뢰하지 않는다.
- 생성·검증·최종본을 서로 다른 에셋 테이블/배열로 복제하지 않는다. `assets` 한 레코드의 채택·검증·최종 상태로 표현한다.
- 날짜는 DB의 시간대 포함 timestamp와 API의 UTC ISO 8601을 사용한다. 화면의 한국어 상태·상대시간·날짜 그룹은 표시 계층에서 만든다.
- 프로젝트 업무 상태와 AI job 상태를 분리한다. 사용자가 프로젝트를 '완료'로 바꿔도 반려된 이미지가 최종본으로 승인되지 않는다.
- 프로젝트/세션 보관 시 실행 중 job의 신규 결과 반영을 차단하거나 정해진 취소 정책으로 정리한다. 삭제된 대상에 늦은 callback이 데이터를 되살리지 않게 한다.
- 파일은 DB 트랜잭션으로 함께 삭제할 수 없으므로 삭제 예약·정리 작업으로 처리한다. 임시 업로드, 실패 생성물, ZIP에는 만료/정리 규칙을 둔다.
- 과거 검증의 가이드·job·파일 참조가 남아 있는 동안 무조건 cascade 삭제하지 않는다. 탈퇴·영구 삭제·감사 보존의 충돌은 정책으로 해결한다.
- 브라우저 목업 데이터는 실제 계정 소유를 증명할 수 없다. 자동으로 서버 데이터에 합치지 않고 기본은 신규 시작한다. 이관이 필요하면 별도 소유 확인·미리보기·중복 방지 절차를 설계한다.

### 5.5 Phase 0 데이터 계약 (2026-09-22)

아래는 9.1절 기반 결정에 따른 **확정 설계 계약**이다. SQL 실행·migration 생성·런타임 검증 증거는 아니다. 11개 기본 테이블의 책임은 5.1절을 유지한다.

#### 인증 테이블 및 누락 컬럼

Better Auth의 `user` 모델은 기존 `users`에 매핑하고 별도 회원 테이블로 복제하지 않는다. `email_verified`, `image`, `profile_completed_at`를 추가한다. 프로필 미완성 가입이 가능하도록 `org_name/job_role`은 nullable, `name`은 내부 임시 표시명 허용 후 프로필 완료 시 실명/표시명 입력 검증한다. 애플리케이션 역할 `member/admin`과 직무 `job_role`을 분리한다.

| 추가 테이블 | 계약 | 제약·조회 |
| --- | --- | --- |
| `auth_sessions` | 라이브러리 session 모델: id, user_id, token, expires_at, ip_address(nullable), user_agent(nullable), created_at, updated_at | user FK, token UNIQUE, user_id·expires_at 인덱스; API에 token 노출 금지 |
| `auth_accounts` | account 모델: id, user_id, provider_id, account_id, 라이브러리 password hash/token 필드와 만료·timestamps | user FK, (provider_id, account_id) UNIQUE; credential provider에 라이브러리 hash 저장; 원문 비밀번호 저장 금지 |
| `auth_verifications` | verification 모델: id, identifier, value, expires_at, created_at, updated_at | identifier·expires_at 인덱스; 이메일 확인/비밀번호 재설정용 일회성 증거; 값·토큰 로그 금지 |

11 + 3 = 14개 설계 테이블이다. migration 메타데이터 및 Phase 3 추가 인증 플러그인/DB rate-limit 저장 테이블은 별도다. 정확한 타입·기본값·plugin 필드는 Phase 1에서 **고정 버전**의 생성 schema와 비교한다. 인증 middleware만으로 업무 권한을 보장하지 않는다. 탈퇴/정지 시 DB 상태를 각 요청에서 검사하고 세션을 폐기한다.

라이브러리 sign-up에 필요한 name은 서버에서 고정 임시 표시명으로 채우고 profile_completed_at은 null로 둔다. 클라이언트가 이를 프로필 완료로 조작할 수 없다. 가입 화면은 이메일·비밀번호 입력만으로 계정을 생성하며, 이메일 확인 및 후속 프로필 단계에서 이름·조직명을 받는다.

동시성/원문 추적을 위해 `users`, `asset_sessions`, `partners`, `monitoring_records`, `locales`에 정수 `version`(초기 1)을 추가한다. `partners`, `brand_guides`에 `source_revision`을 추가한다. 가이드의 `version`은 프로젝트 내 게시 이력 번호이며 초안 편집 충돌용 `row_version`과 구분한다. `jobs`에는 요청 내용 비교용 `request_hash`와 시작/종료 시각, `cancel_requested_at`를 둔다. `retry_of_id`는 jobs 자기 FK, 원 요청 멱등성 키 재사용 없이 새로운 시도 키를 부여한다.

#### 관계·제약·생성 순서

- ID는 서버 발급 불투명 문자열(text PK), 시간은 `timestamptz`; 인증 라이브러리 ID와 업무 FK 타입을 일치시킨다. DTO에서 클라이언트 제공 owner/role/timestamps는 거절한다.
- `users.email`은 trim/lowercase한 값에 UNIQUE. Gmail 점/별칭 제거 같은 공급자별 정규화는 하지 않는다.
- 순서: users/locales/partners → projects(active_guide FK 제외) → asset_sessions/jobs → brand_guides → assets → monitoring_records → 감사/번역/인증 테이블 → 순환 FK 추가. jobs 자기 FK는 테이블 생성 후 추가해도 된다.
- `brand_guides(project_id, version)` UNIQUE. `brand_guides(project_id, id)` UNIQUE와 projects의 `(id, active_guide_id)` 복합 FK로 다른 프로젝트 가이드를 활성화하지 못하게 한다. active_guide_id만 nullable이며 게시 상태는 서비스 트랜잭션에서 확인한다.
- `projects(id, owner_id)` UNIQUE와 asset_sessions/jobs의 `(project_id, owner_id)` FK로 개인 소유 일치를 보장한다. project_id가 없는 초안 세션·추천 job은 허용한다. 에셋 소유는 세션에서 유도한다. asset의 generation/verification job과 가이드의 프로젝트 일치는 서비스 트랜잭션에서 검증한다.
- 기본 FK는 RESTRICT/NO ACTION. 데이터 보존 의미가 확정되기 전 cascade 영구 삭제를 도입하지 않는다. 감사 actor는 nullable이며 계정 익명화/삭제 시 처리 방식은 보존 정책 확정 후 구현한다.
- `jobs(owner_id, kind, idempotency_key)` UNIQUE(키 있는 요청에 적용), `localized_contents(resource_type, resource_key, locale_code)` UNIQUE. locale fallback FK + 서비스에서 전체 경로 순환 검증. 다형 resource_key 및 JSON 내 참조는 서비스 검증과 정리 검사 대상이다.
- 인덱스: projects/asset_sessions/monitoring_records `(owner_id, updated_at, id)`; 세션 `(project_id, created_at, id)`; 에셋 `(session_id, created_at, id)` 및 `(session_id, finalized_at, id)`; jobs `(status, next_run_at, id)`, `(status, lease_until)`, `(owner_id, created_at, id)`; 감사 `(created_at, id)`와 `(entity_type, entity_id, created_at)`.
- 보관/탈퇴와 worker 완료는 같은 대상 행 잠금을 사용한다. worker가 파일을 만들어도 대상이 비활성이면 결과 연결을 거절하고 정리 대상으로 기록한다. 보존 기간 미정은 무기한 보존 승인이나 즉시 삭제 승인으로 해석하지 않는다.

#### JSONB·seed·파일 계약

| JSONB | 최소 계약 / 검증 책임 |
| --- | --- |
| users.preferences | schemaVersion, locale, matching; 허용 key만 수용, role/owner 수정 금지 |
| file | schemaVersion, storageKey, originalName, mimeType, size, checksum; 이미지 width/height 및 thumbnailKey 선택. 저장 키는 서버 전용, DTO는 권한 검사 다운로드 경로로 변환 |
| cover | default / upload(file) / asset(assetId) 판별 union. 참조 에셋의 소유권 및 삭제 시 기본 커버 복귀 확인 |
| partners.profile | schemaVersion, 원본 소개·태그·IP/이미지 메타; 점수는 job output에서만 조회 |
| brand_guides.rules | schemaVersion, 고정 ruleId와 조건·근거 위치. 게시 후 규칙 수정은 새 가이드 버전 |
| assets.verification | schemaVersion, verdict, ruleResults, guideId, jobId, engineVersion, checkedAt; 서버가 성공 job에서만 생성 |
| jobs.input/output | schemaVersion와 kind별 discriminated union; 요청 snapshot·outputLocale 고정, 큰 결과는 목록 응답에서 제외 |
| monitoring source_file | file 계약; 원본과 썸네일 구분. source_asset_id 또는 source_file 중 하나를 생성 시 필수 선택 |
| admin_audit_logs.changes | schemaVersion, 변경 필드 allowlist·전후 요약; secret·원문·인증 값 제외 |
| localized_contents.draft/published | resource_type별 허용 표시 필드·ruleId; 원문 revision과 게시 revision 분리, 규칙 조건/연락처/URL 변경 금지 |

알 수 없는 필드·schemaVersion·잘못된 union은 거절한다. 공통 metadata JSON 요청 상한은 64 KiB이며 multipart 및 provider output의 별도 상한은 9.3절 D-07에서 결정한다. 숫자 필드는 유한값/범위, 문자열은 길이, 배열은 개수 제한을 Phase 1의 schema에 명시한다. 파일 바이너리/data URL과 임의 경로를 JSONB에 저장하지 않는다.

seed는 ko/en 및 fallback만 멱등 등록하며 최초에는 enabled=false다. Phase 2 파일팩 검증 후 기본 ko와 en을 활성화하고 그 이후 ko 비활성화를 금지한다. 운영 게시값을 재시드로 덮어쓰지 않는다. 개발 fixture는 운영 seed와 분리한다. 최초 관리자 생성은 공개 가입 role 입력으로 제공하지 않고, 운영자가 지정한 검증된 사용자에 대해 감사되는 별도 bootstrap 절차를 Phase 3에서 제공한다.

## 6. 백엔드와 사용자 화면 구현 범위

### 6.1 공통 API 계약

- `/api` 아래에 사용자 API와 `/api/admin` 관리 API를 둔다. 아래 경로는 초안이며 선택한 인증 라이브러리의 경로 규약은 따른다.
- 성공 응답은 단건 `data`, 목록 `data + pagination`, 오류는 `error.code/message/fieldErrors/requestId` 형태로 통일한다.
- 인증 실패, 접근 거절/없는 객체, 검증 실패, 상태 충돌, 사용량 초과, 공급자 장애를 구분한다. 민감한 존재 여부나 내부 예외는 공개하지 않는다.
- 일반 목록은 page/pageSize, 정렬·검색 허용 목록, pageSize 상한을 둔다. 작업 결과가 크면 별도 결과 조회에서 필요한 범위만 반환한다.
- 변경 요청은 인증·소유권·서버 입력 검증을 통과해야 한다. 쿠키 인증에는 CSRF 방어와 허용 origin 검사를 적용한다.
- 과금 가능한 job 생성은 idempotency key를 사용한다. 재전송과 명시적인 재실행을 구분한다.
- 비동기 요청은 `202 + jobId`를 반환하고 상태 API에서 진행 단계·결과·실패를 확인한다. UI가 시간 경과만으로 성공을 결정하지 않는다.
- 전체 목록 덮어쓰기를 제거하고 대상별 변경 API를 사용한다. 충돌 가능한 편집은 version 조건으로 갱신한다.
- API의 상태·오류 code·enum은 언어에 무관한 고정 식별자를 사용한다. 선택 언어는 검증된 요청 locale로 전달하고, 콘텐츠 응답에는 요청 언어와 실제 제공 언어/fallback 여부를 포함한다. 캐시는 locale과 게시 version을 구분한다.

| 영역 | API 초안 | 핵심 동작 |
| --- | --- | --- |
| 인증 | `POST /api/auth/email/lookup`, `/api/auth/sign-up/email`, `/api/auth/sign-in/email`, `/api/auth/sign-out` | 이메일 분기·비밀번호 가입/로그인·세션 폐기; lookup은 nextStep만 반환, 상세 경로/응답은 6.6절 |
| 소셜 | `/api/auth/{provider}/...` | 선택한 인증 라이브러리의 시작·callback, state 검증, 계정 연결 |
| 내 정보 | `GET/PATCH/DELETE /api/me` | 프로필·매칭 설정·탈퇴 정책; 권한 필드 수정 금지 |
| 프로젝트 | `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:id` | 검색·페이지·CRUD·보관, version 충돌 처리 |
| 프로젝트 집계 | `GET /api/projects/stats`, `GET /api/projects/:id/library` | 필터 정의에 맞는 KPI와 최종본 목록 |
| 가이드 | `GET/POST /api/projects/:id/guides`, `GET /api/guides/:id`, `DELETE /api/projects/:id/guide` | 버전 조회·추출 요청·현재 가이드 연결 해제; 과거 버전 보존 |
| 세션 | `GET/POST /api/asset-sessions`, `GET/PATCH/DELETE /api/asset-sessions/:id` | projectId·검색·정렬·페이지, 이름·프로젝트 연결 |
| 생성 | `POST /api/asset-sessions/:id/generations` | 생성 설정 snapshot, 가이드/IP 검사, 비동기 이미지 생성 |
| 에셋 | `GET /api/asset-sessions/:id/assets`, `PATCH/DELETE /api/assets/:id` | 목록, 채택·취소, 삭제 영향 검사 |
| 검증 | `POST /api/asset-sessions/:id/verifications`, `GET /api/assets/:id/verification` | 채택된 에셋 검사, 결과·근거·가이드 버전 |
| 최종본 | `PUT/DELETE /api/assets/:id/finalization` | 통과 에셋 확정/취소; 클라이언트가 전달한 판정 불신 |
| 업로드/다운로드 | `POST /api/uploads`, `GET /api/files/:token`, `POST /api/exports` | 용도별 업로드 ticket, 권한 확인 다운로드, 선택 ZIP 작업 |
| 파트너 | `GET /api/partners`, `GET /api/partners/:id` | 공개된 실제 카탈로그·연락처 |
| 추천 | `GET/PUT /api/me/matching-criteria`, `POST /api/matches`, `GET /api/matches/latest` | 기준 저장·복원, 추천 실행·최근 결과·점수 정렬 |
| 모니터링 | `GET/POST /api/monitoring-records`, `GET/PATCH/DELETE /api/monitoring-records/:id` | 기록 생성·검색·상세·이름·보관 |
| 재탐지 | `POST /api/monitoring-records/:id/scans`, `GET /api/monitoring-records/:id/scans` | 새 실행 추가·실행별 결과 조회, 최근 요약 갱신 |
| 작업 | `GET /api/jobs/:id`, `POST /api/jobs/:id/cancel` | 소유 작업의 상태·안전한 오류·취소 |
| 어드민 | `/api/admin/overview`, `/users`, `/projects`, `/partners`, `/jobs`, `/guides`, `/monitoring-records`, `/audit-logs` | `/api/admin` 접두사를 공유하는 7개 메뉴·감사 조회/변경 API |
| 지원 언어 | `GET /api/locales` | 활성 DB 언어와 배포된 파일 언어팩이 모두 준비된 언어 목록; UI 언어팩은 파일 로더 사용 |
| 언어 설정 | `PATCH /api/me/preferences`, `POST /api/locale` | 회원 선호 언어 저장, 비회원도 검증된 locale cookie 설정 |
| 언어 관리 | `GET/POST /api/admin/locales`, `PATCH /api/admin/locales/:code` | 언어 등록·표시명·순서·fallback·활성화 |
| 콘텐츠 번역 | `GET/PUT /api/admin/localized-contents/:type/:key/:locale` | 리소스별 초안·게시본·원문 revision 조회, 권한·필드별 schema 검증 |
| DB 콘텐츠 번역 게시·업로드 | `POST /api/admin/localized-contents/import-preview`, `/import`, `/publish`, `GET /api/admin/localized-contents/export` | 경로는 `/api/admin/localized-contents` 기준; 업무 콘텐츠 JSON 검증·차이 확인·초안 반영·게시; UI 언어팩 입력 거절 |

업로드 ticket은 용도·소유자·허용 크기·만료와 묶고, 연결 완료 시 해당 업무 레코드에 파일 메타를 저장한다. `/files/:token`은 임의 저장 경로를 받지 않으며 세션/만료·대상 소유권을 검사한다. 별도 files 테이블 없이도 임시 파일 만료와 연결 완료 확인이 가능하도록 구현한다.

### 6.2 이미지 생성·검증·가이드

- 프로젝트 선택, 스타일, 비율, 프롬프트를 실제 요청으로 연결한다. 4장 생성은 현재 UX 기본값이며 공급자 지원·실패 정책을 확인해 상한과 함께 고정한다.
- 프로젝트의 IP/메타/가이드 버전과 모델 설정을 job.input에 고정한다. 진행 중 프로젝트 수정이 기존 요청의 의미를 바꾸지 않게 한다.
- PDF 추출은 업로드 → 텍스트/OCR 처리 → 규칙 초안 → 운영자 검토 → 게시 순서로 처리한다. 문서가 읽히지 않거나 규칙이 없으면 실패/검토 필요 상태를 표시한다.
- 게시된 가이드는 직접 덮어쓰지 않고 새 버전을 만든다. 재추출·수정해도 기존 검증 근거는 보존한다.
- 검증 결과에는 판정, 항목별 `pass/warn/reject/unknown`, 설명, 근거 위치, 사용한 가이드·엔진 버전, 검사 시각을 포함한다.
- 현재 'DSL·VLM 교차검증' 표시는 목업이다. 실제 구현하지 않은 방식이나 신뢰도 수치를 표시하지 않는다. 공급자/규칙 엔진의 가능 범위를 확인하고 화면 문구를 맞춘다.
- 생성 카드의 가이드 통과 배지는 실제 검증이 끝난 경우에만 표시한다. 생성 품질 점수와 검증 판정을 혼용하지 않는다.
- 가이드가 없거나 추출 중이면 검증·최종 확정을 막고 필요한 조치를 안내하는 안을 기본으로 한다. 가이드 없는 생성의 허용 여부는 별도 결정한다.
- 최종 확정 시 해당 에셋·프로젝트·검증 job의 성공·사용 가이드 버전을 서버에서 확인한다. 확정 취소는 원본 파일 삭제와 구분한다.
- 활성 가이드가 바뀌면 과거 최종본은 기존 버전 표시를 유지하고 재검증 필요 여부를 표시한다. 새 최종 확정에 허용할 버전 정책은 명시적으로 확정한다.
- 세션을 다른 프로젝트로 옮기는 것은 생성 전까지 허용하는 안을 권장한다. 생성 후 이동이 필요하면 권한·가이드·검증·최종본 관계를 함께 재계산해야 한다.

### 6.3 추천·모니터링

- 추천 입력의 IP 이미지·메타·세계관·라이선시 속성·업종/매출·콜라보 이력을 저장한다. 화면의 하드코딩 예시와 운영 데이터를 분리한다.
- 추천은 공개된 파트너만 대상으로 하고, 종합 점수·4개 항목 점수·설명·입력/모델 버전을 실행 결과로 보관한다. 근거가 없으면 SHAP 또는 AI 분석 결과로 표기하지 않는다.
- Hero 후보도 같은 결과 집합에서 선정한다. 재매칭은 새 작업을 만들며 기존 결과는 성공 전까지 유지한다.
- 협업 요청은 현재 이메일 안내를 유지한다. 자동 메일·인앱 대화·CRM은 확정된 요구가 없다.
- 탐지는 업로드한 원본 또는 본인 라이브러리 에셋을 기준으로 수행한다. 320px 표시용 썸네일을 분석 원본으로 고정하지 않는다.
- 구글·네이버 문구는 현재 UI에만 존재한다. 실제 사용 가능한 이미지 검색 공급자와 각 플랫폼 커버리지를 확인해야 하며, 특정 플랫폼 전체를 탐지한다고 가정하지 않는다.
- 결과는 원본 페이지 URL, 발견 이미지 URL/썸네일, 출처, 유사도, 발견 시각, 모델/검색 버전을 포함한다. 유사도는 무단 사용의 확정 판정으로 취급하지 않는다.
- URL 정규화·중복 제거·허용 scheme·서버 외부 이미지 요청의 SSRF 방어를 적용한다.
- 한 공급자 장애와 전체 결과 0건을 구분한다. 부분 성공은 누락된 출처를 표시하고, 재탐지는 이전 실행을 덮어쓰지 않는다.
- 자동 정기 탐지·알림·신고/삭제 요청은 현재 화면에서 확인되지 않는다. 초기에는 수동 탐지·재탐지까지만 구현한다.

### 6.4 작업 처리와 실패 복구

공통 상태는 `queued → running → succeeded / failed / canceled`를 기본으로 하고, 부분 결과가 있는 경우 결과 요약에 명시한다.

- worker는 트랜잭션과 잠금으로 작업을 획득하고 lease/heartbeat를 갱신한다. 중단된 worker의 작업은 만료 후 복구 대상으로 분류한다.
- 재시도 횟수·간격·timeout을 job 종류별로 정한다. 설정 오류·잘못된 입력과 일시적 공급자 장애를 구분한다.
- DB 커밋과 외부 공급자 호출은 하나의 트랜잭션이 아니다. 중단 위치에 따라 중복 생성·비용 발생 가능성이 있으므로 공급자 request ID와 멱등성 기능을 사용한다.
- 공급자가 멱등성이나 결과 재조회를 지원하지 않으면 응답 불명 작업을 무조건 자동 재실행하지 않고 운영 확인 대상으로 남긴다.
- 취소는 공급자의 실제 취소 가능 범위에 맞춰 동작한다. 취소 이후 도착한 결과의 저장/폐기와 비용 처리도 기록한다.
- job 등록 전 사용자별 동시 실행·요청량·파일 크기 제한을 적용한다. 제한 수치는 공급자와 운영 목표를 확인한 뒤 정한다.
- job.output은 결과 증거다. 생성 에셋이나 검증 근거가 참조 중인 작업을 큐 청소 정책으로 삭제하지 않는다. 큐 수명과 업무 이력 보존을 구분한다.

### 6.5 프런트 언어 변경·파일 언어팩·DB 콘텐츠 번역

#### 사용자가 언어를 바꾸는 위치

모든 주요 화면 **우측 상단**에서 같은 `LanguageSwitcher`를 사용한다. 버튼에는 지구본과 현재 언어명(`한국어` / `English`)을 표시하고, 클릭하면 `한국어`, `English` 선택 목록과 현재 선택 체크를 보여준다. 언어명은 해당 언어의 고유 표기로 표시한다.

| 화면 | 구체적인 위치 | 기존 코드와 변경 범위 |
| --- | --- | --- |
| 로그인 후 서비스 | 공통 헤더 우측 상단 | `components/layout/app-header.tsx`의 무동작 '언어' 버튼을 공통 선택기로 교체; 프로젝트·파트너·에셋·검증·최종본·모니터링에 공통 적용 |
| 로그인·비밀번호 찾기·프로필 설정 | 인증 화면 우측 상단 | `components/layout/auth-shell.tsx`의 기존 언어 버튼 연결 |
| 랜딩 | 상단 내비게이션의 '시작하기' 버튼 바로 왼쪽 | `app/page.tsx`에 선택기 추가; 비회원도 변경 가능 |
| 어드민 | 어드민 공통 헤더 우측 상단 | 관리자 화면을 읽는 언어 변경; 콘텐츠 편집 대상 언어와 구분 |
| 모바일 | 각 화면 헤더 우측 상단의 동일 위치 | 내비게이션을 접어도 선택기는 유지; 현재 언어명을 읽을 수 있고 터치·키보드 조작 가능 |

- 선택 즉시 현재 화면의 메뉴·본문·상태 문구를 변경한다. 현재 URL/프로젝트/세션, 검색·필터·선택 항목, 입력 중인 폼 값을 유지하며 언어 전환 때문에 재로그인하거나 첫 화면으로 보내지 않는다.
- 언어 변경은 생성·검증·탐지 job을 새로 실행하지 않는다. DB 콘텐츠는 같은 리소스를 새 locale로 다시 조회한다.
- 선택값은 cookie에 저장하고 로그인 사용자는 `users.preferences.locale`도 갱신한다. 저장 실패는 안내하고 재시도할 수 있게 한다.
- 최초 언어 결정은 명시적 cookie 선택 → 회원 선호 → 브라우저 언어 → 기본 `ko` 순서다. 처음 로그인한 계정에 선호가 없으면 현재 선택을 저장하고, 다른 계정으로 바꾸면 해당 계정 선호로 동기화한다.
- 기존 URL 구조를 유지한다. `en-US`처럼 등록되지 않은 지역 언어는 지원되는 상위 언어 `en`으로 매칭하고, 매칭되지 않으면 기본 언어를 사용한다.
- SSR과 클라이언트에 같은 locale/언어팩을 전달해 초기 언어 깜빡임과 hydration 불일치를 방지한다. `html lang/dir`, 날짜·숫자·복수형·접근성 문구도 반영한다. 언어 변경이 시간대나 통화 변경을 의미하지 않는다.
- 어드민의 콘텐츠 편집 폼에는 별도의 `콘텐츠 언어: 한국어 / English` 탭을 둔다. 헤더 언어 변경으로 편집 중인 번역의 저장 대상 언어가 바뀌지 않게 한다.

#### 이미 작성된 프런트 콘텐츠를 별도 파일로 추출

첫 다국어 구현 작업에서 기존 한국어 고정 콘텐츠를 빠짐없이 수집해 아래 파일로 옮기고, 동일 key의 영어 파일을 작성한다. 다음 경로는 **구현 시 생성할 산출물**이며 이번 계획 수정에서 파일 추출·UI 연결을 완료한 것으로 기록하지 않는다.

```text
messages/
  ko/
    common.json       공통 버튼·확인창·검색·페이지·날짜 표현
    navigation.json   사이드바·헤더·단계 이름·언어 선택
    landing.json      현재 랜딩의 제목·소개·CTA·FAQ·고정 footer 문구
    auth.json         로그인·인증·프로필·복구·마이페이지
    projects.json     프로젝트·생성 세션 목록·상세·가이드 첨부 안내
    partners.json     추천 화면·기준 입력 폼·협업 안내의 고정 문구
    assets.json       생성·채택·검증·최종본·다운로드의 고정 문구
    monitoring.json   탐지 설정·진행 단계·결과 화면의 고정 문구
    admin.json        7개 메뉴와 관리 화면의 고정 문구
    email.json        인증 메일 제목·본문 템플릿
  en/                 위와 동일한 파일·key 구조의 영어 번역
```

- 추출 대상은 `app/`, `components/domain/`, `components/layout/`, `lib/nav.ts`, `lib/account-store.ts`의 직무 선택지, 상태·스타일·날짜 그룹 표시명 등이다. label, placeholder, tooltip, aria-label, alt, 검증 오류, 빈 상태, 로딩 문구, metadata 제목·설명을 함께 조사한다.
- 기존 랜딩의 소개·기능 설명·CTA 등 **현재 코드에 작성된 고정 콘텐츠도 `landing.json`으로 이동**한다. 이를 DB 콘텐츠나 어드민 편집 기능으로 옮기지 않는다.
- key는 `common.save`, `projects.empty.title`, `jobs.status.running`처럼 의미를 나타내는 안정적인 값으로 정한다. 문장을 조각내어 이어 붙이지 않고 변수·복수형을 포함한 번역 단위로 작성한다.
- 한국어를 로직 분기 값으로 사용하는 상태·스타일·직무는 고정 code와 표시명으로 분리한다. 번역된 문자열이 API 값이나 DB enum이 되지 않게 한다.
- `lib/mock/partners.ts`의 업체명·소개·담당 연락처·추천 결과는 운영 데이터/fixture이며 고정 UI 언어팩에 섞지 않는다. DB 파트너 원본·번역 또는 실제 job 결과로 연결한다.
- 이미지 자체에 문자가 포함된 화면은 이미지별로 조사한다. alt 번역만으로 처리하지 않고 가능한 문구는 HTML로 분리하거나 언어별 이미지 파일 매핑을 언어팩 계약에 둔다.
- 파일은 Git 리뷰·key/변수 검증·배포로 관리한다. 앱의 UI 번역 로더는 이 파일만 읽으며 DB의 문구 override나 어드민 언어팩 업로드 기능을 만들지 않는다.
- `lib/i18n/`의 공통 로더·번역 함수와 언어팩 목록으로 화면을 연결한다. 화면별 `if ko / if en` 분기를 늘리지 않고 필요한 namespace만 로딩한다.

#### 파일과 DB의 책임 구분

| 콘텐츠 | 저장 위치 | 수정 방법 |
| --- | --- | --- |
| 기존 프런트 고정 문구·랜딩·어드민 UI·메일 템플릿 | `messages/{locale}/*.json` | 파일 수정 → 검증 → Docker 이미지 빌드·배포 |
| 파트너/IP 표시명·소개·운영자 작성 시장 설명·이미지 대체 텍스트 | 업무 레코드 + `localized_contents` | 파트너 상세의 언어 탭에서 입력·JSON 업로드·게시 |
| 프로젝트별 가이드/규칙의 표시 제목·설명 | 가이드 버전 + `localized_contents` | 가이드 상세의 언어 탭에서 입력·JSON 업로드·게시 |
| 이메일 주소·URL·통계 수치·규칙 조건·상태 code | 업무 원본 레코드 | 원본 업무 폼; 언어별 중복 저장 없음 |
| 사용자 프로젝트명·프롬프트·업로드 원문·AI 결과 | 원문과 언어 메타, job 요청/결과 | 입력 언어 보존·출력 언어 지정; UI 전환으로 원문 덮어쓰기 없음 |

어드민의 언어 현황 탭은 배포된 언어팩 준비 여부, 등록 언어, DB 콘텐츠의 번역 진행률만 보여준다. 파트너·가이드 이외의 콘텐츠는 실제 DB 업무 기능이 추가될 때 번역 대상을 확장한다. 현재 고정 프런트 콘텐츠를 편집하기 위한 CMS는 만들지 않는다.

#### 미번역·DB 업로드·게시 규칙

- 파일 문구는 요청 locale 파일 → 설정된 fallback locale 파일 → 기본 `ko` 파일 순서로 찾는다. 필수 key·변수 불일치는 빌드/검증에서 발견하고, 런타임에 원시 key나 `undefined`를 노출하지 않는다.
- DB 콘텐츠는 요청 언어 게시본 → fallback 언어 게시본 → 기본 원문 순서로 조회하며 실제 제공 언어/fallback 여부를 응답에 포함한다. UI 언어팩 파일과 DB 콘텐츠가 서로의 저장소를 덮어쓰지 않는다.
- DB 초안은 사용자에게 노출하지 않는다. 번역 없음·초안·게시됨·원문 변경 후 갱신 필요를 운영자에게 표시한다. 원문과 번역을 나란히 편집하고 저장/게시 버튼을 구분한다.
- 필수 필드 빈 문자열은 누락으로 검증하고 선택 필드의 의도적 숨김은 명시적 값으로 구분한다. 첫 출시에는 ko/en 필수 UI key와 공개 DB 콘텐츠 필수 필드를 모두 번역한다.
- 어드민 JSON 업로드는 `schemaVersion`, `locale`, DB 리소스 종류/key, 허용 필드 묶음을 포함한다. `ui`, `email`, 고정 `landing` 데이터는 거절한다.
- 업로드 시 리소스 존재/권한, 미등록 언어, 중복 항목, 알 수 없는 필드, 길이·용량·HTML 제약을 검증한다. import-preview에서 차이·오류를 확인한 뒤 version 일치 시 원자적으로 초안에 반영한다.
- 생략된 필드를 자동 삭제하거나 같은 파일 재업로드로 중복 레코드를 만들지 않는다. 게시 실패 시 이전 게시본을 유지한다. 업로드·수정·게시·언어 활성화는 감사 로그에 남긴다.
- DB 게시값의 캐시는 locale·권한·게시 version을 구분하고 60초 이내에 갱신한다. 콘텐츠 번역 수정에는 앱 재배포가 필요 없다. 초기 seed는 운영자가 게시한 번역을 덮어쓰지 않는다.
- AI 요청에는 출력 언어를 고정한다. 공급자가 이를 지원하지 않으면 실제 결과 언어를 표시한다. 번역 여부로 점수·판정·원본 근거가 바뀌지 않아야 한다.

#### 이후 새 언어를 추가하는 절차

1. `messages/{새 언어}/`에 기존 namespace와 동일한 key/변수의 언어팩 파일을 추가하고 검증한다. 파일 로더가 지원 언어 목록을 수집하도록 해 화면별 코드를 수정하지 않는다.
2. 언어팩을 포함한 Docker 이미지를 빌드·배포한다. web/worker가 동일한 언어팩을 포함하는지 확인한다.
3. 어드민 언어 현황 탭에서 언어 코드·표시명·방향·fallback을 등록한다. 파일이 배포되지 않은 언어는 공개 활성화할 수 없다.
4. 파트너·가이드 등 DB 콘텐츠를 언어별 폼 또는 JSON 템플릿으로 입력·검토·게시한다.
5. 필수 번역 준비 확인 후 언어를 활성화한다. 선택기에는 **활성 DB 언어와 배포된 언어팩의 교집합**만 노출한다.
6. 전환·폼 유지·레이아웃·날짜/숫자·메일·DB 콘텐츠·fallback을 검증한다. 새 언어 때문에 **DB migration이나 언어별 컬럼을 추가하지 않는다**.

UI 언어팩 추가·변경은 파일 배포가 필요하고, 이미 지원되는 언어의 DB 콘텐츠 추가·변경은 어드민 게시로 반영한다. RTL·새 문자권은 direction·폰트·레이아웃 검증을 추가한다. 초기에는 언어별 SEO URL을 도입하지 않는다.

### 6.6 Phase 0 DTO·권한·상태 계약

9.1절 확정 선택에 따른 계약이며 아직 구현된 API가 아니다. 라이브러리 고유 응답과 업무 API envelope를 혼용하지 않는다.

#### 공통 DTO

- 단건: `{ data: object }`. 목록: `{ data: object[], pagination: { page, pageSize, total, totalPages } }`. page는 1부터, pageSize 기본 30·최대 100, 모니터링 화면은 20을 요청한다. 정렬은 허용 필드 + 마지막 id tie-breaker로 안정화한다. 검색/집계는 동일 필터와 소유권을 적용한다.
- 오류: `{ error: { code, message, fieldErrors?, requestId } }`. 400 잘못된 query/JSON, 401 세션 없음, 403 관리자 기능·계정 제한, 404 존재하지 않음/타인 객체, 409 version·상태·멱등성 충돌, 422 유효하지 않은 입력, 429 제한, 502/503 공급자/일시 장애. message는 locale 표시용, 분기는 code로 한다. 내부 예외·SQL·provider 원문은 노출하지 않는다.
- 수정은 `version` 필수이며 `UPDATE ... WHERE id AND version` 성공 때 증가한다. 누락은 422, 오래된 값은 409 `VERSION_CONFLICT`. DELETE는 query version, PUT/PATCH는 body version을 사용한다. 가이드 초안은 rowVersion을 사용한다. 로그인·언어 cookie·job 취소처럼 별도 전이 규칙이 있는 endpoint는 예외를 명시한다.
- job 생성: `Idempotency-Key` 필수, 202 `{ data: { jobId, status } }`. 동일 owner/kind/key와 canonical 요청 hash는 기존 job 반환, 같은 키의 다른 요청은 409. 명시 재실행은 새 키 및 retryOfId. 요청 등록 시와 worker 결과 커밋 시 모두 권한·대상 상태 재검사.
- 입력 locale은 지원 registry로 검증한다. 콘텐츠 DTO에는 `{ requestedLocale, resolvedLocale, fallbackUsed }` 메타를 둔다. 목록에서 원본 storageKey, provider secret, 전체 job input/output은 제거한다. UTC ISO 시각을 반환하고 ID에서 시간을 파싱하지 않는다.
- 캐시는 locale·권한·게시 version을 구분한다. 사용자/관리 API는 기본 private/no-store. cookie 인증 변경 요청은 허용 Origin 및 CSRF 검증을 거친다.

#### 인증 경로 정합성

사용자 확정 흐름: `/login`에서 이메일 입력 → 미가입이면 `/sign-up`의 비밀번호 설정·가입 화면 → 이메일 소유 확인 → 프로필 설정 → 앱. 기존 회원이면 같은 로그인 흐름에서 비밀번호 입력 → 서버 인증 → 프로필 미완료 시 프로필, 완료 시 앱. 비밀번호 및 인증 증거를 URL/localStorage에 넣지 않는다. 화면 단계의 이메일만으로 서버 인증을 인정하지 않는다.

| 경로 | 요청/응답 및 책임 |
| --- | --- |
| `POST /api/auth/email/lookup` | `{ email }` → `{ data: { nextStep: 'sign-up' 또는 'sign-in' } }`. 이메일 trim/lowercase와 제한 적용. 계정 ID·역할·정지 여부·프로필은 반환하지 않음 |
| `POST /api/auth/sign-up/email` | email/password + 서버 지정 초기 name으로 credential 회원 생성. 같은 이메일 동시 가입은 UNIQUE로 하나만 생성. 조회 결과는 가입 권한/예약이 아니며 최종 가입이 다시 존재 여부 검사 |
| `POST /api/auth/sign-in/email` | email/password 인증, 이메일 확인 및 상태 검사, 세션 쿠키 발급. 잘못된 비밀번호/없는 계정은 동일 오류 |
| `POST /api/auth/sign-out`, `GET /api/auth/get-session` | 세션 폐기/현재 인증 주체 조회; 업무 API는 사용자 status도 재확인 |
| `POST /api/auth/send-verification-email`, `GET /api/auth/verify-email` | 신규 이메일 소유 확인 링크 발송/검증, 허용 callback만 수용. 확인 링크는 일상 로그인 수단이 아님 |
| `POST /api/auth/request-password-reset`, `POST /api/auth/reset-password` | 이메일로 재설정 링크 요청 → `/reset-password`에서 새 비밀번호 저장. 요청 응답은 가입 여부 비노출, 만료/재사용 거절, 재설정 성공 시 기존 세션 폐기 |
| `POST /api/auth/change-password` | 로그인 상태에서 현재 비밀번호 재확인 후 변경; 다른 세션 폐기 |

Better Auth의 `/api/auth/[...all]`을 사용하되 lookup은 애플리케이션 고유 route다. 가입의 임시 name 강제와 공개 role 입력 거절은 서버 hook/검증에서 강제한다. 인증 라이브러리 고유 응답은 인증 클라이언트 adapter에서 공통 오류 형태로 변환하고 Set-Cookie를 보존한다. 공통 업무 envelope를 라이브러리 응답에 강제로 씌우지 않는다. 고정 버전의 endpoint 타입/설정은 Phase 1 schema 점검과 Phase 3 E2E에서 대조한다.

이메일 분기에 따라 **가입 여부가 드러나는 UX**는 사용자가 지정한 흐름의 결과로 명시한다. 이전 초안의 “인증 시작 응답에서 가입 여부 비노출”은 lookup에 한해 대체한다. lookup은 IP·이메일 기준 요청 제한과 남용 모니터링을 적용하고 상태/개인정보는 추가 노출하지 않는다. 비밀번호 복구 응답은 비노출을 유지한다. 조회 후 다른 요청이 가입했을 때에도 기존 계정 비밀번호를 덮어쓰지 않는다.

이메일 소유 확인은 기존 AUTH-01 요구를 유지하며 가입 직후 확인 대기 화면에서 안내한다. 미확인 계정에는 업무 접근을 허용하지 않는다. 비밀번호는 라이브러리의 검증된 hash 구현을 사용하고 DTO/감사 로그/사용자 preferences에서 제외한다. 최소·최대 길이, 세션/재설정 토큰 수명과 시도 제한은 D-01에서 Phase 3 착수 전에 확정한다. 기본값을 운영 정책 확정으로 오인하지 않는다. OTP 로그인 plugin은 도입하지 않는다.

#### 권한 표 및 리뷰 사례

| 사례 | 기대 계약 | 책임 Phase |
| --- | --- | --- |
| 비회원이 업무 API/파일 접근 | 401, 페이지는 로그인 이동; public partner는 공개 필드만 | 3, 4 |
| 사용자 A가 B의 프로젝트/세션/에셋/가이드/job/파일 ID 요청 | 일관된 404; 중첩 관계와 다운로드도 같은 검사 | 3~10 |
| A가 B 프로젝트에 세션 연결·B 에셋을 커버 지정 | 404, FK + 서비스 검사; ownerId 위조는 입력 거절 | 4 |
| 일반 회원이 관리자 API 호출 | 403; UI 메뉴 숨김과 별개로 서버 검사 | 3, 6 |
| 관리자가 운영 리소스 변경 | 역할 검사, 대상 범위 검증, 사유·감사 기록; 원본 파일 상세 접근도 감사 | 6~10 |
| 같은 version으로 동시 수정 | 하나만 성공, 나머지 409; 자동 덮어쓰기 금지 | 4, 6 |
| 반려/미검증 에셋 최종 확정 | 서버 job/guide 근거 검사 후 거절; 클라이언트 verdict 불신 | 8 |
| 보관/탈퇴 직후 늦은 worker 완료 | 활성 상태·lease·대상 잠금 재검사 후 연결 거절; 정리 대상으로 남김 | 5, 7~10 |
| 다른 사용자 가이드의 번역 조회 | 원본 권한 재검사, 공개 published라도 권한 우회 불가 | 6, 7 |
| 번역 초안 저장/원문 갱신/동시 게시 | 기존 게시본 유지, revision 불일치 표시, version 충돌 거절 | 6 |

#### 상태 전이

| 대상 | 전이 / 조건 |
| --- | --- |
| 회원 | email_unverified → profile_pending (이메일 소유 확인) → active (필수 프로필 완료); active → suspended 또는 withdrawal_pending은 정책/감사 필요. 정지·탈퇴 신청 후 업무 접근과 세션 차단; 영구 삭제 시점은 D-03 확정 후 |
| 프로젝트 | preparing / generating / verifying / needs_revision / completed는 기존 다섯 표시 상태에 대응. 소유자가 활성 프로젝트에서 변경 가능하며 AI 판정을 바꾸지 않음. archived_at은 별도 접근·수정 제한 |
| 세션 | draft(project nullable) → 프로젝트 연결 → 생성 요청. 생성 후 프로젝트 이동 허용 범위는 D-05 결정 전 차단 |
| 가이드 | uploaded → extracting → draft → published; 추출 실패는 failed로 표시 후 새 추출 job으로 재시도. published 규칙은 불변이며 교체해도 과거 참조 보존 |
| job | queued → running → succeeded/failed/canceled. queued 취소는 즉시 종결, running 취소는 요청 기록 후 결과 커밋 차단. terminal을 다시 queued로 되돌리지 않고 새 retry job 생성. lease 만료·응답 불명은 안전성 확인 전 자동 재호출 금지 |
| 에셋 | generated → adopted → verified → finalized. verified는 succeeded 검증 job 필요, finalized는 서버 통과 판정 및 허용 guide version 필요. 확정 취소는 원본 삭제와 별개. 가이드 변경 시 새 확정 허용 기준은 D-05 결정 |
| 탐지 | job이 succeeded이고 결과 0건이면 정상 0건. 부분 성공은 coverage/errors 포함, 전체 실패는 failed. 최신 성공 결과와 최근 실행 상태를 분리해 실패 재탐지가 과거 결과를 덮지 않음 |
| 번역 | draft 저장 → 검증 후 published 원자 교체. 원문 revision 변경은 needs_update 파생 상태; published 보존. locale 활성화는 배포 파일/게시 준비와 fallback 검증 후 |

현재 화면의 유지/대체/비활성화: 프로젝트·세션·채택·최종·탐지 UI 흐름은 유지하면서 비동기 DTO로 대체(4~10); 이메일 선입력·회원가입·비밀번호 로그인/찾기·재설정·변경 화면을 추가/연결(3); 미연결 Google/Kakao 진입은 비활성화(3); mock 점수·통과 배지·타이머 성공은 실제 결과로 대체(7~10); 동작 없는 다운로드는 Phase 8에서 연결; 고정 UI는 파일 언어팩(2), 업무 번역만 DB(6). Phase 0 화면 수정은 없다.

## 7. Docker 실행·배포 계획

### 7.1 필수 산출물

| 파일/구성 | 목적 |
| --- | --- |
| `Dockerfile` | Node/pnpm 버전 고정, lockfile 설치, 빌드, web/worker 실행 target; 비관리자 사용자 |
| `.dockerignore` | node_modules, .next, .git, 로컬 secret·업로드·백업 제외 |
| `compose.yaml` | web, worker, db, 일회성 migrate; healthcheck·영속 볼륨·환경변수 |
| `compose.dev.yaml` | 필요한 경우 개발 모드·소스 마운트; 운영 구성과 분리 |
| `.env.example` | 실제 secret 없는 환경변수 설명; 현재 `.gitignore`의 `.env*`에 예외 추가 필요 |
| `next.config.ts` 변경 | Docker 배포용 standalone 출력과 이미지 제공 설정 검토 |
| DB migration·seed·관리 명령 | 배포 전 schema 갱신, `ko/en` 언어 목록·DB 콘텐츠 멱등 seed, 개발 샘플, 최초 관리자 지정; UI 언어팩은 파일로 배포 |
| 백업·복구 명령 | DB와 파일 볼륨의 같은 기준 시점 복구, 복구 검증 |

### 7.2 운영 조건

- DB와 파일을 컨테이너 writable layer에만 저장하지 않는다. `db-data`, `uploads-data` 등 명명된 볼륨으로 보존한다.
- DB 포트는 운영 외부에 공개하지 않는다. web만 ingress에 연결하고, TLS는 배포 환경의 reverse proxy/ingress에서 종료한다.
- 메일·AI·검색 서비스는 외부 adapter로 호출한다. Docker 이미지를 만든 것만으로 이 서비스가 제공되는 것으로 간주하지 않는다.
- DB 준비 → migration 성공 → web/worker 시작 순서를 보장한다. web과 worker 각각 자동 migration을 실행하지 않는다.
- healthcheck는 web 프로세스/DB 연결, worker heartbeat를 구분한다. 외부 공급자 장애가 곧 컨테이너 무한 재시작으로 이어지지 않게 한다.
- worker 종료 신호 시 신규 획득을 중단하고 실행 중 작업을 안전하게 마무리하거나 lease 복구에 맡긴다.
- 업로드 크기는 ingress, Next.js, 파일 처리 계층에서 일치시킨다. 큰 ZIP/PDF/이미지 작업은 worker로 보낸다.
- DB뿐 아니라 파일 볼륨도 백업한다. 같은 호스트의 볼륨만으로 백업 완료라고 처리하지 않고 별도 보관 위치와 주기를 정한다.
- 배포는 이전 이미지 digest 보존, 호환 migration, 애플리케이션 되돌리기를 기본으로 한다. 파괴적 migration은 사전 백업과 복구/forward-fix 계획을 별도로 확인한다.
- 운영 secret은 빌드 인자·이미지·`NEXT_PUBLIC_*`에 넣지 않는다. 실행 시 주입하고 로그에서 제거한다.
- `messages/` 언어팩 파일을 web/worker 이미지에 포함하고 이미지 배포와 함께 갱신한다. DB 운영 콘텐츠 번역은 DB 백업으로 보존한다. 이전 이미지로 복원해 언어팩이 없는 언어가 생기면 지원 언어 교집합과 fallback을 적용해 정상 화면을 제공한다.

### 7.3 목표 실행 인터페이스

아래 명령은 **구현 후 제공할 목표**이며 현재 저장소에서 실행 가능한 상태가 아니다.

```bash
cp .env.example .env
# .env에 로컬 설정 또는 승인된 공급자 설정 입력
docker compose build
docker compose up -d db
docker compose run --rm migrate
docker compose up -d web worker
docker compose ps
docker compose logs --tail=100 web worker
```

설정이 준비된 새 환경에서 위 절차로 시작 가능해야 한다. 외부 공급자가 없는 개발 환경은 명시적인 test adapter를 사용할 수 있으나, 운영 모드에서 목업 결과로 자동 대체하지 않는다.

## 8. 작업 순서와 산출물

아래 Phase를 **0부터 11까지 순차적으로 구현**한다. 기존 11개 작업 단위를 유지하되 기반 구축에서 파일 언어팩·UI 전환을 별도 Phase로 분리했다. 이후 각 기능에서 추가되는 ko/en 문구와 권한 검증은 해당 Phase 책임이며 마지막 단계까지 미루지 않는다.

Phase 0~6은 각 결과 보고서의 개발 범위가 완료되었다. Phase 7 실연동은 보류, Phase 8~10은 독립 기능 완료와 전체 완료를 구분한다. Phase 11은 사용자 진행 요청에 따라 로컬 검증을 수행한다. 예상 기간은 1명 순차 수행 기준의 초기 작업일 추정으로 외부 결정/계정 준비 대기를 제외한다. 실제 담당·일정은 Phase 0과 각 착수 조사에서 조정한다.

| Phase | 상세 계획 | 주요 산출물/완료 경계 | 선행 조건 | 예상 작업일 | 상태 |
| --- | --- | --- | --- | --- | --- |
| 0 | [요구사항·정책·데이터 계약 확정](phase0-plan.md) | 기반 필수 결정, DB/API/권한 계약, 공급자 결정 담당·기한 | 기존 요구/저장소 조사 | 2~3 | COMPLETED |
| 1 | [PostgreSQL·서버·Docker·검증 기반](phase1-plan.md) | schema/migration/seed, 공통 API/로그, Docker 골격, 실제 테스트 명령 | Phase 0 완료 | 4~6 | COMPLETED |
| 2 | [ko/en 파일 언어팩·공통 언어 선택](phase2-plan.md) | 기존 문구 추출, registry/fallback, 랜딩·앱·인증 선택기, SSR/cookie | Phase 1 완료 | 4~6 | COMPLETED (개발 범위) |
| 3 | [서버 인증·프로필·소유권·관리자 가드](phase3-plan.md) | 인증/세션, 프로필/권한, 회원 언어 선호·계정 전환 | Phase 2 완료, 개발용 인증 결정 확정 | 4~6 | COMPLETED (승인 개발 범위) |
| 4 | [프로젝트·세션·에셋 CRUD·영속 파일](phase4-plan.md) | 서버 CRUD/집계, 파일 권한/원본/썸네일, 보관/정리 계약 | Phase 3 완료 | 5~7 | COMPLETED (개발 범위) |
| 5 | [공통 job·큐·worker·실패 복구](phase5-plan.md) | PostgreSQL 큐, lease/멱등성/취소/재시도, 제한·파일 정리 | Phase 4 완료 | 4~6 | COMPLETED |
| 6 | [어드민 7개 메뉴·운영 CRUD·DB 콘텐츠 번역](phase6-plan.md) | 회원/프로젝트/파트너/작업 운영, 감사, 언어/번역 게시·import | Phase 5 완료 | 6~8 | COMPLETED (승인 개발 범위) |
| 7 | [가이드 PDF·규칙 버전·실제 이미지 생성](phase7-plan.md) | 가이드 실기능, 실제 공급자 생성·파일·채택·평가 | 임시 분석 UI 완료; 실제 공급자 연동 보류 | 6~9 | PAUSED |
| 8 | [검증·최종본·라이브러리·다운로드/ZIP](phase8-plan.md) | 실제 검증·서버 최종 판정, 생성→다운로드 전체 흐름 | Phase 7 완료, 검증/버전 정책 | 5~7 | IN_PROGRESS — 승인된 독립 서버 완료, 실공급자 보류 |
| 9 | [매칭 기준 저장·실제 파트너 추천](phase9-plan.md) | 기준/참조 이미지, 실제 추천/근거/재추천·품질 | Phase 8 독립 서버 인수, 규칙 기반 선택 | 4~6 | IN_PROGRESS — 구현/자동 검증 완료, 실제 데이터 품질 검수 대기 |
| 10 | [실제 탐지·재탐지 이력·모니터링 운영](phase10-plan.md) | 실제 검색/실행 이력, 부분 장애, 어드민 모니터링 완성 | 사용자 승인 독립 범위 완료, 실공급자 보류 | 5~8 | IN_PROGRESS |
| 11 | [전체 통합 검증·다국어 확장·배포/복구](phase11-plan.md) | T-01~24 최종 검증, 제3 언어, Docker/백업/복구, 운영 인수인계 | 사용자 진행 요청; 공급자 보류 유지 | 5~8 | IN_PROGRESS — 독립196 PASS·복구 검증 완료, 출시 BLOCKED |

**경계와 이월 원칙**

- Phase 1 worker는 실행 골격이며 실제 큐 처리는 Phase 5에서 완성한다. Phase 1의 ko/en seed는 파일팩 준비 전 비활성이고 Phase 2에서 준비 후 활성화한다.
- Phase 2는 기존 UI/비회원 언어 선택, Phase 3은 회원 선호, Phase 6은 어드민 언어 선택/업무 번역, Phase 11은 전체 번역과 제3 언어 확장을 검증한다.
- Phase 3 탈퇴는 계정 접근 차단부터 제공하며 업무/파일 정리는 Phase 4~5와 연결하고 Phase 11에서 전체 회귀한다.
- Phase 6의 가이드/모니터링은 메뉴·목록 계약을 준비한다. 가이드 실기능은 Phase 7, 모니터링 실기능은 Phase 10에서 완성하며 그 전까지 미완료 범위를 명시한다.
- test adapter는 독립적인 구현 준비에 사용한다. 실제 공급자 연동·품질이 필수인 Phase 7~10은 그 검증이 차단되면 완료할 수 없고, 순차 완료 게이트도 넘지 않는다.

**시작·완료·문서 게이트**

1. Phase 0은 현재 요구/저장소에서 시작한다. Phase N≥1은 바로 이전 계획·체크리스트·MD/HTML 결과를 읽고 결과 `COMPLETED`, 필수 테스트 `PASS`, 차단 이월 없음부터 확인한다.
2. 착수 시 실제 코드/작업 트리를 재조사하고 필수 결정·범위·실행 명령을 갱신한다. 계획을 `READY`로 전환해 공유한 뒤 구현한다. 미결정이 구현을 막으면 사유·담당·재개 조건과 함께 `BLOCKED`로 기록한다.
3. 구현 후 `phase{N}-test-checklist.md`를 작성하고 실제 검증/수정/재검증을 수행한다. `FAIL/BLOCKED/PENDING`을 성공으로 기록하지 않는다.
4. 필수 검증 통과 후 `phase{N}-result.md`와 `phase{N}-result.html`을 작성한다. 상태/수치/이월 항목을 일치시키고 링크·독립 HTML을 검증한 뒤 완료 판정한다.
5. 최초 계획 분할에서는 12개 plan만 생성했다. 2026-09-22 Phase 0 실행 요청에 따라 해당 체크리스트·결과 MD/HTML은 실제 검증 후 생성한다. Phase 1~11 결과를 미리 생성하지 않는다.

목표 산출물은 Phase마다 계획·테스트 체크리스트·결과 MD·결과 HTML 4종이다. 세부 필수 필드와 보고 게이트는 [진행 규칙](phase-development-process-rules.md)의 6~10절을 따른다.

### 8.1 예상 코드 변경 위치

```text
app/api/                      사용자·관리 API
app/admin/                    간편 어드민 7개 메뉴·언어 관리 탭
app/(app)/                    사용자 화면의 비동기 API 연결
app/login/, sign-up/, profile-setup/  이메일 분기·비밀번호 가입/로그인·프로필
app/forgot-password/, reset-password/ 비밀번호 찾기·재설정 흐름
components/admin/             공통 목록·상세·폼
components/domain/            실제 이미지, 폼, job 상태 표시
components/layout/            공통 LanguageSwitcher·앱/인증 헤더 연결
lib/server/                   DB·인증·서비스·파일·adapter·감사 로직
lib/contracts/                서버/클라이언트 공용 DTO·검증 schema
lib/api/                      클라이언트 요청·오류 처리
lib/i18n/                     locale 선택·언어팩 로더·번역 함수·fallback
messages/ko/, messages/en/     기존 고정 프런트·랜딩·UI·메일의 독립 언어팩
workers/                      job 실행 진입점·종류별 handler
db/                           schema·migration·seed (도구에 따라 경로 확정)
tests/                        권한·상태 전이·통합·E2E
Dockerfile, compose.yaml       최종 Docker 실행 구성
```

`lib/*-store.ts`는 API 호출부로 바꾸거나 호출자를 새 API 모듈로 옮긴 뒤 제거한다. `lib/mock/*`의 업무 타입은 계약 모듈로 옮기고 목업 값은 개발 fixture로만 남긴다. `GeneratedAsset`처럼 UI 컴포넌트에 정의된 서버 업무 타입도 계약 모듈로 옮긴다. 실제 Next.js 구현 전에 `AGENTS.md`가 요구한 설치 버전의 로컬 가이드를 읽는다.

## 9. 구현 전에 확정할 사항

아래 초기 검토표의 기반 항목은 9.1절에서 확정했다. 나머지 항목은 9.3절에 담당·기한·차단 조건을 지정해 이월한다. 최신 판정은 9.1~9.3절을 따른다.

| 결정 | 권장 기본안 | 다른 선택 시 영향 | 적용 시점 |
| --- | --- | --- | --- |
| 이메일 인증 방식 | 확정: 이메일 선입력·신규 비밀번호 가입/기존 비밀번호 로그인 + 서버 세션 | 회원가입·찾기/재설정·변경 UI와 credential schema 포함 | Phase 0 확정, Phase 3 구현 |
| 구글·카카오 로그인 | 준비된 공급자부터 실제 연결; 미연결은 진입 금지 | 두 공급자 필수이면 앱 등록/콜백 정보 필요 | 소셜 구현 전 |
| 계정 간 데이터 공유 | 개인 소유; 조직명은 프로필 | 팀 공동 작업이면 organizations/memberships 등 관계 추가 | DB 계약 확정 전 |
| 서버 구조 | Next.js API + 동일 저장소 worker + PostgreSQL | 이미 존재하는 API/AI 서버가 있으면 adapter와 배포 구조 조정 | 기반 구현 전 |
| ORM/인증 라이브러리 | 호환성 확인 후 각각 하나 채택 | 요구 테이블·migration·세션 정책 달라짐 | 기반 구현 전 |
| 생성/추출/검증/추천 엔진 | 기존 엔진 유무 확인 후 adapter 연결 | 신규 모델 개발이면 데이터셋·평가·일정 별도 필요 | 각 엔진 구현 전 |
| 탐지 공급자·커버리지 | 허용된 API와 실제 지원 범위를 화면에 반영 | 특정 플랫폼 전체/자동 수집 요구면 실현 가능성 재검토 | 탐지 구현 전 |
| 가이드 없는 생성·새 버전 처리 | 검증/최종본에는 게시 가이드 필수; 과거 버전 표시 | 무가이드 허용·재검증 강제 여부에 따라 상태 정책 변경 | 생성/검증 구현 전 |
| 파일·개인정보·작업 이력 보존 | 보관과 영구 삭제 분리, 참조 무결성 유지 | 보존 기간·탈퇴 삭제 범위에 따라 정리 job 변경 | 삭제 기능 구현 전 |
| 배포 호스트·저장소·백업 | 단일 호스트 Compose + 파일 볼륨 + 별도 백업 | 다중 서버면 공유 객체 저장소 필요 | 운영 구성 확정 전 |
| 요청량·비용 상한·품질 기준 | 동시 실행/월 사용량 제한과 공급자별 평가 데이터 정의 | 무제한 실행 또는 높은 SLA면 인프라·비용 확대 | 외부 엔진 공개 전 |
| 번역 원문·콘텐츠 제공 담당 | ko/en 파일 번역은 Git 리뷰 후 배포, DB 콘텐츠는 운영자가 검토 후 게시 | 전문 번역·검수 담당 및 AI 출력 언어 품질에 따라 일정 조정 | 파일 배포/콘텐츠 게시 전 |
| 랜딩 미연결 링크 | 언어팩 파일의 문구와 실제 연결 대상 정리 | 랜딩 고정 콘텐츠는 파일로 관리하며 CMS를 추가하지 않음 | 출시 점검 전 |

확정된 범위는 어드민 7개 메뉴, 한국어·영어 최초 지원, 프런트 우측 상단 언어 선택, 기존 고정 콘텐츠의 파일 언어팩 추출, DB 업무 콘텐츠만 어드민 번역 관리다. 새 언어는 파일 추가·배포와 DB 데이터 등록으로 확장하며 schema 변경을 요구하지 않는다. 이전 계획의 UI 언어팩 DB 저장/어드민 업로드와 이미지 재빌드 없는 UI 언어 추가는 이 방향으로 대체한다.

현재 코드에서 확인되지 않은 결제·구독·크레딧 판매, 수출바우처 신청/정산, 계약 전자서명, 자동 권리 침해 신고, 조직 협업은 저장소 이름만으로 요구사항에 포함하지 않는다. 사용량 제한은 운영 안전을 위한 기능이며 결제 상품 개발과 구분한다.

### 9.1 Phase 0 확정 결정

최종 사용자 지시가 이전 권장안보다 우선한다. 2026-09-22 권장안 승인 후 같은 날 인증 방식을 이메일·비밀번호로 정정했다. OTP 로그인 선택은 폐기했다. 아래 결정은 설계 확정이며 구현 완료가 아니다.

| ID | 결정·선택 | 근거 | 결정/실행 담당 | 확정일 | 영향 Phase |
| --- | --- | --- | --- | --- | --- |
| B-01 | 이메일 선입력 → 미가입 시 비밀번호 설정·가입, 기존 회원 비밀번호 로그인; 서버 세션 | 사용자 최신 명시 지시. 이메일 소유 확인 요구는 가입 후 확인 링크로 유지 | 사용자 / Codex | 2026-09-22 | 1 schema, 2 문구, 3 인증, 11 회귀 |
| B-02 | 개인 계정 소유, 조직명은 프로필; 조직 협업 제외 | 사용자 권장안 승인에서 유지 | 사용자 / Codex | 2026-09-22 | 1, 3~10 |
| B-03 | Next.js API + 동일 저장소 worker + PostgreSQL jobs 큐 + 단일 호스트 Docker Compose/공유 파일 볼륨 | 사용자 권장안 승인; 별도 API 서비스·Redis 불필요 | 사용자 / Codex | 2026-09-22 | 1, 4, 5, 11 |
| B-04 | Drizzle + pg, Better Auth의 이메일/비밀번호 + DB 세션 | 사용자 기술 도구 선정 위임; 기존 TS와 PostgreSQL 큐 SQL 통합, 공식 adapter·peer 범위 확인 | Codex | 2026-09-22 | 1, 3 |
| B-05 | Vitest 단위/DB 통합, Playwright E2E, Zod 계약, tsx worker/CLI | 단일 언어 계약·실제 PostgreSQL 검증, 브라우저 사용자 흐름 | Codex | 2026-09-22 | 1~11 |
| B-06 | UI/랜딩/메일은 ko/en 파일팩, 운영 번역만 DB; 어드민 7개 메뉴 | 기존 확정 사용자 요구 유지 | 사용자 / Codex | 2026-09-22 | 2, 3, 6~11 |
| B-07 | 5.5·6.6 계약: 인증 3개 추가 테이블, 소유권/FK·버전·DTO·상태·seed·조회 경계 | 기존 11개 책임 유지, 인증/동시성 공백 보완; 세부 기능 정책은 D 표에서 기한 지정 | Codex | 2026-09-22 | 1~11 |

### 9.2 도구·버전과 호환성 증거

2026-09-22 공개 npm 메타데이터(`https://registry.npmjs.org/{package}/{version}`) 및 공식 문서를 읽기 전용으로 조회했다. 아래 버전을 Phase 1 설치 목표로 고정한다. **설치·build·DB·Docker 실행 호환성은 아직 검증하지 않았다.** 환경 변경이 필요하면 그 차이를 Phase 1 결과에 기록한다. package.json/pnpm-lock.yaml은 이번 단계에서 바꾸지 않는다.

| 도구 | 선택 버전 | 조사 결과 / 다음 검증 |
| --- | --- | --- |
| Node.js | 22.22.0 | 현재 로컬 node --version; 아래 engine 범위 충족. Docker 동일 버전·이미지 digest Phase 1 기록 |
| pnpm | 10.34.5 | engine >=18.12, 기존 lockfile 9 유지 목표. packageManager 고정 및 workspace 설정 적용은 Phase 1 설치 검사 |
| Next.js / React / React DOM | 16.3.3 / 19.2.8 / 19.2.8 | 기존 고정 버전 유지. Next engine >=20.9.0, React 19 peer 충족; 로컬 Next 가이드는 아직 미설치 |
| PostgreSQL | 17.11 | 공식 지원 버전 정책에서 확인. Docker 이미지 digest와 DB 드라이버 실행은 Phase 1 |
| drizzle-orm / drizzle-kit / pg | 0.45.3 / 0.31.11 / 8.23.0 | Drizzle pg peer >=8, pg Node >=16. migration 도구는 Drizzle 하나로 통일 |
| better-auth / @better-auth/drizzle-adapter | 1.7.5 / 1.7.5 | Next ^16·React ^19, drizzle-orm ^0.45.2·kit >=0.31.4, pg ^8 범위 충족. adapter core/utils peer는 lock에서 확인 |
| vitest / vite | 5.0.1 / 8.3.0 | Vitest Node ^22.12.0, Vite peer ^8 충족. Next 앱 bundler는 변경하지 않고 테스트 실행에만 사용 |
| @types/node | 22.20.4 | 기존 ^20은 Vitest 5의 ^22 또는 >=24 peer와 불일치하므로 Phase 1에서 변경 필수 |
| @playwright/test | 1.63.0 | Node >=20; Next 선택 peer ^1.51.1 충족. Linux 브라우저 설치와 smoke는 Phase 1 |
| zod / tsx | 4.6.5 / 4.23.15 | 공통 입력·환경 계약 및 worker/seed 실행; tsx Node >=18 충족 |

선정 근거: [Drizzle PostgreSQL 공식 가이드](https://orm.drizzle.team/docs/get-started/postgresql-new), [Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle), [인증 DB schema](https://better-auth.com/docs/concepts/database), [이메일·비밀번호 인증](https://better-auth.com/docs/authentication/email-password), [Next 통합](https://better-auth.com/docs/integrations/next), [Vitest 가이드](https://vitest.dev/guide/), [Playwright 설치](https://playwright.dev/docs/intro), [PostgreSQL 지원 버전](https://www.postgresql.org/support/versioning/).

인증 라이브러리의 4개 기본 모델 중 user는 users에 합치고 3개를 추가한다. Drizzle 사용 시 인증 CLI의 별도 DB migrate를 병행하지 않는다. Node 타입 버전 차이를 제외하고 조회한 직접 peer 범위에 충돌은 발견되지 않았다. transitive/native dependency 및 Next 16.3.3 로컬 API 호환은 Phase 1에서 설치된 문서를 읽고 검증한다.

### 9.3 후속 결정·공급자 준비 일정

담당 실명/외부 계정은 제공되지 않았다. 제품·운영 결정 책임은 **사용자**, 조사·구현 책임은 **해당 Phase를 수행하는 Codex**로 명시한다. 기한은 미정 달력 날짜를 만들지 않고 순차 개발의 착수/공개 게이트로 고정한다. 모든 항목은 OPEN이며 수치·공급자가 확정됐다는 뜻이 아니다. 사용자 승인에 따라 이월하며 Phase 1 기반 구현은 막지 않는다.

| ID | 후속 결정/준비물 | 결정 담당 / 실행 담당 | 확정 기한 | 미충족 시 차단 |
| --- | --- | --- | --- | --- |
| D-01 | 개발 기준 확정: 비밀번호 8~128자·세션 7일·확인 24시간·복구 1시간·이메일/IP 제한·로컬 sandbox | 사용자 확정 / Phase 3 Codex | 개발 착수 게이트 해소 | 실제 공급자·발신 도메인·실수신자 발송 검증은 운영 활성화 전 |
| D-02 | 개발 기준 확정: 명시적 CLI 관리자 지정, 소셜/공개 관리자 접근 비활성 | 사용자 확정 / Phase 3 Codex | 개발 착수 게이트 해소 | 실제 관리자·추가 인증·OAuth 연결은 운영 활성화 전 별도 구현/검증 |
| D-03 | 개발 기준 확정: 탈퇴 즉시 세션 폐기/접근 차단, 데이터 보존·영구 삭제 비활성 | 사용자 확정 / Phase 3~5 Codex | 접근 차단 구현 게이트 해소 | Phase 4 파일·Phase 5 정리의 보존 기간/익명화 결정은 영구 삭제 활성화 전 |
| D-04 | 실제 호스트·도메인/TLS·볼륨 위치·용량·외부 백업 위치/주기/RPO/RTO | 사용자 / Phase 1·11 Codex | Phase 1 로컬 Compose는 준비 가능; 운영 데이터 투입 전, 늦어도 Phase 11 착수 전 | 실배포/복구 검증·출시. 개발 DB volume을 백업으로 간주하지 않음 |
| D-05 | 가이드 없는 생성 허용, 새 가이드 이후 최종본 허용 버전, 생성 후 세션 이동 | 사용자 / Phase 7·8 Codex | Phase 7 착수 전 | 생성 상태 정책 및 Phase 8 최종 확정. 결정 전에는 우회 허용하지 않음 |
| D-06 | 기존 엔진 유무, PDF/OCR·이미지 생성·검증 provider/API 계약·sandbox·평가 fixture | 사용자 / Phase 7·8 Codex | 추출/생성 Phase 7 착수 전; 검증 Phase 8 착수 전 | 실제 공급자 연결·품질 평가 및 해당 Phase 완료 |
| D-07 | 동시 요청·비용 상한·파일/결과 용량·timeout·재시도, 종류별 품질/지연 합격 수치 | 사용자 / Phase 4·5·7~10 Codex | 업로드 한도 Phase 4, 공통 제한 Phase 5, 공급자 수치 각 Phase 착수 전 | 상한 없는 업로드/유료 호출 공개 및 공급자 PASS 판정 |
| D-08 | 실제 파트너 catalog·공개 연락처·추천 엔진·점수 설명·평가 데이터 | 사용자 / Phase 9 Codex | Phase 9 착수 전 | 실제 추천/품질 평가 및 Phase 9 완료 |
| D-09 | 이미지 검색 API·허용 coverage·외부 이미지 정책·평가 데이터 | 사용자 / Phase 10 Codex | Phase 10 착수 전 | 실제 탐지/품질 평가 및 Phase 10 완료 |
| D-10 | ko/en 번역 검수자·운영 콘텐츠 제공, 랜딩 미연결 링크 실제 대상 | 사용자 / Phase 2·6·11 Codex | 파일팩 Phase 2 배포 전; 콘텐츠 Phase 6 게시 전; 링크 Phase 11 출시 전 | 미검수 필수 문구/미번역 콘텐츠 공개 및 출시 |

각 supplier 기능은 test adapter와 실제 품질 평가 결과를 별도 기록한다. 계정/credential 준비 증거는 secret 값 대신 준비 여부만 기록한다. D-01~10을 후속 Phase의 시작 게이트에서 재확인하고 해당 조건이 충족되지 않으면 그 기능과 필수 검증을 차단한다. 2026-09-22에 실제 공급자·비용·보존 기간을 임의 확정하거나 메일/유료 호출을 실행하지 않았다.

## 10. 검증 계획과 완료 기준

아래 표는 최초 정의한 검증 계약이다. Phase별 실행 증거와 Phase 11 최종 대조 판정은 각 결과/체크리스트를 따른다. 최초 PENDING 표를 현재 실행 상태로 오인하지 않는다. 실제 실행 증거는 해당 Phase 체크리스트에 명령/환경/결과/증거로 기록한다. 이 표는 최종 판정 요약으로 유지하고 Phase 11에서 이전 증거와 필요한 회귀 결과를 연결하며 성공·실패·미실행을 구분한다.

| ID | 검증 | 기대 결과 | 현재 상태 |
| --- | --- | --- | --- |
| T-01 | lint, TypeScript, build | 설치 버전 기준 모든 필수 검사 통과; 기존 실패와 신규 실패 분리 | PENDING |
| T-02 | 이메일 분기·비밀번호 가입/로그인·복구·로그아웃·프로필 | 중복 가입/잘못된 비밀번호/URL 우회 차단, 확인·재설정 토큰 만료/재사용 차단, 재설정 후 세션 폐기 | PENDING |
| T-03 | 사용자 A/B와 일반/운영자 권한 | 타인 프로젝트·세션·에셋·가이드·job·파일 접근 및 관리 API 호출 차단 | PENDING |
| T-04 | CRUD·검색·페이지·동시 편집·없는 ID | 서버 데이터 일관성, 충돌 응답, 샘플 fallback 없음 | PENDING |
| T-05 | 업로드 형식·크기·경로·파일 접근·만료 | 서버에서 불허 파일 거절, 경로 조작 차단, 권한 없는 파일 다운로드 불가 | PENDING |
| T-06 | job 중복 요청·timeout·worker 중단·재시도 | 중복 처리 방지, 중단 복구, 실패 원인 보존, 응답 불명 비용 작업 안전 처리 | PENDING |
| T-07 | PDF 추출·규칙 게시·버전 변경 | 원본·초안·게시 상태 구분, 과거 가이드 참조 유지 | PENDING |
| T-08 | 생성→채택→검증→최종→다운로드 E2E | 실제 이미지 파일 생성·영속화, 서버 판정 사용, 정상 파일/ZIP 다운로드 | PENDING |
| T-09 | 반려/미검증 결과·가이드 변경·동시 최종 확정 | API 직접 호출로도 제한 우회 불가, 버전 정책·멱등성 유지 | PENDING |
| T-10 | 매칭 기준 변경·재추천·비공개 파트너 | 입력 저장·복원, 실제 결과 갱신, 비공개 후보 제외 | PENDING |
| T-11 | 탐지 성공/0건/부분 장애/전체 실패·재탐지 | 상태 구분, 연도 포함 시각 정렬, 실행별 결과 보존 | PENDING |
| T-12 | 어드민 7개 메뉴·상태 변경·job 재시도·감사 | 운영 동작과 권한 검증, 누가 무엇을 바꿨는지 추적 가능 | PENDING |
| T-13 | 프로젝트/세션 보관·탈퇴·늦은 worker 응답·파일 정리 | 고아 데이터·권한 누출·삭제 대상 부활 방지, 보존 정책 일치 | PENDING |
| T-14 | Docker 새 환경 빌드·migration·재시작 | web/worker/db 정상, 데이터·파일 유지, migration 중복 실행 안전 | PENDING |
| T-15 | DB+파일 백업·빈 환경 복구·이전 이미지 복원 | 핵심 사용자 흐름이 복구된 데이터에서 동작 | PENDING |
| T-16 | 공급자 평가·부하·요청량 제한·민감정보 로그 | 합의한 품질/지연/처리량 기준 충족, 초과 요청 제한, secret 미노출 | PENDING |
| T-17 | API 오류·새로고침·모바일·빈 목록 UI | 저장 실패를 성공으로 보이지 않고 상태 복구·재시도 가능 | PENDING |
| T-18 | 기존 프런트·랜딩 문구 파일 추출, ko/en UI·메일·DB 콘텐츠 | 필수 번역 누락 0건, 양 언어 파일 key/변수 일치, 고정 문구가 DB 조회 없이 표시 | PENDING |
| T-19 | 번역 초안·게시·미번역·원문 변경·fallback 순환 | 초안 미노출, 게시본 유지, 갱신 필요 표시, 순환 거절, 안전한 fallback | PENDING |
| T-20 | DB 콘텐츠 JSON 업로드·재업로드·동시 수정·권한·악성 필드 | preview 후 원자적 반영, 중복 없음, UI 언어팩/고정 랜딩 입력 거절, 권한/캐시 누출 없음 | PENDING |
| T-21 | 테스트용 제3 언어 파일 추가·배포·DB 콘텐츠 게시·활성화 | migration·컬럼 추가 없이 전환; 미배포 파일 언어 활성화 차단; 비활성화 시 fallback | PENDING |
| T-22 | DB 콘텐츠 게시·Docker 재시작·seed·백업/이전 이미지 복구 | DB 번역은 60초 이내 반영·보존, 파일팩은 이미지와 일치, 미지원 언어 안전 fallback | PENDING |
| T-23 | 랜딩·앱·인증·어드민의 PC/모바일 언어 선택기 | 우측 상단에서 ko/en 선택, 현재 언어 표시, 키보드/터치 사용, 입력·URL·필터 유지, job 재실행 없음 | PENDING |
| T-24 | SSR·새로고침·로그인/계정 전환·콘텐츠 편집 언어 | 초기 언어 일치·선호 유지, 오류 안내, 헤더 언어와 번역 저장 대상 언어 분리 | PENDING |

### 10.1 공통 테스트의 Phase별 책임

여러 단계에 걸친 항목은 최초 구현 단계와 완성/회귀 단계를 구분한다. 기능을 추가한 Phase에서 해당 권한·오류·언어 검증을 함께 수행하고, Phase 11은 전체 최종 책임을 가진다. 아래 배정은 실행 결과가 아니다.

| 공통 ID | 구현/주요 검증 Phase | Phase 11 최종 확인 |
| --- | --- | --- |
| T-01 | 1 실행기 구축, 1~10 변경 코드 검사; 0 문서 검사 | 전체 lint/typecheck/build |
| T-02 | 3 | 인증 전체 흐름 |
| T-03 | 3 가드, 4~10 각 리소스/관리 API | A/B·일반/관리자 전체 권한 |
| T-04 | 4, 6 운영 CRUD | 검색/집계/충돌/없는 ID |
| T-05 | 4 파일, 7 PDF/이미지, 8 ZIP, 10 외부 이미지 | 파일 전체 경계 |
| T-06 | 5 공통 큐, 7~10 공급자 handler | 중단/멱등성/응답 불명 |
| T-07 | 7 | 가이드 버전/과거 참조 |
| T-08 | 7 생성/채택, 8 전체 연결 | 실제 생성→다운로드 E2E |
| T-09 | 8 | 반려/미검증/버전/동시 확정 |
| T-10 | 9 | 기준/추천/공개 후보 |
| T-11 | 10 | 탐지 상태/재탐지 이력 |
| T-12 | 6 기본 운영, 7 가이드, 10 모니터링 | 7개 메뉴 전체 동작/감사 |
| T-13 | 3 계정, 4 업무/파일, 5 정리, 7~10 늦은 결과 | 보관/탈퇴/정리 전체 |
| T-14 | 1 Docker 기반, 4 데이터/파일, 5 worker | 새 환경·migration·재시작 |
| T-15 | 11 | DB+파일 백업·빈 환경 복구·이전 이미지 |
| T-16 | 5 제한, 7~10 실제 공급자 평가 | 합의 부하/품질/비용·로그 |
| T-17 | 4~10 각 비동기 화면 | 모바일/오류/빈 목록/복원 |
| T-18 | 2 기존 UI, 3 메일, 6~10 신규 UI/콘텐츠 | ko/en 필수 누락 0건 |
| T-19 | 2 fallback, 6 게시/원문, 7 가이드 번역 | 초안/게시/갱신/순환 |
| T-20 | 6 | JSON 업로드/재업로드/동시성/권한 |
| T-21 | 2 파일 기반, 6 언어 관리, 11 전체 확장 | 제3 언어 schema 변경 0건 |
| T-22 | 2 파일팩, 6 게시/seed, 11 복구 | 캐시 60초·백업·이전 이미지 fallback |
| T-23 | 2 랜딩/앱/인증, 6 어드민 | PC/모바일·입력/URL 유지 |
| T-24 | 2 SSR/cookie, 3 계정, 6 편집 언어 | 새로고침/계정 전환/저장 언어 |

### 10.2 실행 명령과 출시 완료 기준

기본 명령은 `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`를 사용한다. 단위/통합/E2E·migration·복구 명령은 도구를 선택하고 실제 스크립트를 추가한 뒤 기록한다. Docker 관련 검증은 7절의 목표 명령에 서비스 재시작과 복구 시험을 추가한다. 메일·과금 공급자 테스트는 test adapter/sandbox로 우선 수행하고 실제 실행 대상과 비용이 확정된 검증만 운영 계정에서 수행한다.

최종 완료 판정:

- [ ] 핵심 사용자 흐름에서 localStorage/mock 결과 의존이 제거되었다.
- [ ] 인증·사용자 소유권·관리자 권한이 서버에서 강제된다.
- [ ] 어드민 7개 메뉴로 회원·프로젝트·파트너·가이드·작업·탐지 결과 운영이 가능하다.
- [ ] 기존 고정 프런트·랜딩 콘텐츠가 ko/en 언어팩 파일로 추출되고 UI·메일에 연결되었다.
- [ ] 랜딩·앱·인증·어드민 우측 상단에서 언어를 바꿀 수 있고 모바일·새로고침·입력 유지가 검증되었다.
- [ ] 어드민은 DB 업무 콘텐츠의 언어별 입력·JSON 업로드·검토·게시만 제공한다.
- [ ] 테스트용 새 언어를 파일 추가·배포와 DB 콘텐츠 등록으로 활성화했으며 DB schema 변경이 필요하지 않았다.
- [ ] 각 테이블의 책임·JSONB schema·삭제 정책이 확정되고 migration으로 재현된다.
- [ ] 이미지·PDF·최종본·탐지 이력이 실제 데이터로 저장되고 다운로드된다.
- [ ] 실제 외부 엔진 연동과 합의한 품질 검증이 끝났다. test adapter 통과만으로 완료하지 않았다.
- [ ] Docker에서 빌드·시작·migration·재시작·백업/복구가 검증되었다.
- [ ] 필수 테스트가 PASS이며 미완료·차단 기능과 사용자 노출 상태가 명확하다.
- [ ] 각 Phase의 계획·체크리스트·MD/HTML 결과에 구현 차이와 실제 증거가 기록되고, 이 파일에 최종 판정·보고서 링크·배포/복구 절차와 남은 제약이 갱신되었다.

### 10.3 Phase 0 요구사항 추적표

원본 2.3절의 모든 요구 ID를 개별 행으로 추적한다. 각 행의 담당은 해당 Phase 수행 Codex이며, 제품/운영 결정은 9.3절 사용자 담당을 따른다. 모든 행은 Phase 11에서 최종 회귀한다. 공통 테스트 기대 결과는 10절, T-01~24 전체 책임은 10.1절을 유지하며 실행 상태는 아직 PENDING이다.

| 요구 ID | 구현/주요 검증 Phase | 공통 테스트 | 최종 책임 |
| --- | --- | --- | --- |
| AUTH-01 | 3 | T-02, T-03, T-13, T-18, T-24 | 11 |
| AUTH-02 | 3 | T-02, T-03, T-13, T-18, T-24 | 11 |
| AUTH-03 | 3 | T-02, T-03, T-13, T-18, T-24 | 11 |
| AUTH-04 | 3 | T-02, T-03, T-13, T-18, T-24 | 11 |
| AUTH-05 | 3 | T-02, T-03, T-13, T-18, T-24 | 11 |
| AUTH-06 | 3 | T-02, T-03, T-13, T-18, T-24 | 11 |
| PROJ-01 | 4 | T-03, T-04, T-17 | 11 |
| PROJ-02 | 4 | T-03, T-04, T-17 | 11 |
| PROJ-03 | 4, 7, 8 | T-05, T-08, T-13 | 11 |
| GUIDE-01 | 7 | T-03, T-05, T-07, T-19 | 11 |
| SESS-01 | 4 | T-03, T-04, T-13, T-17 | 11 |
| SESS-02 | 4 | T-03, T-04, T-13, T-17 | 11 |
| GEN-01 | 7, 8 | T-05, T-06, T-08, T-16, T-17 | 11 |
| GEN-02 | 7, 8 | T-05, T-06, T-08, T-16, T-17 | 11 |
| GEN-03 | 7, 8 | T-05, T-06, T-08, T-16, T-17 | 11 |
| GEN-04 | 7, 8 | T-03, T-08, T-09, T-13 | 11 |
| VERIFY-01 | 8 | T-03, T-08, T-09 | 11 |
| VERIFY-02 | 8 | T-03, T-08, T-09 | 11 |
| FILE-01 | 4, 8 | T-03, T-05, T-08, T-13 | 11 |
| FILE-02 | 8 | T-04, T-08 | 11 |
| MATCH-01 | 9 | T-05, T-10, T-17 | 11 |
| MATCH-02 | 6, 9 | T-03, T-10, T-16, T-17 | 11 |
| MATCH-03 | 9 | T-10 | 11 |
| MON-01 | 10 | T-03, T-05, T-06, T-11, T-12, T-16 | 11 |
| MON-02 | 10 | T-03, T-05, T-06, T-11, T-12, T-16 | 11 |
| MON-03 | 10 | T-03, T-05, T-06, T-11, T-12, T-16 | 11 |
| MON-04 | 10 | T-03, T-05, T-06, T-11, T-12, T-16 | 11 |
| UI-01 | 2, 3, 4, 5, 6, 7, 8, 9, 10 | T-17, T-23, T-24 | 11 |
| UI-02 | 2, 6, 11 | T-23, T-24 | 11 |
| I18N-01 | 2, 3, 6, 7, 8, 9, 10 | T-18, T-19, T-20, T-21, T-22, T-23, T-24 | 11 |
| OPS-01 | 3, 6, 7, 10 | T-03, T-12 | 11 |
| OPS-02 | 1, 4, 5, 11 | T-01, T-05, T-06, T-14, T-15, T-16 | 11 |

의존성은 0 → 1 → … → 11의 순차 DAG다. 공급자 결정 준비는 병행할 수 있으나 구현 게이트를 건너뛰지 않는다. D-01~10의 준비 기한은 해당 기능 착수/공개 전이며 후속 구현 산출물을 Phase 0 완료의 선행 조건으로 요구하지 않는다.

## 11. 진행 기록

| 날짜 | 변경·확인 | 상태 |
| --- | --- | --- |
| 2026-09-22 | `main`의 `7f488bb`에서 `feature/backend` 생성·전환 | 완료 |
| 2026-09-22 | 사용자 화면·store·mock·인증·배포 설정 정적 조사 | 완료 |
| 2026-09-22 | 단일 파일 계획, 간편 어드민, 적정 DB 분리, Docker 최종 실행 요구 반영 | 완료 |
| 2026-09-22 | 어드민 7개 메뉴 확정, ko/en·DB 콘텐츠 번역·언어팩·새 언어 확장 계획 및 검증 기준 추가 | 완료 |
| 2026-09-22 | 프런트 언어 선택 위치·행동 명시, 기존 콘텐츠 파일 추출 계획 추가, 어드민 번역 범위를 DB 업무 콘텐츠로 한정 | 완료 |
| 2026-09-22 | 사용자 후속 요청에 따라 단일 파일 운영을 Phase 규칙 적용으로 변경; Phase 0~11 상세 계획·의존성·T-01~24 책임 배정 | 계획 초안 작성, 구현 미착수 |
| 2026-09-22 | 백엔드·어드민·DB·Docker 구현 및 런타임 테스트 | 미착수 |
| 2026-09-23 | Phase 0: 사용자 인증 정정·도구/데이터/API 계약·32개 요구/24개 공통 검증 추적·후속 결정 10건 이월. [체크리스트](phase0-test-checklist.md), [결과 MD](phase0-result.md), [결과 HTML](phase0-result.html) | COMPLETED — 필수 문서 검사 4 PASS, 런타임 미실행 |

| 2026-09-23 | Phase 1: 14테이블·migration/seed·공통 서버/오류·Docker·실행기. 자동 28 PASS, 운영 smoke 4 PASS, lint 0 errors/20 warnings. [체크리스트](phase1-test-checklist.md), [결과 MD](phase1-result.md), [결과 HTML](phase1-result.html) | COMPLETED — 기존 UI 경고 이월, 실제 인증/업무 API/작업 소비 미구현 |

실제 개발 중에는 완료 범위·변경 파일·명령·종료 코드·테스트 수·실패/재검증·남은 제약을 해당 Phase 체크리스트와 결과 보고서에 기록하고, 이 파일에는 Phase 상태·결정/계약 변경·최종 검증 요약과 실제 생성된 보고서 링크를 갱신한다. 계획 작성과 서비스 개발 완료를 구분한다.


### 2026-09-23 Phase 3 D-01~03 개발 범위 결정

사용자가 비밀번호 최소 8자와 나머지 권장 개발용 기준을 확정했다. 최대 128자, 세션 7일, 확인 링크 24시간, 재설정 1시간 및 이메일/IP별 DB 요청 제한을 적용한다. 메일은 로컬 sandbox만 검증하고 실제 공급자 발송은 후속 준비 후 검증한다. 소셜/공개 관리자 접근은 비활성화하며 최초 관리자 지정은 명시적 CLI로 수행한다. 탈퇴 즉시 세션 폐기·접근 차단, 영구 삭제·보존 기간은 별도 결정 전 비활성화한다. Phase 3 완료 게이트는 이 승인된 개발 범위로 한정하며 운영 발송/추가 인증/보존 정책은 운영 활성화 전 별도 게이트다. 구체적 제한·구현/검증 순서는 phase3-plan.md에 기록한다.

### 2026-09-23 Phase 4 D-07 파일 개발 기준 결정
사용자가 커버 PNG/JPEG/WebP 최대 10MiB, 업로드 ticket 15분·다운로드 링크 5분을 확정했다. 디코딩 보호는 40MP·단일 프레임, private 공유 볼륨·소유권 다운로드다. storage_tickets는 임시 capability/정리 ledger이며 연결 파일 메타의 원본은 업무 레코드 JSONB다. D-03에 따라 영구 삭제는 비활성, 미연결/교체 파일은 정리 대상으로만 기록한다. Phase 4 CRUD는 계정 transaction·version 충돌·보관/복구·30건 서버 페이지에 연결한다. 생성/검증/최종화·정리 worker는 후속 Phase 범위다.

Phase 4 실행 완료: 필수 5 PASS, 고유 자동 93 PASS, Docker smoke 4 PASS. 프로젝트·세션 서버 CRUD·private 파일과 worker lifecycle/정리 ledger 계약을 인수할 수 있다. 상세 판정과 이월은 [Phase 4 결과](phase4-result.md)에 기록했다.

### Phase 5 개발 정책 확정 (2026-09-23)

사용자가 D-07 개발값을 승인했다: 사용자당 실행 2개·대기 10개·시간당 새 jobs 행 60개(재시도 포함), 종류별 개발 timeout 5분, 안전한 실패만 최대 2회 재시도. 응답 불명은 자동 재호출하지 않는다. lease 30초/heartbeat 10초, 재시도 5초 지수 backoff를 사용한다. D-03은 기존 보존 정책 유지: 만료 다운로드 capability만 삭제, 임시·실패·ZIP 파일은 정리 ledger 유지, 물리 삭제 비활성. 공급자별 실제 비용/품질·파일 보존 기간은 후속 게이트다. Phase 5 additive jobs lease/dispatch/cost 컬럼과 retry child 유일성, storage_tickets job target을 추가한다.

### Phase 6 개발용 관리자 인증 확정 (2026-09-23)

사용자가 비밀번호 재확인 후 현재 세션 15분 관리자 접근을 확정했다. 추가 인증 만료는 서버 DB 세션에 저장하고 모든 관리자 요청에서 검사한다. 실제 운영 공개/MFA 게이트는 별도 유지한다. Phase 6 계획은 IN_PROGRESS다.

Phase 6 결과: 2026-09-23 승인 개발 범위 COMPLETED. 필수5 PASS, 자동142 PASS, 상세 증거는 phase6-result.md와 phase6-test-checklist.md. 실제 운영 공개/MFA·운영 콘텐츠 검수·후속 공급자는 기존 게이트를 유지한다.

### 2026-09-23 Phase 7 생성 정책 결정

사용자가 무가이드 생성 허용·성공 이미지 보존·부분 실패 표시를 확정했다. 게시본 불변·생성 후 프로젝트 이동 차단은 유지한다. Phase 8 최종화의 허용 가이드 버전 정책은 별도다. 공급자·모델·예산은 비교 제안을 먼저 요청했으며 [제안 문서](phase7-provider-proposal.md)에 기록했다. 유료 호출 승인이나 Phase 7 완료를 의미하지 않는다.

### 2026-09-23 Phase 7 보류

사용자 요청으로 Phase 7 실제 구현을 보류하고 조사·제안만 보존한다. 상태는 PAUSED이며 구현·필수 검증 완료를 의미하지 않는다. 사용자 재개 요청 전까지 추가 구현과 유료 API 호출을 진행하지 않는다.

Phase 7 임시 UI 결과: PDF 선택·진행·고정 규칙·편집·취소/재분석/제거와 ko/en 완료. typecheck/lint/build 및 i18n 7개, 브라우저 smoke 10항목 통과. 실제 공급자 연동은 계속 보류하며 [결과](phase7-result.md)에 한계를 기록했다.


### 2026-09-23 Phase 8 독립 서버 구현 승인

사용자가 실제 공급자 보류 상태에서 Phase 8 서버·다운로드부터 구현하도록 승인했다. 순차 완료 게이트 예외는 이번 독립 범위에 한정한다. Phase 7 PAUSED와 실제 품질 평가 미완료를 유지한다. [Phase 8 계획](phase8-plan.md) 16절의 보수적 최종화·ZIP 한계와 테스트 범위를 적용하며, 테스트 double을 실제 공급자 완료로 집계하지 않는다.

Phase 8 독립 결과: 서버 검증 계약·최종화·실제 ZIP/단일 다운로드와 UI 연결, 고유 자동 테스트138 PASS, 타입/린트/production 빌드 통과. [결과](phase8-result.md)에 원래 전체 Phase의 실공급자 미완료를 구분했다.

2026-09-24 Phase 9: 사용자 진행 요청 및 규칙 기반 추천 선택. Phase 7·8 실제 공급자 보류는 유지하며 독립 매칭을 진행한다. 점수는 IP/세계관/브랜드/업종 텍스트 토큰 일치율로 명시하고 가격·팬덤 추정값을 대체한다. 상세 계약은 phase9-plan.md 16.1절. 실제 파트너 사업 품질 검수는 합성 테스트와 구분한다.

Phase 9 결과: 규칙 기반 기능·147개 고유 자동 테스트 PASS, typecheck/lint/build 통과. 실제 운영 파트너 사업 품질은 데이터 미제공으로 미검증. 전체 COMPLETED가 아니며 상세 증거는 phase9-result.md/HTML 및 체크리스트에 기록한다.

2026-09-24 Phase 10: 사용자 선택으로 공급자 없는 기록·원본 보관·실행 이력·관리자 독립 구현 착수. Phase 7·8 실연동 보류/Phase 9 사업 검수 대기 유지. 운영 탐지 handler 미등록 시 503이며 가짜 성공 없음. 상세 계약은 phase10-plan.md 16.1절. 실제 검색·커버리지·외부 이미지 수집/SSRF·품질 평가는 후속 게이트다.

Phase 10 독립 결과: 서버 원본·기록/보관·실행 이력·관리자 감사, 자동158 PASS, production 빌드/타입/린트 통과. 실제 검색·커버리지·외부 썸네일·품질은 보류하며 전체 상태 IN_PROGRESS다. 상세 증거: [Phase 10 결과](phase10-result.md).

2026-09-24 Phase 11: 사용자 진행 요청 범위의 로컬 회귀196 PASS, 제3locale 확장·오류 번역/언어 전달 수정, Docker 새 환경·DB+파일 복구·이전 이미지 fallback 검증. 실제 공급자/운영 출시 조건은 BLOCKED. [최종 T-01~24 대조와 결과](phase11-result.md), [실행 체크리스트](phase11-test-checklist.md). 기존 Phase7 보류 및 미완료를 임의 완료로 바꾸지 않았다.
