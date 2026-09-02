import Link from "next/link";
import { Button } from "@/components/ui/button";

// 로그인 페이지 — 디자인/실제 인증은 추후.
// 지금은 로그인 버튼 → 바로 앱(프로젝트)으로 이동.
export default function LoginPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 px-6">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border border-border bg-card p-8">
        <div className="flex flex-col gap-1 text-center">
          <span className="text-sm font-semibold tracking-tight text-muted-foreground">
            CLAPS Studio 2.0
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            로그인
          </h1>
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="이메일"
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none"
          />
          <input
            type="password"
            placeholder="비밀번호"
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none"
          />
        </div>

        {/* 지금은 인증 없이 바로 앱으로 이동 */}
        <Button asChild size="lg" className="w-full">
          <Link href="/projects">로그인</Link>
        </Button>

        <Link
          href="/"
          className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          홈으로
        </Link>
      </div>
    </main>
  );
}
