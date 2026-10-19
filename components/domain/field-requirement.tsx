"use client";
import { useT } from "@/lib/i18n/provider";
export function FieldRequirement({ required = false }: { required?: boolean }) {
  const t = useT();
  return <span className={required ? "rounded bg-brand/10 px-1.5 py-0.5 text-xs font-normal text-brand" : "rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground"}>{t(required ? "common.required" : "common.optionalShort")}</span>;
}
