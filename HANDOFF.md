# 백엔드 연동 가이드

CLAPS Studio 2.0 프론트엔드를 실서버에 연결할 때 참고하는 문서입니다.
프로젝트 개요·실행 방법·폴더 구조는 [README.md](./README.md)를 참고하세요.

> **현재 상태**: 화면(UI) 구현 완료, 백엔드 미연동.
> 모든 데이터는 브라우저 저장소(localStorage)에 저장되는 임시 구현입니다.

---

## 1. 교체 지점 = `lib/` 의 store 파일들

화면 코드는 저장소를 직접 만지지 않고 **아래 파일의 함수만 호출**합니다.
각 파일 내부의 `localStorage` 접근을 API 호출로 바꾸면 화면은 거의 수정 없이 동작합니다.

| 파일 | 담당 데이터 | 저장 키 |
| --- | --- | --- |
| `lib/account-store.ts` | 계정·프로필 | `claps:accounts`, `claps:current-email` |
| `lib/projects-store.ts` | 프로젝트 목록 | `claps:projects` |
| `lib/assets-store.ts` | 생성 세션 목록 | `claps:assets:groups:v2` |
| `lib/session-assets-store.ts` | 세션별 단계 이미지 | `claps:session:{id}` / `claps:verify:{id}` / `claps:final:{id}` |
| `lib/monitoring-store.ts` | 탐지 기록 | `claps:monitoring:records` |
| `lib/project-cover.ts` | 썸네일 계산 (파생 로직) | — |

---

## 2. 데이터 타입

백엔드 응답 형식의 기준이 되는 타입입니다.

| 타입 | 위치 |
| --- | --- |
| `Project`, `ProjectStatus`, `ProjectCover` | `lib/mock/projects.ts` |
| `AssetSession`, `SessionGroup` | `lib/mock/assets.ts` |
| `ProjectSession`, `ProjectDetail` | `lib/mock/project-detail.ts` |
| `Partner`, `Factor` | `lib/mock/partners.ts` |
| `RuleResult`, `Verdict` | `lib/mock/verify.ts` |
| `Account` | `lib/account-store.ts` |
| `ScanResult`, `SavedMonitoringRecord` | `lib/monitoring-store.ts` |
| `GeneratedAsset` | `components/domain/asset-result-card.tsx` |

---

## 3. 연동 시 함께 처리해야 할 것

### 3.1 동기 → 비동기 전환
현재 store 함수는 값을 즉시 반환합니다(`getProjects()`).
실제 API는 `async`가 되므로, 호출하는 화면에 **로딩 상태 처리**가 필요합니다.

### 3.2 인증 / 접근 제어
- 지금은 **인증 가드가 없어** `/projects` 등에 주소로 바로 접근할 수 있습니다.
  실제 토큰·세션 기반 인증과 `app/(app)/layout.tsx` 접근 제어가 필요합니다.
- 로그인 판정도 임시입니다. "이 브라우저에 그 이메일로 가입한 적 있는가"로
  신규/기존을 나눕니다(`isRegistered()`). **비밀번호 검증 없음.**

### 3.3 서버 측 검증
이메일 형식 등 입력 검증이 화면에만 있습니다.
서버 검증 결과를 에러로 내려주면 기존 에러 UI에 그대로 연결할 수 있습니다.

### 3.4 상태값 문자열
`ProjectStatus`가 한글 문자열(`"검증 중"` 등)입니다.
API 값 규약을 정할 때 협의가 필요합니다.

---

## 4. 에셋 생성 3단계 데이터 흐름

```
1단계 생성   /assets/[id]          이미지 생성 → 채택
2단계 검증   /assets/[id]/verify   가이드 규칙 검증 → 최종본 선택
3단계 최종   /assets/[id]/final    최종본 관리
```

각 단계의 이미지는 `lib/session-assets-store.ts`가 관리합니다.

```ts
getStageAssets("generated" | "verify" | "final", sessionId)  // 조회
setStageAssets(stage, sessionId, assets)                     // 저장
hasStageAssets(stage, sessionId)                             // 1장 이상 있는지
clearSessionAssets(sessionId)                                // 세션 삭제 시 정리
```

목록의 진행 단계 배지(생성/검증/최종)는 이 데이터를 기준으로 판별합니다.

---

## 5. 아직 구현되지 않은 기능

| 기능 | 현재 상태 |
| --- | --- |
| 소셜 로그인 (구글·카카오) | 버튼만 있고 인증 없이 바로 진입 |
| 비밀번호 찾기 메일 발송 | 화면 전환만 동작 |
| 언어(다국어) 전환 | 버튼만 존재 |
| 파트너 추천 → 프로젝트 시작 연결 | 미구현 |
| 이미지 생성 엔진 | 임시 데이터 |
| 가이드 검증 엔진 | 임시 판정 (`lib/mock/verify.ts`) |
| 무단 사용 탐지 | 임시 데이터 (`app/(app)/monitoring/[id]/page.tsx`의 `MOCK_RESULTS`) |

---

## 6. 알려진 정리 대상

- **lint 경고 19건** — 전부 `react-hooks/set-state-in-effect` 한 종류입니다.
  데이터 로딩을 비동기로 바꿀 때 함께 정리하는 것을 권합니다.
- 앱 화면 일부에 **하드코딩된 색상**이 남아 있습니다 (모니터링 상세 등).
- 앱 화면 일부 이미지가 `next/image` 최적화를 사용하지 않습니다.
