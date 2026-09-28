"use client";

import Link from "next/link";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </div>
  );
}

function TextInput({ placeholder }: { placeholder: string }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none"
    />
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
      {children}
    </span>
  );
}

function AddChip() {
  const { t } = useLocale();

  return (
    <button
      type="button"
      className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {t("criteria.add")}
    </button>
  );
}

export default function PartnersCriteriaPage() {
  const { t } = useLocale();

  return (
    <div className="px-6 py-10">
      <div className="mx-auto w-full max-w-[800px] overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_8px_30px_-6px_rgba(0,0,0,0.10)]">
        {/* 다크 헤더 */}
        <div className="border-b border-border bg-primary px-6 py-5">
          <h2 className="text-xl font-semibold tracking-tight text-primary-foreground">
            {t("criteria.title")}
          </h2>
          <p className="mt-1.5 text-sm text-primary-foreground/70">
            {t("criteria.desc")}
          </p>
        </div>

        {/* 입력 필드 */}
        <div className="flex flex-col gap-5 p-[var(--pad-card)]">
          <Field label={t("criteria.refImage")}>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                className="flex size-24 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                <ImagePlus className="size-5" />
                <span className="text-xs">{t("criteria.upload")}</span>
              </button>
              {[0, 1, 2].map((i) => (
                <div key={i} className="size-24 rounded-lg bg-muted" />
              ))}
            </div>
          </Field>

          <Field label={t("criteria.ipMeta")}>
            <div className="flex flex-col gap-3.5 sm:flex-row">
              <TextInput placeholder={t("criteria.ipNamePlaceholder")} />
              <TextInput placeholder={t("criteria.categoryPlaceholder")} />
            </div>
          </Field>

          <Field label={t("criteria.worldview")}>
            <div className="flex flex-wrap items-center gap-2">
              <Chip>명랑</Chip>
              <Chip>우정</Chip>
              <Chip>일상</Chip>
              <Chip>귀여움</Chip>
              <AddChip />
            </div>
          </Field>

          <Field label={t("criteria.licensee")}>
            <TextInput placeholder={t("criteria.licenseePlaceholder")} />
          </Field>

          <Field label={t("criteria.industry")}>
            <div className="flex flex-col gap-3.5 sm:flex-row">
              <TextInput placeholder={t("criteria.industryPlaceholder")} />
              <TextInput placeholder={t("criteria.revenuePlaceholder")} />
            </div>
          </Field>

          <Field label={t("criteria.collabHistory")}>
            <div className="flex flex-wrap items-center gap-2">
              <Chip>산리오 2023</Chip>
              <Chip>디즈니 2022</Chip>
              <Chip>카카오 2021</Chip>
              <AddChip />
            </div>
          </Field>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 border-t border-border px-6 py-5">
          <Button variant="outline" asChild>
            <Link href="/partners">{t("common.cancel")}</Link>
          </Button>
          <Button asChild>
            <Link href="/partners">{t("criteria.submit")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
