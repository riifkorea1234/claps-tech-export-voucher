import { Folder, Search, Sparkle } from "lucide-react";
import { IconRadar2 } from "@tabler/icons-react";
import type { ComponentType } from "react";

// lucide · tabler 아이콘 모두 허용 (className으로 크기·색 지정)
export type NavIcon = ComponentType<{ className?: string }>;

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
};

// 사이드바 4개 영역 (사이트맵 v2 · 피그마 4936:6043 기준)
export const NAV: NavItem[] = [
  { href: "/projects", label: "프로젝트", icon: Folder },
  { href: "/partners", label: "파트너 추천", icon: Search },
  { href: "/assets", label: "에셋 생성", icon: Sparkle },
  { href: "/monitoring", label: "모니터링", icon: IconRadar2 },
];

// 현재 경로에 해당하는 화면 제목 (헤더용)
export function getTitle(pathname: string): string {
  const item = NAV.find((n) => pathname.startsWith(n.href));
  return item?.label ?? "CLAPS Studio 2.0";
}
