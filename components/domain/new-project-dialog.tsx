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
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-brand">*</span>}
        {optional && (
          <span className="text-xs font-normal text-muted-foreground">
            (선택)
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
    const pad = (n: number) => String(n).padStart(2, "0");
    const today = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(
      now.getDate(),
    )}`;
    onCreate({
      id: `local-${Date.now()}`,
      name: name.trim(),
      ip: undecided ? "미정" : ip.trim(),
      status: "준비 중",
      description: desc.trim() || undefined,
      createdAt: today,
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
            새 프로젝트 만들기
          </DialogTitle>
          <DialogDescription>
            IP를 선택하고 프로젝트를 만들면 에셋 생성·가이드 검증을 시작할 수
            있어요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* 프로젝트 이름 */}
          <Field label="프로젝트 이름" required>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 썸머 캡슐 컬렉션"
            />
          </Field>

          {/* IP · 파트너 */}
          <Field label="IP · 파트너" required>
            <Input
              type="text"
              value={undecided ? "" : ip}
              onChange={(e) => setIp(e.target.value)}
              disabled={undecided}
              placeholder="예: 산리오 · 시나모롤"
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
              아직 파트너가 정해지지 않았어요 (미정)
            </button>
          </Field>

          {/* 프로젝트 설명 */}
          <Field label="프로젝트 설명" optional>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="이 프로젝트가 어떤 작업인지 간단히 적어주세요."
              rows={3}
              className={cn(inputBase, "resize-none py-2.5")}
            />
          </Field>

          {/* 브랜드 가이드 안내 */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2.5">
            <Info className="size-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              브랜드 가이드는 프로젝트를 만든 뒤{" "}
              <span className="font-medium text-foreground">
                ‘브랜드 가이드’
              </span>{" "}
              탭에서 업로드할 수 있어요.
            </p>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">취소</Button>
          </DialogClose>
          <Button disabled={!canCreate} onClick={handleCreate}>
            프로젝트 생성
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
