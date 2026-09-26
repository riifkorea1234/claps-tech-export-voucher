"use client";
import { Check, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, locales, pending, error, changeLocale, t } = useLanguage();
  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            aria-label={t("navigation.language")}
            className="min-h-9 gap-1.5 text-foreground bg-background"
          >
            <Globe className="size-4" aria-hidden="true" />
            {locales.find((l) => l.code === locale)?.nativeName ?? "한국어"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {locales.map((entry) => (
            <DropdownMenuItem
              key={entry.code}
              lang={entry.code}
              onSelect={() => void changeLocale(entry.code)}
            >
              {entry.nativeName}
              {entry.code === locale && (
                <Check
                  className="ml-auto size-4"
                  aria-label={t("navigation.selected")}
                />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p role="alert" className="max-w-64 text-xs text-destructive">
          {t("navigation.saveFailed")}
        </p>
      )}
    </div>
  );
}
