import Link from "next/link";
import Image from "next/image";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginEmailForm } from "@/components/domain/login-email-form";

// 로그인 페이지 — 센터 정렬. 실제 인증 연동 전: 버튼은 앱(/projects)으로 이동.

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

export default function LoginPage() {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6">
      {/* 상단 좌측 로고 (클릭 시 랜딩으로) */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex h-8 items-center"
      >
        <Image
          src="/claps-logo.svg"
          alt="CLAPS"
          width={96}
          height={18}
          priority
          className="[filter:brightness(0)]"
        />
      </Link>

      {/* 언어 버튼 */}
      <Button
        variant="outline"
        size="sm"
        className="absolute top-6 right-6 h-8 gap-1.5 rounded-[10px]"
      >
        <Globe className="size-4" />
        언어
      </Button>

      <div className="flex w-full max-w-[360px] flex-col gap-[22px]">
        {/* 제목 */}
        <div className="flex flex-col gap-2 text-center">
          <h2 className="text-2xl font-bold tracking-[-0.6px] text-foreground">
            시작하기
          </h2>
          <p className="text-sm text-muted-foreground">
            이메일로 계속하거나 소셜 계정으로 로그인하세요.
          </p>
        </div>

        {/* 소셜 로그인 */}
        <div className="flex flex-col gap-2.5">
          <Link
            href="/projects"
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            <GoogleIcon />
            Google로 계속
          </Link>
          <Link
            href="/projects"
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            <KakaoIcon />
            카카오로 계속
          </Link>
        </div>

        {/* 구분선 */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">또는</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* 이메일 + 계속 (동작 부품) */}
        <LoginEmailForm />

        {/* 비밀번호 찾기 */}
        <Link
          href="/forgot-password"
          className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          비밀번호를 잊으셨나요?
        </Link>
      </div>
    </div>
  );
}
