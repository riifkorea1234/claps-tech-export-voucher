"use client";
import { useLanguage } from "@/lib/i18n/provider";
import Image from "next/image";
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


export function SocialLoginButtons() {
  const { locale, t } = useLanguage();
  const providers = locale.split("-")[0] === "ja" ? ["google", "line"] : locale.split("-")[0] === "ko" ? ["google", "kakao", "naver"] : ["google"];
  return <div className="flex flex-col gap-2.5">
    {providers.map(provider => <button key={provider} type="button" disabled aria-describedby="social-unavailable" className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60">
      {provider === "google" ? <GoogleIcon /> : provider === "kakao" ? <KakaoIcon /> : provider === "line" ? <Image src="/line-logo-white.png" width={24} height={24} alt="" className="rounded bg-[var(--platform-line)]" /> : <span aria-hidden="true">N</span>}
      {t(`auth.continue_with_${provider}`)}
    </button>)}
    <p id="social-unavailable" className="text-center text-xs text-muted-foreground">{t("auth.socialUnavailable")}</p>
  </div>;
}
