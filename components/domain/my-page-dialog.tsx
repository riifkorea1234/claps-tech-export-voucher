"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { ProfileFields } from "./profile-fields";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import {
  getAccount,
  upsertAccount,
  deleteAccount,
  type Account,
} from "@/lib/account-store";
import { useLocale } from "@/lib/i18n";

// 마이페이지 모달 — 가입 시 입력한 정보 수정 · 회원 탈퇴
export function MyPageDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void; // 저장 후 사이드바 등 갱신용
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [account, setAccount] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 열릴 때마다 저장된 값으로 채움
  useEffect(() => {
    if (!open) return;
    const a = getAccount();
    setAccount(a);
    setName(a?.name ?? "");
    setOrg(a?.org ?? "");
    setRole(a?.role ?? "");
  }, [open]);

  const canSave = name.trim().length > 0 && org.trim().length > 0;

  function handleSave() {
    if (!canSave || !account) return;
    upsertAccount({
      email: account.email,
      name: name.trim(),
      org: org.trim(),
      role: role || undefined,
    });
    onSaved?.();
    onOpenChange(false);
  }

  function handleWithdraw() {
    deleteAccount();
    setConfirmOpen(false);
    onOpenChange(false);
    router.push("/");
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t("myPage.title")}</DialogTitle>
            <DialogDescription>{t("myPage.desc")}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* 이메일 (수정 불가) */}
            <div className="flex flex-col gap-2">
              <Label>{t("myPage.email")}</Label>
              <div className="flex h-11 items-center rounded-lg border border-input bg-muted px-3 text-sm text-muted-foreground">
                {account?.email ?? "-"}
              </div>
            </div>

            <ProfileFields
              idPrefix="my"
              name={name}
              org={org}
              role={role}
              onNameChange={setName}
              onOrgChange={setOrg}
              onRoleChange={setRole}
            />

            {/* 회원 탈퇴 */}
            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">
                  {t("myPage.withdraw")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("myPage.withdrawDesc")}
                </span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="shrink-0"
                onClick={() => setConfirmOpen(true)}
              >
                {t("myPage.withdrawAction")}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("common.cancel")}</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={!canSave}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 탈퇴 확인 */}
      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleWithdraw}
        title={t("myPage.confirmTitle")}
        description={t("myPage.withdrawDesc")}
        confirmLabel={t("myPage.confirmLabel")}
      />
    </>
  );
}
