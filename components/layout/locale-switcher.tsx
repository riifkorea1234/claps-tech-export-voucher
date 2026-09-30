"use client";

import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { LOCALES, LOCALE_LABEL, useLocale, isLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/* 언어 버튼 — 주소(URL)는 바뀌지 않고 선택은 브라우저에 기억된다.

   tone
     default  앱 헤더·로그인 화면. 피그마의 기존 테두리 버튼 자리를 그대로 쓴다.
     footer   랜딩 푸터(어두운 배경). 옆의 아이콘 링크들과 같은 결로 맞춘다. */

export function LocaleSwitcher({
  tone = "default",
}: {
  tone?: "default" | "footer";
}) {
  const { locale, setLocale, t } = useLocale();

  const trigger =
    tone === "footer" ? (
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-md text-sm text-white/50 transition-colors outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <Globe className="size-4" />
        {t("nav.language")}
      </button>
    ) : (
      <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg">
        <Globe className="size-4" />
        {t("nav.language")}
      </Button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={cn("w-40")}>
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(next) => {
            if (isLocale(next)) setLocale(next);
          }}
        >
          {LOCALES.map((code) => (
            <DropdownMenuRadioItem key={code} value={code}>
              {LOCALE_LABEL[code]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
