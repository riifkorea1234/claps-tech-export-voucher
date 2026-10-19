"use client";
import { useT } from "@/lib/i18n/provider";
import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { SocialLoginButtons } from "@/components/domain/social-login-buttons";
import { LoginEmailForm } from "@/components/domain/login-email-form";

// Email-first authentication; unconfigured social providers stay disabled.

export default function LoginPage() {
  const t = useT();
  return (
    <AuthShell>
      {/* 제목 */}
      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-2xl font-bold tracking-[-0.6px] text-foreground">
          {t("auth.get_started")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("auth.continue_with_email_or_sign_in_with_a_social")}
        </p>
      </div>

      <SocialLoginButtons />

      {/* 구분선 */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">{t("auth.or")}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* 이메일 + 계속 (동작 부품) */}
      <LoginEmailForm />

      {/* 비밀번호 찾기 */}
      <Link
        href="/forgot-password"
        className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {t("auth.forgot_your_password")}
      </Link>
    </AuthShell>
  );
}
