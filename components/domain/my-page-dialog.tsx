"use client";
import { navigateAfterAuth } from "@/lib/account-store";
import { useT } from "@/lib/i18n/provider";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const t = useT();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 열릴 때마다 저장된 값으로 채움
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getAccount().then(a => {
      if (cancelled) return;
      setError(""); setAccount(a); setName(a.name); setOrg(a.org); setRole(a.role ?? "");
    }).catch(() => { if (!cancelled) { setAccount(null); setError(t("auth.requestFailed")); } });
    return () => { cancelled = true; };
  }, [open, t]);

  const canSave = name.trim().length > 0 && org.trim().length > 0;

  async function handleSave() {
    if (!canSave || !account || pending) return;
    setPending(true); setError("");
    try {
      await upsertAccount({ name: name.trim(), org: org.trim(), role: role || undefined });
      onSaved?.(); onOpenChange(false);
    } catch (e) { setError(e instanceof Error ? e.message : t("auth.requestFailed")); }
    finally { setPending(false); }
  }
  async function handleWithdraw() {
    if (pending) return;
    setPending(true); setError("");
    try { await deleteAccount(); navigateAfterAuth("/"); }
    catch (e) { setConfirmOpen(false); setError(e instanceof Error ? e.message : t("auth.requestFailed")); }
    finally { setPending(false); }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t("auth.my_account")}</DialogTitle>
            <DialogDescription>
              {t("auth.view_and_update_your_account_information")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* 이메일 (수정 불가) */}
            <div className="flex flex-col gap-2">
              <Label>{t("auth.email")}</Label>
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
                  {t("auth.delete_account")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t(
                    "auth.your_account_information_will_be_deleted_this_cannot_be",
                  )}
                </span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="shrink-0"
                onClick={() => setConfirmOpen(true)}
              >
                {t("auth.delete_my_account")}
              </Button>
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Link href="/change-password" className="text-sm underline">{t("auth.changePassword")}</Link>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("auth.cancel")}</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={!canSave || !account || pending}>
              {t("auth.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 탈퇴 확인 */}
      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleWithdraw}
        title={t("auth.are_you_sure_you_want_to_delete_your_account")}
        description={t(
          "auth.your_account_information_will_be_deleted_this_cannot_be",
        )}
        confirmLabel={t("auth.delete_account_2")}
      />
    </>
  );
}
