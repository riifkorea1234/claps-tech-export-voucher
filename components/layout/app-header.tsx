"use client";

import { usePathname } from "next/navigation";
import { getTitle } from "@/lib/nav";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 flex h-[55px] shrink-0 items-center border-b border-border bg-background">
      {/* 본문과 같은 최대폭으로 정렬 */}
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {getTitle(pathname)}
        </h1>
        <LocaleSwitcher />
      </div>
    </header>
  );
}
