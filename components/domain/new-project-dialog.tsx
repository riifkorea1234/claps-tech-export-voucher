"use client";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useT } from "@/lib/i18n/provider";

import { useState, useRef } from "react";
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
import type { ProjectInput } from "@/lib/contracts/workspace";
import { WorkspaceError } from "./workspace-data";
import { cn } from "@/lib/utils";

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
  const t = useT();
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-brand">*</span>}
        {optional && (
          <span className="text-xs font-normal text-muted-foreground">
            {t("projects.optional")}
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
  onCreate: (project: ProjectInput) => Promise<unknown>;
}) {
  const t = useT();
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
    if (pending) return;
    if (!next) reset(); // 닫으면 입력 초기화
    onOpenChange(next);
  }

  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error>();
  async function handleCreate() {
    if (!canCreate || lock.current) return;
    lock.current = true; setPending(true); setError(undefined);
    try {
      await onCreate({ name: name.trim(), ip: undecided ? "" : ip.trim(), description: desc.trim() });
      reset(); onOpenChange(false);
    } catch (e) { setError(e instanceof Error ? e : new Error()); }
    finally { lock.current = false; setPending(false); }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            {t("projects.create_a_new_project")}
          </DialogTitle>
          <DialogDescription>
            {t("projects.choose_an_ip_and_create_a_project_to_start")}
          </DialogDescription>
        </DialogHeader>
        <LanguageSwitcher className="justify-self-end" />

        <div className="flex flex-col gap-4">
          {/* 프로젝트 이름 */}
          <Field label={t("projects.project_name")} required>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("projects.e_g_summer_capsule_collection")}
            />
          </Field>

          {/* IP · 파트너 */}
          <Field label={t("projects.ip_partner")} required>
            <Input
              type="text"
              value={undecided ? "" : ip}
              onChange={(e) => setIp(e.target.value)}
              disabled={undecided}
              placeholder={t("projects.e_g_sanrio_cinnamoroll")}
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
              {t("projects.i_haven_t_chosen_a_partner_yet")}
            </button>
          </Field>

          {/* 프로젝트 설명 */}
          <Field label={t("projects.project_description")} optional>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t(
                "projects.briefly_describe_the_work_in_this_project",
              )}
              rows={3}
              className={cn(inputBase, "resize-none py-2.5")}
            />
          </Field>

          {/* 브랜드 가이드 안내 */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2.5">
            <Info className="size-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {t("projects.guideUploadHelp")}
            </p>
          </div>
        </div>

        <WorkspaceError error={error} />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t("projects.cancel")}</Button>
          </DialogClose>
          <Button disabled={!canCreate || pending} onClick={handleCreate}>
            {t("projects.create_project")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
