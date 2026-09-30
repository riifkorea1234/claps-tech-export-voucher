"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";

/* 입력 칸의 필수 / 선택 표시

   한국·미국   별표(*) 와 (선택) — 서구권 관례
   일본        必須 / 任意 배지 — 일본 폼의 표준 관례.
               별표는 일본에서 통용되지 않아 글자로 명시한다.
               저장 눌렀을 때 알려주는 것은 늦다는 것이 일본 폼의 기본 전제
               (일본 리서치: 사양·조건·제약을 최초 화면에 노출). */

export function FieldRequirement({
  required,
  optional,
}: {
  required?: boolean;
  optional?: boolean;
}) {
  const { locale, t } = useLocale();

  if (!required && !optional) return null;

  if (locale === "ja") {
    return (
      <span
        className={cn(
          "shrink-0 rounded-[3px] px-1 py-px text-[11px] font-medium",
          required
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground",
        )}
      >
        {required ? t("common.required") : t("common.optionalShort")}
      </span>
    );
  }

  return required ? (
    <span className="text-brand">*</span>
  ) : (
    <span className="text-xs font-normal text-muted-foreground">
      {t("common.optional")}
    </span>
  );
}
