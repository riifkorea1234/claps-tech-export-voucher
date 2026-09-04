import Link from "next/link";
import Image from "next/image";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileSetupForm } from "@/components/domain/profile-setup-form";

// 프로필 설정 페이지 (신규 회원 마지막 단계 · 로그인 페이지와 동일 톤)
// 항목은 피그마 참고 (이름 / 조직명 / 업종·직무). UI는 우리 톤.

export default async function ProfileSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

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

      {/* 언어 버튼 */}
      <Button
        variant="outline"
        size="sm"
        className="absolute top-6 right-6 h-8 gap-1.5 rounded-[10px]"
      >
        <Globe className="size-4" />
        언어
      </Button>

      <div className="flex w-full max-w-[360px] flex-col">
        {/* 제목 + 입력 + 시작하기 (동작 부품) */}
        <ProfileSetupForm email={email ?? ""} />
      </div>
    </div>
  );
}
