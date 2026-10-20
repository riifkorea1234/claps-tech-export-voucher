"use client";
import { navigateAfterAuth } from "@/lib/account-store";
import { validSplitName } from "@/lib/normalize-input";
import { useLanguage } from "@/lib/i18n/provider";

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
import { ProfileFields, emptySplitName, type SplitName } from "./profile-fields";
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
  const { t, locale } = useLanguage();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [splitName, setSplitName] = useState<SplitName>(emptySplitName);
  const [org, setOrg] = useState("");
  const [role, setRole] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 열릴 때마다 저장된 값으로 채움
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getAccount().then(a => {
      if (cancelled) return;
      setError(""); setAccount(a); setName(a.name); setSplitName({ familyName: a.familyName ?? "", givenName: a.givenName ?? "", familyNameKana: a.familyNameKana ?? "", givenNameKana: a.givenNameKana ?? "" }); setOrg(a.org); setRole(a.role ?? "");
    }).catch(() => { if (!cancelled) { setAccount(null); setError(t("auth.requestFailed")); } });
    return () => { cancelled = true; };
  }, [open, t]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setAccount(null);
    onOpenChange(nextOpen);
  }

  const canSave = (locale.split("-")[0] === "ja" ? validSplitName(splitName.familyName, splitName.givenName) : name.trim().length > 0) && org.trim().length > 0;

  async function handleSave() {
    if (!canSave || !account || pending) return;
    setPending(true); setError("");
    try {
      await upsertAccount({ name: name.trim(), locale, ...splitName, org: org.trim(), role: role || undefined });
      onSaved?.(); handleOpenChange(false);
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
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="min-w-0 grid-cols-[minmax(0,1fr)] max-h-[90dvh] overflow-y-auto sm:max-w-[420px]">
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
              <div className="min-h-11 min-w-0 break-all rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                {account?.email ?? "-"}
              </div>
            </div>

            <ProfileFields
              idPrefix="my"
              disabled={!account || pending}
              name={name}
              splitName={splitName}
              onSplitNameChange={setSplitName}
              org={org}
              role={role}
              onNameChange={setName}
              onOrgChange={setOrg}
              onRoleChange={setRole}
            />

            {/* 회원 탈퇴 */}
            <div className="flex flex-col items-start justify-between gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
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
