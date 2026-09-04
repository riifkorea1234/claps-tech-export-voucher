import Link from "next/link";
import Image from "next/image";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

// 로그인 전 화면 공통 틀 (로고 · 언어 버튼 · 가운데 폼 영역)
// 로그인 / 비밀번호 찾기 / 프로필 설정에서 공용으로 사용
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 py-16">
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

      {/* 언어 버튼 (다국어 미구현) */}
      <Button
        variant="outline"
        size="sm"
        className="absolute top-6 right-6 h-8 gap-1.5 rounded-[10px]"
      >
        <Globe className="size-4" />
        언어
      </Button>

      <div className="flex w-full max-w-[360px] flex-col gap-[22px]">
        {children}
      </div>
    </div>
  );
}
