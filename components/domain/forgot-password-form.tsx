"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/lib/i18n";

// 간단한 이메일 형식 검사
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 비밀번호 찾기 폼 (제목 + 동작 부분)
// - 이메일이 비어 있으면 '재설정 링크 보내기' 버튼 비활성화
// - 제출 시 형식이 틀리면 error 상태, 맞으면 발송 완료 화면으로 전환
// - 발송 완료 화면에서는 상단 안내 문구(부제)를 숨김
// - 실제 메일 발송은 백엔드 연동 후 (지금은 화면 전환만)
export function ForgotPasswordForm() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);
  const [sent, setSent] = useState(false);

  const canSubmit = email.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError(true);
      return;
    }
    setSent(true);
  }

  return (
    <>
      {/* 제목 (발송 완료 시 부제는 숨김) */}
      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-2xl font-bold tracking-[-0.6px] text-foreground">
          {t("auth.resetTitle")}
        </h2>
        {!sent && (
          <p className="text-sm text-muted-foreground">
            {t("auth.resetDesc")}
          </p>
        )}
      </div>

      {sent ? (
        // 발송 완료 화면
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-brand/10">
            <MailCheck className="size-6 text-brand" />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm text-foreground">
              <br />
              {(() => {
                const [before, after] = t("auth.resetSent").split("{email}");
                return (
                  <>
                    {before}
                    <span className="font-medium">{email.trim()}</span>
                    {after}
                  </>
                );
              })()}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("auth.resetSpam")}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setSent(false)}
            className="h-11 w-full rounded-lg text-sm font-medium"
          >
            {t("auth.resendLink")}
          </Button>
        </div>
      ) : (
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
              placeholder="you@company.com"
              aria-invalid={error}
              className="h-11"
            />
            {error && (
              <p className="text-sm text-destructive">
                {t("auth.emailInvalid")}
              </p>
            )}
          </div>

          {/* 재설정 링크 보내기 */}
          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-11 w-full rounded-lg text-sm font-medium"
          >
            {t("auth.sendLink")}
          </Button>
        </form>
      )}
    </>
  );
}
