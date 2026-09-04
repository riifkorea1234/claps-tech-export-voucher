"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import { MyPageDialog } from "@/components/domain/my-page-dialog";
import { getAccount, clearCurrent, type Account } from "@/lib/account-store";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [myPageOpen, setMyPageOpen] = useState(false);

  // 저장된 계정(프로필) 로드 → 하단 계정 영역에 표시
  useEffect(() => {
    setAccount(getAccount());
  }, []);

  const displayName = account?.name || "라이선시 담당자";
  const displayOrg = account?.org || account?.email || "회사명";

  function handleLogout() {
    clearCurrent();
    router.push("/");
  }

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* 브랜드 (헤더와 높이 정렬) */}
      <div className="flex h-[55px] shrink-0 items-center gap-2 border-b border-sidebar-border px-5">
        <Link href="/" className="flex items-center">
          <Image
            src="/claps-logo.svg"
            alt="CLAPS"
            width={80}
            height={15}
            priority
            className="[filter:brightness(0)_invert(20%)]"
          />
        </Link>
        <span className="text-xs font-medium leading-none text-muted-foreground">
          Studio 2.0
        </span>
      </div>

      {/* 네비게이션 */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-3 pb-2">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-9 items-center gap-2 rounded-lg px-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "font-normal text-foreground/70 hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 하단 — 유저 메뉴 */}
      <div className="flex flex-col gap-2 px-3 py-2">
        <div className="h-px w-full bg-sidebar-border" />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg p-2 text-left outline-none transition-colors hover:bg-sidebar-accent/60">
            <Image
              src="/avatar-placeholder.png"
              alt=""
              width={32}
              height={32}
              className="size-8 shrink-0 rounded-md object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                {displayName}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {displayOrg}
              </div>
            </div>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-[212px]"
          >
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {displayName}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {displayOrg}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setMyPageOpen(true)}>
              <UserRound className="size-4" />
              마이페이지
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
              <LogOut className="size-4" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 마이페이지 모달 */}
      <MyPageDialog
        open={myPageOpen}
        onOpenChange={setMyPageOpen}
        onSaved={() => setAccount(getAccount())}
      />
    </aside>
  );
}
