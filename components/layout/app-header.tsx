"use client";
import { navigateAfterAuth } from "@/lib/account-store";
import { useT } from "@/lib/i18n/provider";

import { useState } from "react";
import { MyPageDialog } from "@/components/domain/my-page-dialog";
import { clearCurrent } from "@/lib/account-store";
import { usePathname } from "next/navigation";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { NAV, getTitle } from "@/lib/nav";
import { LanguageSwitcher } from "./language-switcher";

export function AppHeader({ isAdmin = false }: { isAdmin?: boolean }) {
  const t = useT();
  const [myPageOpen, setMyPageOpen] = useState(false);
  const [error, setError] = useState(false);

  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 flex h-[55px] shrink-0 items-center border-b border-border bg-background">
      {/* 본문과 같은 최대폭으로 정렬 */}
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-5">
        <div className="flex min-w-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label={t("navigation.menu")}
              >
                <Menu className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {NAV.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href}>{t(item.label)}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onSelect={() => setMyPageOpen(true)}>{t("navigation.my_account")}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { clearCurrent().then(() => navigateAfterAuth("/")).catch(() => setError(true)); }}>{t("navigation.log_out")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <h1 className="truncate text-base sm:text-xl font-semibold tracking-tight text-foreground">
            {getTitle(pathname).startsWith("navigation.")
              ? t(getTitle(pathname))
              : getTitle(pathname)}
          </h1>
        </div>
        <div className="flex items-center gap-3">{isAdmin && <Link href="/admin" className="text-sm underline">{t("admin.title")}</Link>}<LanguageSwitcher /></div>
      </div>
      {error && <p role="alert">{t("auth.requestFailed")}</p>}
      <MyPageDialog open={myPageOpen} onOpenChange={setMyPageOpen} />
    </header>
  );
}
