"use client";

import Link from "next/link";
import Image from "next/image";
import { useLocale } from "@/lib/i18n";

/* 소셜 로그인 버튼 — 나라마다 쓰는 서비스가 달라 언어별로 구성이 다르다.
   한국   구글 + 카카오
   미국   구글만           (카카오는 한국 전용 서비스)
   일본   구글 + LINE      (카카오 자리를 LINE이 대신함)
   실제 인증 연동 전이라 버튼은 앱(/projects)으로 이동만 한다. */

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="size-[18px]" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg viewBox="0 0 18 18" className="size-[18px]" aria-hidden>
      <path
        fill="#191919"
        d="M9 1.5C4.86 1.5 1.5 4.15 1.5 7.42c0 2.11 1.4 3.96 3.5 5.01-.15.55-.56 2.02-.64 2.33-.1.39.14.38.3.28.13-.08 2.04-1.39 2.87-1.96.32.05.64.07.97.07 4.14 0 7.5-2.65 7.5-5.92C16.5 4.15 13.14 1.5 9 1.5z"
      />
    </svg>
  );
}

/* LINE — 공식 브랜드 마크를 이미지로 쓴다. 로고는 손으로 그리지 않는다.
   초록 버튼 위에 올리는 흰색 판(public/line-logo-white.png).
   글자 부분은 뚫려 있어 초록이 비친다 — LINE 공식 버튼과 같은 방식이다. */
function LineIcon() {
  return (
    <Image
      src="/line-logo-white.png"
      alt=""
      width={19}
      height={18}
      className="h-[18px] w-[19px]"
      aria-hidden
    />
  );
}

const BUTTON_CLASS =
  "flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-muted/50";

/* LINE 은 공식 버튼 색이 정해져 있어 예외로 브랜드 색을 그대로 쓴다 (#06C755) */
const LINE_BUTTON_CLASS =
  "flex h-11 items-center justify-center gap-2 rounded-lg border border-transparent bg-[#06C755] text-sm font-medium text-white transition-colors hover:bg-[#05B34D]";

export function SocialLoginButtons() {
  const { locale, t } = useLocale();

  return (
    <div className="flex flex-col gap-2.5">
      <Link href="/projects" className={BUTTON_CLASS}>
        <GoogleIcon />
        {t("auth.continueGoogle")}
      </Link>

      {locale === "ko" && (
        <Link href="/projects" className={BUTTON_CLASS}>
          <KakaoIcon />
          {t("auth.continueKakao")}
        </Link>
      )}

      {locale === "ja" && (
        <Link href="/projects" className={LINE_BUTTON_CLASS}>
          <LineIcon />
          {t("auth.continueLine")}
        </Link>
      )}
    </div>
  );
}
