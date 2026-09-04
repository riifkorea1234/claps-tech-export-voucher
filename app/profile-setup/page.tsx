import { AuthShell } from "@/components/layout/auth-shell";
import { ProfileSetupForm } from "@/components/domain/profile-setup-form";

// 프로필 설정 페이지 (신규 회원 마지막 단계)
// 항목은 피그마 참고 (이름 / 조직명 / 업종·직무)

export default async function ProfileSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <AuthShell>
      {/* 제목 + 입력 + 시작하기 (동작 부품) */}
      <ProfileSetupForm email={email ?? ""} />
    </AuthShell>
  );
}
