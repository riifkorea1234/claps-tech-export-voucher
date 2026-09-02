"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* 브랜드 (헤더와 높이 정렬) */}
      <div className="flex h-[55px] shrink-0 items-center gap-2 border-b border-sidebar-border px-5">
        <Image
          src="/claps-logo.svg"
          alt="CLAPS"
          width={80}
          height={15}
          priority
        />
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
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent/60"
        >
          <Image
            src="/avatar-placeholder.png"
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-foreground">
              라이선시 담당자
            </div>
            <div className="truncate text-xs text-muted-foreground">회사명</div>
          </div>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>
    </aside>
  );
}
