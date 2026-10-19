# Phase12 독립 완료 리뷰 — locale/profile 통합 기반

## 1. 판정

**CHANGES_REQUESTED** — Major 2, Minor 7, Nit 2. Critical 0.

- 리뷰일 2026-10-01(KST). reviewer는 기존 Claude(dispatch task_967529d9441b)이며 소스 구현은 수정하지 않았다. 이 문서만 작성했다.
- 대상은 `/mnt/f/claps-product`의 `feature/backend`, HEAD `b4749eb`와 그 위의 미커밋 변경(수정 43 + 신규 소스 21 + Phase12 문서·증거)이다. reviewer worktree는 기준으로 쓰지 않았다.
- 핵심 계약은 대체로 충족했다. DB migration, strict profile DTO, 3팩 parity, 오류 6곳, seed/demo가 여기에 해당한다. 다만 승인 통합계약 §2.1의 "ja font-weight·밀도 토큰 유지"와 T13 200% 대응 이식이 빠져 있고, 결과 보고서가 이 두 항목을 완료로 기술한다. 따라서 Phase12 기술범위는 아직 COMPLETED로 판정할 수 없다.
- Phase11 전체 IN_PROGRESS와 외부 출시 BLOCKED는 유지된다. 원어민 승인, 실제 OAuth, 운영 ja 활성화, 실공급자 게이트는 기술 판정과 분리했다(§6).

## 2. reviewer가 직접 수행한 검증

모든 재현은 합성 데이터와 격리 PostgreSQL(claps-phase12, 127.0.0.1:55437)에서만 했다. reviewer 전용 DB와 서버는 종료 후 정리했고, 기존 보존 DB 5개와 ja disabled/version1 상태는 그대로 유지된다.

| 검증 | 방법 | 결과 |
| --- | --- | --- |
| diff 전수 읽기 | `git diff`와 신규 파일 전체: schema/0009/journal, policy/service, account/contracts, errors/http/client/account-store, seed/demo, i18n core/provider, layout/globals/font, profile·my-page·setup·social·field-requirement·table·factor·empty-state·RecordView, 테스트·checker | 아래 findings |
| 원본 커밋 대조 | T01 `a4e66539`, T13 `185f5978`, T02/T04~T07/T09/T11 `git show --stat`/diff와 현재 파일 비교 | M1, M2, m1 |
| 3팩 parity | node 스크립트로 13 namespace 키 집합과 `{var}` placeholder 비교, ja 한글 잔존 검사 | ko/en/ja 각 **1078키**, 누락·추가·placeholder 불일치 **0**. ja 한글 잔존 0 |
| evidence/review 법적 문구 | ko/en/ja 85키 전수 대조 | 권리·저작권 성립이나 법적 효력을 **보장하지 않는다**는 한정 문구 유지. 확정성 단정 0 |
| migration 독립 재현 | `CREATE DATABASE … TEMPLATE claps_test_prefix12`(0008 상태)와 빈 DB에서 `DATABASE_URL=… pnpm db:migrate` 2회씩, 파이프 없이 exit 직접 기록 | 4회 모두 exit0, `__drizzle_migrations` 10행 불변, 성명 4컬럼 nullable, legacy `name` 보존, family_name NULL(추정 backfill 0) |
| 기존 migration 불변 | `git status`/`git diff db/migrations` | 0000~0008 SQL과 snapshot 변경 0. journal에 idx9 추가만 있음 |
| unit / i18n | 소스가 같은 `/tmp/claps-phase12-sandbox`(README 2개만 다름)에서 `set -o pipefail`로 실행, 원래 명령의 exit를 기록 | `pnpm test:unit` **exit0**, 50 PASS / 13 files. `pnpm test:i18n` **exit0**, 9 PASS |
| integration 일부 | 같은 sandbox. `CREATE DATABASE claps_test_review12 TEMPLATE claps_test` 후 ja/ko 행을 UPDATE해 heap 순서를 바꾸고 `TEST_DATABASE_URL=…/claps_test_review12 pnpm exec vitest run tests/integration/{phase12,i18n,database}.test.ts` | **exit1**, 16 PASS / **1 FAIL**(m4, 행 순서 의존). 재현 후 DB 삭제 |
| lint / typecheck | 같은 sandbox, pipefail | `pnpm lint` **exit0**(오류 0, 기존 warnings 2). `pnpm typecheck` **exit0**(typegen+tsc) |
| production API 경계 | 기존 standalone 사본을 :3312에 띄우고 reviewer 복제 DB로 `/api/me` PATCH 11케이스 | 아래 표. 계약 일치 |
| production UI | Chromium 스크립트로 ko/en/ja 로그인·프로젝트·파트너·에셋·모니터링·profile-setup, 390/640/1280, html font-size 200%, 키보드 포커스, console/hydration | console·pageerror·hydration 경고 **0**. M2, m2, m3 재현 |
| 로그 수치 대조 | e2e-final/e2e-accessibility-final/demo-e2e-final/integration-linux/unit/i18n-release/final-locale-state | 보고서 수치(46/46/1/125/50/9, ja f/1)와 일치 |

전체 production E2E 46개와 demo E2E는 다시 실행하지 않았다. 이 두 항목은 coder 로그와 수치를 대조해 확인했다.

### profile API 재현 결과(production standalone)

| 케이스 | 결과 |
| --- | --- |
| ja disabled 상태에서 명시 `locale:"ja"` | 422 VALIDATION_ERROR |
| ja 활성, givenName 누락 | 422 `fieldErrors.givenName` |
| ja 전각 공백만 있는 성/이름 | 422 familyName/givenName |
| ja 50자 + 50자(결합 101자) | 422 `fieldErrors.name` |
| ja 정상(`Ｙ社`, `ﾔﾏﾀﾞ`) | 200, name `山田 太郎`, org `Y社`, kana `ヤマダ`, givenNameKana null |
| ko 저장(split 생략) | 200, split 보존(m5 참고) |
| org 공백 | 422 org |
| 미배포 `en-GB`, 비정규 `ja-JP` 명시 | 422 |
| 선호 ja + locale 없는 구 client payload | 422 familyName/givenName. status는 active 유지 |

## 3. Findings

### Major

**M1. 승인 계약의 ja 굵기·크기·자간 토큰과 en 행간 토큰이 이식되지 않았고, 결과 보고서가 이를 완료로 기술한다**

- 위치: `app/globals.css:286-294`, `md/phase12-result.md` §2 L03 행, `md/evidence/phase12/source-trace.md` T01 행
- 근거: 통합계획 §2.1은 "원본 Inter(en)/Noto Sans JP(ja)와 --font-locale/ja font-weight·밀도 토큰은 유지한다"고 정한다. 원본 T01 `a4e66539:app/globals.css`는 다음 토큰을 정의한다.
  - ja: `--text-xs`~`--text-3xl`과 각 line-height(12→14px 등, 디지털청 기준), `--font-weight-medium:400`, `--font-weight-semibold:700`, `--tracking-tight/-tighter:0em`
  - en: `--text-sm--line-height: calc(21/14)`

  현재 구현에는 이 토큰이 모두 없다. 대신 `:root[data-locale^="ja"] .font-semibold { font-weight: 600 }`가 들어 있는데, Tailwind 기본값과 같은 600이라 아무 효과가 없고 원본 의도(700과 400의 2단)와도 반대다.
- 추가: ja 블록의 `--col-updated-w`, `--col-created-w`, `--pad-page-x/y`, `--pad-card`, `--gap-section`, `--row-thumb`, `--row-card-h`, `--scan-label-w`, `--measure-body`는 저장소 어디에서도 참조되지 않는 dead token이다(`grep` 결과 globals.css에서만 등장). 반면 원본 `--factor-label-w`의 ja 값 5.5rem은 7rem으로 바뀌었는데 그 근거 기록이 없다.
- 재현: production ja `/projects`에서 `getComputedStyle(h1).fontWeight`는 `"600"`이다. 원본 계약대로라면 700이어야 한다. `grep -rn "font-weight-medium\|--text-sm--line-height" app` 결과는 0건이다.
- 수정 권고:
  1. 원본 토큰을 `@theme`/`:root[data-locale]`로 이식한다. 크기 상향은 390/200% 레이아웃 영향이 크므로 M2와 함께 재검증한다.
  2. 또는 이식하지 않기로 결정했다면 그 결정을 plan §7에 명시하고 사용자 승인을 받는다.
  3. dead token을 제거하고, `.font-semibold` 규칙은 삭제하거나 올바른 토큰으로 대체한다.
  4. result/trace의 L03 "ja weight" 기술을 실제 구현 상태에 맞게 정정한다.

**M2. T13 200% 확대 대응이 이식되지 않아 ja 1280px@200%(=640 CSS px)에서 제목 내용이 손실되고, 390/200% 검증 범위가 4화면으로 한정된다**

- 위치: `app/(app)/projects/page-content.tsx:213-219`(카드 헤더 `sm:` 분기, SearchBar `sm:w-[300px]`), `md/evidence/phase12/source-trace.md` T13 행("이식"), `md/phase12-test-checklist.md` UI-L03
- 근거: 원본 T13 `185f5978`은 WCAG 1.4.10을 이유로 `app/(app)/projects/page.tsx` 카드 헤더를 `sm`에서 `lg`로 바꾸고 `flex-wrap`을 추가했다. 여러 DropdownMenuTrigger에도 `focus-visible:ring`을 붙였다. 현재 diff에는 해당 화면 변경이 없고 전역 `:focus-visible` outline만 추가됐다.
- 재현(production standalone, ja 활성 격리 DB, 합성 계정):
  - 640×900, ja `/projects`: 카드 제목 「すべてのプロジェクト」가 **「すべ…」로 잘린다**(스크린샷으로 확인, `text-overflow:ellipsis`이고 `scrollWidth>clientWidth`). ko 「전체 프로젝트」는 잘리지 않는다.
  - 390px + html font-size 200%일 때 document 가로 넘침(px)은 다음과 같다.

    | 화면 | ja | ko |
    | --- | --- | --- |
    | `/projects/:id` | 44 | 19 |
    | `/partners/criteria` | 197 | 58 |
    | `/assets` | 314 | 259 |
    | `/profile-setup` | 78 | 55 |

    ko에도 있는 기존 넘침이지만, ja에서 모두 더 커진다. Phase12 E2E는 login·projects 목록·my-page·admin user 상세 4곳만 검사한다.
- 수정 권고:
  1. T13의 projects 헤더 `lg` 분기와 `flex-wrap`을 이식하고, 필요한 경우 focus ring도 이식한다.
  2. ja E2E에 1280@200%(viewport 640)와 390/200% 페이지군 sweep을 추가한다. 대상은 projects 상세·partners/criteria·assets·monitoring·profile-setup이며, 제목 ellipsis 손실 0과 가로 넘침 0을 확인한다.
  3. ko에도 있는 기존 넘침은 수정하거나, known baseline으로 명시하고 승인을 받아 분리한다.
  4. T13 trace 판정을 실제 이식 범위에 맞게 정정한다.

### Minor

**m1. source-trace가 변경하지 않은 파일을 "이식" 대상으로 기술한다**

- 위치: `md/evidence/phase12/source-trace.md` T02/T04/T05/T06/T07/T09/T13
- 근거: `components/layout/*`, `projects/[id]/page-content.tsx`, `partners/page-content.tsx`, `partner-card.tsx`, `asset-workspace-body.tsx`, `monitoring-workspace.tsx`, `image-lightbox.tsx`는 diff 0이다. 실제로는 기존 backend 구현을 유지하고 ja 라벨만 팩에 추가한 것으로 보인다.
- 권고: 판정을 "backend 충족 + ja 라벨(messages)만"과 같이 실제 변경 파일 기준으로 정정한다.

**m2. Inter 876,576B TTF가 ko 기본 로케일을 포함한 모든 페이지에서 preload된다. Noto는 9.59MB TTF를 압축 없이 제공한다**

- 위치: `app/layout.tsx:12-13`
- 재현: `curl -sI :3312/`의 응답 헤더에 `Link: </_next/static/media/Inter_variable-s.p….ttf>; rel=preload; as="font"`가 있다.
- 근거: 보고서는 Noto 비용만 위험으로 기록했고 Inter preload는 언급하지 않는다. 설치된 Next docs(`02-components/font.md` §preload)에 따르면 local font의 기본값은 `preload:true`다.
- 권고: Inter에 `preload:false`를 주거나 en 전용 적용을 검토한다. OFL이 허용하므로 woff2 변환과 ja subset/unicode-range 분할을 검토하고, 결과를 L03 용량 증거로 남긴다.

**m3. 레이어 밖에 둔 전역 `:focus-visible` outline이 모든 locale에서 이중 포커스 표시를 만든다**

- 위치: `app/globals.css:293`
- 근거: 이 규칙은 `@layer` 밖에 있어 Tailwind `outline-none`/`outline-hidden` 유틸리티보다 우선한다.
- 재현: ko `/login`에서 키보드로 `#email`에 포커스하면 computed outline이 `solid 2px`이고, 기존 ring box-shadow와 함께 이중 테두리가 보인다(스크린샷 확인). ko/en 기존 디자인이 변경된다.
- 권고: `@layer base`로 옮기고 `:where()`로 특이도를 낮추거나, T13처럼 요소별 `focus-visible:ring`을 이식한다.

**m4. 통합 시험이 locale 행의 물리 순서에 의존한다**

- 위치: `tests/integration/phase12.test.ts:23-24`
- 근거: `db.select().from(locales)`에 ORDER BY가 없어서 `availableLocales` 결과가 `["ko","en"]`인지가 heap 순서에 따라 달라진다.
- 재현: locale 행을 UPDATE한 적이 있는 복제 DB에서 `AssertionError: expected ['en','ko'] to deeply equal ['ko','en']`로 1 FAIL. 제품 코드는 `localeRegistry()`가 `orderBy(sortOrder)`로 정렬하므로 영향이 없다.
- 권고: 테스트 registry에 `.orderBy(locales.sortOrder)`를 붙이거나 결과를 정렬해서 비교한다.

**m5. ko/en에서 name만 바꾸면 이전 ja split name이 그대로 남아 name과 성/이름이 서로 모순된다**

- 위치: `lib/server/auth/service.ts:147-155`
- 재현: ja로 `山田/太郎`을 저장한 뒤 ko로 `name:"김철수"`를 PATCH하면 DTO가 name `김철수`, familyName `山田`, givenName `太郎`이 된다. 관리자 상세에도 두 값이 함께 보인다.
- 근거: "ko/en omitted 보존" 계약에는 부합한다. 그러나 표시 일관성에 대한 결정이 계획 어디에도 기록되어 있지 않다.
- 권고: 제품 결정을 기록한다. 선택지는 ① 현 동작 유지와 관리자 표시에 주석 추가, ② 비ja 명시 name 변경 시 split을 null로 설정 등이다. 결정된 동작에 맞는 시험을 추가한다.

**m6. 위생·사실성 문제**

- `.phase12-old-auth/`가 부모 checkout에 남아 있다. `.git/info/exclude`로 숨겨져 있을 뿐이다. 동시에 `eslint.config.mjs:26`에 이 로컬 fixture 경로가 들어가 제품 설정에 임시 경로가 섞였다.
- `tests/e2e/phase12.spec.ts`가 실행될 때마다 `md/evidence/phase12/*.png`를 덮어쓴다. 테스트가 증거 파일을 변경하는 구조다.
- `/tmp/claps-phase12-production/messages/messages/en-GB/`(13파일)가 남아 있다. 중첩 복사본이라 앱 팩 로딩에는 쓰이지 않지만, `cleanup.log`와 result §8의 "standalone에서 정리" 기술과 맞지 않는다.
- 권고:
  1. fixture를 `/tmp`로 옮기거나 checker 종료 시 정리한다. eslint ignore는 `md/evidence/**`만 남긴다.
  2. 스크린샷을 `testInfo.outputPath`로 저장하고 증거 디렉터리에는 명시적으로 복사한다.
  3. 중첩 en-GB를 manifest로 대조한 뒤 정리하고 cleanup 기록을 정정한다.

**m7. ja 초안의 용어 불일치(원어민 게이트로 인계)**

- 위치: `messages/ja/evidence.json`, `messages/ja/review.json`
- 내용: 같은 ko 「최종본」이 evidence에서는 「最終版」, review에서는 「確定版」으로 번역되어 있다. `review.hint.verified`의 「すべての規則に通過する」는 「すべての規則を満たす」 또는 「規則に合格する」가 자연스럽다.
- 성격: 키와 placeholder parity는 PASS다. 품질 판정은 외부 게이트 소관이므로 차단 사유가 아니며, 용어표에 올려 인계한다.

### Nit

- n1. ja 저장에서 결합 100자 초과 오류가 `fieldErrors.name`으로 반환되는데, ja UI에는 name 필드가 없어 사용자에게 일반 오류만 보인다. 성과 이름 input이 각각 `maxLength=100`이라 결합 101자 이상이 가능하다. 오류를 familyName/givenName 경로로 매핑하거나 결합 길이 안내를 추가하는 것을 권장한다.
- n2. `components/domain/profile-setup-form.tsx:58-59`의 들여쓰기가 주변 코드와 다르다. `SocialLoginButtons`의 LINE 배경 `bg-[#06c755]`는 직전 커밋 "하드코딩 색상을 토큰으로 교체" 방침과 맞지 않는다(브랜드 규정색이라면 토큰화 권장).

## 4. 계획 항목별 충족/누락

| 항목 | 판정 | 근거 |
| --- | --- | --- |
| L01 3팩/13ns 키·변수 parity, deployedLocales, en 유지 | **충족** | reviewer parity 스크립트 1078×3 결과 0 불일치, i18n 9 PASS, en 선택 E2E 로그 |
| L02 오류 6곳(errors/http/client/account-store/db seed/demo seed) | **충족** | diff가 통합계획 §2.1 표와 1:1 대응. errorLocales는 key에서 유도, 명시 locale 우선, html lang fallback, 번들 ja fallback unit |
| L03 local font/glyph/폐쇄망 build | 부분 충족 | next/font/local, OFL, network-none build 로그는 확인. **ja weight·크기·tracking·en 행간 토큰 누락(M1)**, Inter preload(m2), focus(m3) |
| L03 390px/200%/keyboard/print | **누락 있음** | login·my-page·admin·projects 목록만 검증. 1280@200% 제목 손실과 페이지군 넘침(M2) |
| L04 code/ISO/search 정규화 | **충족** | 허용목록(성명·org·q)만 적용, 전각 punctuation/호환문자/password 제외 unit, 서버 ISO/enum 유지 |
| L05 strict DTO·ja 필수/kana 선택·locale 검증·기존 계정 access·footer·배지 | **충족**(m5는 결정 필요) | API 11케이스 재현, cross-account/strict 거절 테스트, footer E2E, 필수/선택 배지 |
| L06 migration 빈/0008 clone/replay/보존/구코드 | **충족** | reviewer 독립 재현(4회 exit0, backfill 0), 구코드 smoke 로그 |
| L06 seed ja disabled·activate ko/en·demo ko/en + ja ko fallback | **충족**(로그 확인) | integration 코드와 로그, final-locale-state ja f/1. demo는 재실행하지 않고 로그로 확인 |
| A01 이메일 인증 유지·locale별 disabled social·LINE 자산·T18 미복원 | **충족** | ko Google/Kakao/Naver disabled 스크린샷, social UI 코드, login-email-form 변경 0 |
| T22 inline locale script 없음·hydration 경고 0 | **충족** | layout은 서버 `data-locale`, provider effect 동기화. reviewer의 ja 6페이지 console 0 |
| 3팩 release/en-GB 정리 | 부분 충족 | 앱 팩은 ko/en/ja만. /tmp standalone에 중첩 en-GB 잔여(m6) |
| 문서 사실성(동일 MD/HTML·수치) | 부분 충족 | 수치는 로그와 일치. L03/T01/T13/trace 기술 오류(M1/M2/m1) |
| Next docs/AGENTS 준수 | **충족** | 설치된 Next 16.3.3 docs의 font local API(`src`/`variable`/`weight`/`preload`)와 사용이 일치, typegen 통과 |

## 5. 재시험 요구(coder 수정 후)

1. M1/M2 수정 후 `pnpm lint`, `typecheck`, `test:unit`, `test:i18n`, network-none build를 다시 실행한다.
2. production 전체 E2E를 재실행하고, 새 ja 확대 sweep을 포함한다. 결과로 고유 수를 갱신한다.
3. m4 수정 후 integration 전체를 재실행한다.
4. 수정된 CSS 토큰이 ko 화면에 영향이 없는지 회귀를 확인한다. ko 스크린샷 또는 computed style 비교를 쓴다.
5. result MD/HTML, checklist, source-trace의 L03/T01/T13/cleanup 기술을 정정하고, 동일성 검사를 다시 실행한다.

## 6. 외부 게이트(기술 판정과 분리, 변동 없음)

| 게이트 | 상태 |
| --- | --- |
| ja 원어민/제품 용어 승인(m7 포함) | BLOCKED 외부 |
| 실제 OAuth provider/credential | BLOCKED 외부. 현재 모든 social 버튼은 disabled이고 활성 UI 0 |
| 운영 ja 활성화 | BLOCKED 외부. seed·activate는 ja disabled 유지 |
| 실공급자·과금·법무/RPO·RTO·출시(Phase11 이월) | BLOCKED 외부. Phase11 IN_PROGRESS 유지 |
| Phase13~17 기능 | 미착수(정상). evidence/review namespace는 팩 기반만 제공 |

## 7. 인계

Phase12 완료 판정과 후속 수정은 coder Task가 맡는다. reviewer는 소스를 수정하지 않았다.

재현 중 만든 리소스는 다음과 같다.

- reviewer 전용 복제 DB 3개(claps_test_review12/rv12up/rv12empty): 삭제함
- standalone 사본 서버(:3312): 종료함

기존 보존 DB(claps_test/_empty12/_prefix12/_upgrade12/claps_demo), sandbox, 컨테이너는 변경하지 않았다. claps_test의 ja는 disabled/version1 그대로다.
