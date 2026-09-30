"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isRegistered, setCurrentEmail } from "@/lib/account-store";
import { useLocale } from "@/lib/i18n";

// 간단한 이메일 형식 검사
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ⚠️ 임시 — 오류 문구를 화면에서 확인하기 위한 장치.
// 형식이 맞는 주소로는 오류를 볼 수 없어서, 예시 주소 하나를 일부러 오류 처리한다.
// 화면 점검이 끝나면 이 상수와 아래 handleSubmit 의 검사 한 줄을 지운다.
const DEMO_INVALID_EMAIL = "you@company.com";

// 로그인 이메일 폼 (동작 부분만 분리한 클라이언트 부품)
// - 이메일이 비어 있으면 '계속' 버튼 비활성화
// - 제출 시 형식이 틀리면 error 상태 표시
// - 기존 회원이면 /projects, 신규면 /profile-setup으로 이동
export function LoginEmailForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);

  const canSubmit = email.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    // DEMO_INVALID_EMAIL 조건은 임시 (위 주석 참고)
    if (
      !EMAIL_RE.test(value) ||
      value.toLowerCase() === DEMO_INVALID_EMAIL
    ) {
      setError(true);
      return;
    }
    if (isRegistered(value)) {
      // 기존 회원 → 바로 프로젝트로
      setCurrentEmail(value);
      router.push("/projects");
    } else {
      // 신규 회원 → 프로필 설정으로 (이메일 전달)
      router.push(`/profile-setup?email=${encodeURIComponent(value)}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-[22px]">
      {/* 이메일 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t("auth.email")}</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(false);
          }}
          placeholder={t("auth.emailPlaceholder")}
          aria-invalid={error}
          className="h-11"
        />
        {error && (
          <p className="text-sm text-destructive">
            {t("auth.emailInvalid")}
          </p>
        )}
      </div>

      {/* 계속 */}
      <Button
        type="submit"
        disabled={!canSubmit}
        className="h-11 w-full rounded-lg text-sm font-medium"
      >
        {t("auth.continue")}
      </Button>
    </form>
  );
}
