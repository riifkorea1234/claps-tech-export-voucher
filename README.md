# CLAPS Studio 2.0 — 프론트엔드

IP-Safe AI 미들웨어. 라이선스 규칙에 맞춰 브랜드 이미지를 **생성·검증**하고, 무단 사용까지 **모니터링**하는 서비스의 화면(프론트엔드)입니다.

> **현재 상태**: 화면(UI) 구현 완료, **백엔드 미연동**. 모든 데이터는 브라우저 저장소(localStorage)에 저장되는 임시 구현입니다. 아래 [백엔드 연동 가이드](#백엔드-연동-가이드)를 참고해 교체하면 됩니다.

---

## 실행 방법

```bash
npm install
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 프로덕션 빌드
npm run lint         # 코드 검사
```

배포: **Vercel** (main 브랜치 푸시 시 자동 배포)

---

## 기술 스택

| 항목 | 사용 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS v4 |
| UI 컴포넌트 | shadcn/ui (style `radix-vega`, base `zinc`) |
| 아이콘 | lucide-react (기본), @phosphor-icons/react (랜딩), @tabler/icons-react |
| 폰트 | Pretendard |

---

## 폴더 구조

```
app/
├── page.tsx              랜딩 페이지 (마케팅)
├── login/                로그인
├── forgot-password/      비밀번호 찾기
├── profile-setup/        프로필 설정 (신규 가입 마지막 단계)
└── (app)/                로그인 후 서비스 화면 (사이드바 포함)
    ├── layout.tsx        사이드바 + 헤더
    ├── projects/         프로젝트 (홈)
    ├── partners/         파트너 추천 (E1)
    ├── assets/           에셋 생성 (E2) + 가이드 검증 (E3)
    └── monitoring/       무단 사용 모니터링 (E4)

components/
├── ui/                   shadcn/ui 컴포넌트 (직접 수정 지양)
├── domain/               서비스 전용 컴포넌트
└── layout/               사이드바 · 헤더

lib/
├── *-store.ts            데이터 저장소 → 백엔드 교체 지점
├── mock/                 임시 데이터 + 타입 정의
└── utils.ts              cn() 등 유틸
```

---

## 주요 화면 흐름

### 인증
```
랜딩 → 로그인(이메일 입력)
         ├─ 기존 회원 → 프로젝트(홈)
         └─ 신규 회원 → 프로필 설정 → 프로젝트(홈)
```

### 에셋 생성 (3단계)
```
1단계 생성   /assets/[id]          이미지 생성 → 채택
2단계 검증   /assets/[id]/verify   가이드 규칙 검증 → 최종본 선택
3단계 최종   /assets/[id]/final    최종본 관리
```
각 단계의 이미지는 `lib/session-assets-store.ts`가 관리합니다.

---

## 백엔드 연동 가이드

### 교체 지점 = `lib/` 의 store 파일들

화면 코드는 저장소를 직접 만지지 않고 **아래 파일의 함수만 호출**합니다.
각 파일 내부의 `localStorage` 접근을 API 호출로 바꾸면 화면은 거의 수정 없이 동작합니다.

| 파일 | 담당 데이터 | 저장 키 |
|---|---|---|
| `lib/account-store.ts` | 계정·프로필 | `claps:accounts`, `claps:current-email` |
| `lib/projects-store.ts` | 프로젝트 목록 | `claps:projects` |
| `lib/assets-store.ts` | 생성 세션 목록 | `claps:assets:groups:v2` |
| `lib/session-assets-store.ts` | 세션별 단계 이미지 | `claps:session:{id}` / `claps:verify:{id}` / `claps:final:{id}` |
| `lib/monitoring-store.ts` | 탐지 기록 | `claps:monitoring:records` |
| `lib/project-cover.ts` | 썸네일 계산 (파생 로직) | — |

### 데이터 타입

백엔드 응답 형식의 기준이 되는 타입은 `lib/mock/` 에 정의돼 있습니다.

- `Project`, `ProjectStatus`, `ProjectCover` — `lib/mock/projects.ts`
- `AssetSession`, `SessionGroup` — `lib/mock/assets.ts`
- `ProjectSession`, `ProjectDetail` — `lib/mock/project-detail.ts`
- `Partner`, `Factor` — `lib/mock/partners.ts`
- `RuleResult`, `Verdict` — `lib/mock/verify.ts`
- `Account` — `lib/account-store.ts`
- `ScanResult`, `SavedMonitoringRecord` — `lib/monitoring-store.ts`

### 연동 시 함께 처리해야 할 것

1. **동기 → 비동기 전환**
   현재 store 함수는 값을 즉시 반환합니다(`getProjects()`). 실제 API는 `async`가 되므로, 호출하는 화면에 로딩 상태 처리가 필요합니다.

2. **인증 / 접근 제어**
   지금은 인증 가드가 없어 `/projects` 등에 주소로 바로 접근할 수 있습니다. 실제 토큰·세션 기반 인증과 `app/(app)/layout.tsx` 접근 제어가 필요합니다.
   로그인 판정도 임시입니다 — "이 브라우저에 그 이메일로 가입한 적 있는가"로 신규/기존을 나눕니다(`isRegistered()`). 비밀번호 검증 없음.

3. **서버 측 검증**
   이메일 형식 등 입력 검증이 화면에만 있습니다. 서버 검증 결과를 에러로 내려주면 기존 에러 UI에 연결할 수 있습니다.

4. **상태값 문자열**
   `ProjectStatus`가 한글 문자열(`"검증 중"` 등)입니다. API 값 규약을 정할 때 협의가 필요합니다.

### 아직 구현되지 않은 기능

- 소셜 로그인(구글·카카오) — 버튼만 있고 실제 인증 없이 바로 진입
- 비밀번호 찾기 메일 발송 — 화면 전환만 동작
- 언어(다국어) 전환 — 버튼만 존재
- 파트너 추천의 "이 파트너로 프로젝트 시작" 연결
- 실제 이미지 생성 / 가이드 검증 엔진 / 무단 사용 탐지 — 모두 임시 데이터
  (`lib/mock/verify.ts`, `app/(app)/monitoring/[id]/page.tsx`의 `MOCK_RESULTS`)

---

## 컨벤션

- 변수·함수명은 **영어**, 화면 문구와 주석은 **한글**
- 색상은 **토큰 사용** (`app/globals.css` 정의) — 하드코딩 지양
  - 뉴트럴: shadcn zinc 토큰 (`foreground`, `muted-foreground`, `border`, `card` …)
  - 브랜드: `brand` (#CA0060) — 액센트 용도만
  - 랜딩 전용: `landing-ink`, `landing-bg`
- 커밋 메시지: `[feat] / [fix] / [design] / [style] / [refactor]` + 한 줄 요약
