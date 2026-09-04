"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 간단한 이메일 형식 검사
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 비밀번호 찾기 폼 (제목 + 동작 부분)
// - 이메일이 비어 있으면 '재설정 링크 보내기' 버튼 비활성화
// - 제출 시 형식이 틀리면 error 상태, 맞으면 발송 완료 화면으로 전환
// - 발송 완료 화면에서는 상단 안내 문구(부제)를 숨김
// - 실제 메일 발송은 백엔드 연동 후 (지금은 화면 전환만)
export function ForgotPasswordForm() {
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
          비밀번호 찾기
        </h2>
        {!sent && (
          <p className="text-sm text-muted-foreground">
            가입한 이메일로 재설정 링크를 보내드릴게요.
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
              <span className="font-medium">{email.trim()}</span> 으로
              <br />
              재설정 링크를 보냈어요.
            </p>
            <p className="text-sm text-muted-foreground">
              메일이 오지 않았다면 스팸함을 확인해 주세요.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setSent(false)}
            className="h-11 w-full rounded-lg text-sm font-medium"
          >
            다시 보내기
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-[22px]">
          {/* 이메일 */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(false);
              }}
              placeholder="you@company.com"
              aria-invalid={error}
              className={cn(
                "h-11 w-full rounded-lg border bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:outline-none",
                error
                  ? "border-destructive focus:ring-destructive/30"
                  : "border-input focus:ring-ring/40",
              )}
            />
            {error && (
              <p className="text-sm text-destructive">
                올바른 이메일 주소를 입력해주세요.
              </p>
            )}
          </div>

          {/* 재설정 링크 보내기 */}
          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-11 w-full rounded-lg text-sm font-medium"
          >
            재설정 링크 보내기
          </Button>
        </form>
      )}
    </>
  );
}
