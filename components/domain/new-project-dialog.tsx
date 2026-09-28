"use client";

import { useState } from "react";
import { Check, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Project } from "@/lib/mock/projects";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { toISODate } from "@/lib/format-date";

// 입력 한 칸 (라벨 + 필수/선택 표시)
function Field({
  label,
  required,
  optional,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-brand">*</span>}
        {optional && (
          <span className="text-xs font-normal text-muted-foreground">
            {t("common.optional")}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

const inputBase =
  "w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40 focus:outline-none";

export function NewProjectDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (project: Project) => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [undecided, setUndecided] = useState(false); // 파트너 미정
  const [desc, setDesc] = useState("");

  const canCreate =
    name.trim().length > 0 && (undecided || ip.trim().length > 0);

  function reset() {
    setName("");
    setIp("");
    setUndecided(false);
    setDesc("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset(); // 닫으면 입력 초기화
    onOpenChange(next);
  }

  function handleCreate() {
    if (!canCreate) return;
    const now = new Date();
    onCreate({
      id: `local-${Date.now()}`,
      name: name.trim(),
      ip: undecided ? "" : ip.trim(), // 미정은 빈 값으로 저장하고 표시할 때 언어별로 채운다
      status: "ready",
      description: desc.trim() || undefined,
      createdAt: toISODate(now.getTime()), // 저장은 ISO, 표시는 화면에서
      updatedAt: now.getTime(),
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            {t("newProject.title")}
          </DialogTitle>
          <DialogDescription>
            {t("newProject.desc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* 프로젝트 이름 */}
          <Field label={t("newProject.name")} required>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("newProject.namePlaceholder")}
            />
          </Field>

          {/* IP · 파트너 */}
          <Field label={t("newProject.ip")} required>
            <Input
              type="text"
              value={undecided ? "" : ip}
              onChange={(e) => setIp(e.target.value)}
              disabled={undecided}
              placeholder={t("newProject.ipPlaceholder")}
            />
            {/* 미정 체크박스 */}
            <button
              type="button"
              role="checkbox"
              aria-checked={undecided}
              onClick={() => setUndecided((v) => !v)}
              className="mt-0.5 flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded border transition-colors",
                  undecided
                    ? "border-brand bg-brand text-white"
                    : "border-input bg-card text-transparent",
                )}
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
              {t("newProject.undecided")}
            </button>
          </Field>

          {/* 프로젝트 설명 */}
          <Field label={t("newProject.description")} optional>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t("newProject.descriptionPlaceholder")}
              rows={3}
              className={cn(inputBase, "resize-none py-2.5")}
            />
          </Field>

          {/* 브랜드 가이드 안내 */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2.5">
            <Info className="size-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {/* 언어마다 어순이 달라서, 사전 문구를 {tab} 자리에서 잘라
                  가운데에만 강조를 준다 */}
              {(() => {
                const [before, after] = t("newProject.guideNote").split("{tab}");
                return (
                  <>
                    {before}
                    <span className="font-medium text-foreground">
                      {t("newProject.guideTab")}
                    </span>
                    {after}
                  </>
                );
              })()}
            </p>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t("common.cancel")}</Button>
          </DialogClose>
          <Button disabled={!canCreate} onClick={handleCreate}>
            {t("newProject.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
