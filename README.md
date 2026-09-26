# CLAPS Studio 2.0

IP-Safe AI 미들웨어. 라이선스 규칙에 맞춰 브랜드 이미지를 **생성·검증**하고, 무단 사용까지 **모니터링**하는 서비스를 개발하고 있습니다.

> **현재 상태**: 서버 인증·프로젝트/세션·최종화/ZIP·규칙 기반 추천·모니터링 기록/원본·관리자 기능을 구현했습니다. Phase 11 로컬 통합 회귀 196개와 Docker 백업/복구 검증을 통과했습니다. 실제 AI 생성·검증·검색 공급자 및 운영 출시 조건은 보류 상태입니다.
> [Phase 11 결과](md/phase11-result.md) · [HTML 보고서](md/phase11-result.html) · [검증 체크리스트](md/phase11-test-checklist.md)
> 가상 샘플 체험: `http://127.0.0.1:3193` · 계정은 로컬 `.env.seed.local` · [콘텐츠·시드 추가 검수](md/content-seed-result.md)
> 서버 연결 방법은 [**HANDOFF.md**](./HANDOFF.md) 를 참고하세요.
> Phase 1 서버·DB·Docker 기반 실행은 [운영 가이드](scripts/README.md), 스키마·seed는 [DB 가이드](db/README.md)를 참고하세요. Phase 4의 서버 계약과 파일 제한은 HANDOFF.md를 참고하세요.

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
         ├─ 기존 회원 → 비밀번호 로그인 → 프로필/프로젝트(홈)
         └─ 신규 회원 → 비밀번호 설정 → 이메일 확인 → 프로필 설정 → 프로젝트(홈)
```

### 에셋 생성 (3단계)

```
1단계 생성   /assets/[id]          이미지 생성 → 채택
2단계 검증   /assets/[id]/verify   가이드 규칙 검증 → 최종본 선택
3단계 최종   /assets/[id]/final    최종본 관리
```


### Phase 2 언어팩

고정 UI는 `messages/ko`와 `messages/en`에서 관리합니다. `GET /api/locales`는 활성 DB 언어와 완성된 배포 파일팩의 교집합만 반환하며, `POST /api/locale`은 same-origin JSON 요청으로 HttpOnly 언어 쿠키를 저장합니다. URL과 현재 폼/필터/생성 결과를 유지합니다. 로그인 회원의 언어 선호도 DB에 저장하며 계정 전환 시 회원 선호로 쿠키를 동기화합니다.

기존 Phase 1 seed는 언어를 비활성으로 등록합니다. 파일팩 검증 후 **검수된 배포 환경**에서 `corepack pnpm i18n:activate`를 한 번 실행하면 초기 ko/en을 활성화합니다. 이미 변경한 version의 운영 설정은 재실행으로 덮어쓰지 않습니다. 로컬에서도 DB migration과 seed가 선행되어야 합니다. `corepack pnpm test:i18n`으로 key/변수/enum/문구 누락을 검사합니다.

리버스 프록시 환경에서는 `APP_ORIGIN`을 실제 공개 origin(예: `https://studio.example.com`)으로 설정하세요. 로컬 검증에서는 브라우저가 접속하는 origin을 사용합니다. 언어 변경 API는 다른 origin과 누락된 Origin을 거절합니다.

번역 검수 목록과 이미지 처리 내역은 [Phase 2 문구 조사](md/phase2-copy-inventory.md)에 있습니다. 업무 콘텐츠는 파일팩에 넣지 않으며, `lib/i18n/content.ts`의 게시본 fallback 서비스를 권한 확인을 마친 리소스 서비스에서 호출합니다. 초안과 원문을 구분하고 실제 제공 언어를 반환합니다.


### Phase 3 인증

비밀번호 8~128자, HttpOnly/SameSite 세션 7일, 이메일 확인 링크 24시간, 재설정 링크 1시간을 적용합니다. 비밀번호 변경에는 현재 비밀번호가 필요하며 변경/복구/정지/탈퇴 시 기존 세션을 폐기합니다. URL 이메일이나 localStorage로 로그인할 수 없습니다. 회원 선호·프로필은 인증 주체에만 저장됩니다.

현재 메일은 **명시적으로 활성화한 로컬 sandbox**에서만 처리합니다. 실제 이메일 발송, 소셜 로그인, 공개 관리자 접근, 데이터 영구 삭제는 활성화되지 않았습니다. 설정·sandbox 확인·최초 관리자 CLI는 [실행 안내](scripts/README.md)를 참고하세요. 업무 화면의 localStorage/mock은 후속 Phase에서 서버 데이터로 전환합니다.

Phase 5 adds the PostgreSQL job queue, worker lease/heartbeat/recovery, safe linked retries, cancellation and the authenticated `/jobs/:id` status page. Production AI handlers remain disabled until their owning Phase. Approved development limits and the handler contract are documented in [HANDOFF](HANDOFF.md); file maintenance preserves physical files under the existing retention policy.

## Phase 6 운영 관리

`/admin`에서 CLI 지정 관리자 계정의 비밀번호를 재확인하면 현재 세션에 15분간 운영 기능을 허용합니다. 회원/프로젝트/파트너/작업 관리, 감사·언어 현황과 콘텐츠 번역 초안/게시/JSON 가져오기를 제공합니다. 가이드·모니터링 실행 기능은 Phase 7/10 범위입니다. [Phase 6 결과](md/phase6-result.md)와 [서버 계약](HANDOFF.md)을 참고하세요. 실제 운영 공개와 콘텐츠 검수는 별도 게이트입니다.

## Phase 8 독립 서버·다운로드

서버 근거에 따른 최종 확정/취소, 과거 가이드 근거 보존, 최종본 단일·선택 ZIP 다운로드를 제공합니다. 검증 공급자는 등록되지 않아 새 검증 요청은 503이며, 미검증 에셋을 확정할 수 없습니다. ZIP은 50개/100MiB, 24시간 유효하고 현재 소유권·최종 상태를 재검사합니다. [독립 범위 결과](md/phase8-result.md)와 [실행 계약](HANDOFF.md)을 참고하세요. 실제 공급자 평가를 포함한 전체 Phase 8 완료를 의미하지 않습니다.

### Phase 9 매칭

매칭 기준·참조 이미지의 서버 저장/복원과 공개 파트너에 대한 규칙 기반 추천을 연결했습니다. IP·세계관·브랜드·업종의 정확한 단어 일치율과 근거를 표시하며, 재추천 실패 시 이전 성공 결과를 유지합니다. 현재 비공개 파트너는 과거 결과에서도 제외됩니다. 외부 AI 분석/가격·팬덤 추정은 사용하지 않습니다. 배포 전에 `0006_fluffy_overlord.sql`을 적용하고 web/worker를 함께 갱신하세요. 실제 운영 파트너 등록과 사업 품질 검수는 별도입니다.

Phase 10 독립 모니터링: 서버 원본·기록 CRUD, 보관/복구, 실행 이력과 관리자 운영을 연결했다. `0007_last_skreet.sql` 적용이 필요하다. 검색 공급자는 미연결이며 탐지 요청은 503을 반환한다. 기존 브라우저 목업 결과를 서버 이력으로 이관하지 않는다. 상세 계약은 [HANDOFF](HANDOFF.md)의 Phase 10 절을 참고한다.
