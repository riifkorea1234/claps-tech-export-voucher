import { Folder, Search, Sparkle } from "lucide-react";
import { IconRadar2 } from "@tabler/icons-react";
import type { ComponentType } from "react";

// lucide · tabler 아이콘 모두 허용 (className으로 크기·색 지정)
export type NavIcon = ComponentType<{ className?: string }>;

export type NavItem = {
  href: string;
  labelKey: string; // 화면에 보일 이름은 lib/i18n 사전에서 가져온다
  icon: NavIcon;
};

// 사이드바 4개 영역 (사이트맵 v2 · 피그마 4936:6043 기준)
export const NAV: NavItem[] = [
  { href: "/projects", labelKey: "nav.projects", icon: Folder },
  { href: "/partners", labelKey: "nav.partners", icon: Search },
  { href: "/assets", labelKey: "nav.assets", icon: Sparkle },
  { href: "/monitoring", labelKey: "nav.monitoring", icon: IconRadar2 },
];

// 현재 경로에 해당하는 화면 제목의 열쇠말 (헤더용)
export function getTitleKey(pathname: string): string {
  const item = NAV.find((n) => pathname.startsWith(n.href));
  return item?.labelKey ?? "app.name";
}
