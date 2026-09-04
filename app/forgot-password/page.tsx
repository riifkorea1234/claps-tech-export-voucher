import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { ForgotPasswordForm } from "@/components/domain/forgot-password-form";

// 비밀번호 찾기 페이지 — 이메일로 재설정 링크 발송
// 실제 발송은 백엔드 연동 후 (지금은 화면 전환만)

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      {/* 제목 + 이메일 + 발송 (동작 부품) */}
      <ForgotPasswordForm />

      {/* 로그인으로 돌아가기 */}
      <Link
        href="/login"
        className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        로그인으로 돌아가기
      </Link>
    </AuthShell>
  );
}
