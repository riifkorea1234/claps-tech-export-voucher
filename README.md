# CLAPS Studio 2.0 — 프론트엔드

IP-Safe AI 미들웨어. 라이선스 규칙에 맞춰 브랜드 이미지를 **생성·검증**하고, 무단 사용까지 **모니터링**하는 서비스의 화면(프론트엔드)입니다.

> **현재 상태**: 화면(UI) 구현 완료, **백엔드 미연동**.
> 서버 연결 방법은 [**HANDOFF.md**](./HANDOFF.md) 를 참고하세요.

---

## 기술 스택


| 항목      | 사용 기술                                                              |
| ------- | ------------------------------------------------------------------ |
| 프레임워크   | Next.js 16 (App Router)                                            |
| 언어      | TypeScript                                                         |
| 스타일     | Tailwind CSS v4                                                    |
| UI 컴포넌트 | shadcn/ui (style `radix-vega`, base `zinc`)                        |
| 아이콘     | lucide-react (기본), @phosphor-icons/react (랜딩), @tabler/icons-react |
| 폰트      | Pretendard                                                         |


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

