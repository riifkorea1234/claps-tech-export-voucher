import Link from "next/link";
import Image from "next/image";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ForgotPasswordForm } from "@/components/domain/forgot-password-form";

// 비밀번호 찾기 페이지 (로그인 페이지와 동일 톤)
// 이메일로 재설정 링크 발송. 실제 발송은 백엔드 연동 후.

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6">
      {/* 상단 좌측 로고 (클릭 시 랜딩으로) */}
      <Link href="/" className="absolute top-6 left-6 flex h-8 items-center">
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
        {/* 제목 + 이메일 + 발송 (동작 부품) */}
        <ForgotPasswordForm />

        {/* 로그인으로 돌아가기 */}
        <Link
          href="/login"
          className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
