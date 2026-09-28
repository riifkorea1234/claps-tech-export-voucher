"use client";

import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { LoginEmailForm } from "@/components/domain/login-email-form";
import { SocialLoginButtons } from "@/components/domain/social-login-buttons";
import { useLocale } from "@/lib/i18n";

// 로그인 페이지 — 센터 정렬. 실제 인증 연동 전: 버튼은 앱(/projects)으로 이동.
export default function LoginPage() {
  const { locale, t } = useLocale();

  return (
    <AuthShell>
      {/* 제목 */}
      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-2xl font-bold tracking-[-0.6px] text-foreground">
          {t("auth.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {/* 미국은 구글 하나뿐이라 "소셜 계정" 대신 서비스 이름을 직접 쓴다 */}
          {locale === "en" ? t("auth.descGoogleOnly") : t("auth.desc")}
        </p>
      </div>

      {/* 소셜 로그인 (언어별 구성) */}
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
        {t("auth.forgot")}
      </Link>
    </AuthShell>
  );
}
