"use client";
import { useT } from "@/lib/i18n/provider";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

// 삭제 확인 팝업 (되돌릴 수 없는 작업 공통)
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel,
  pending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  pending?: boolean;
  title?: string;
  description: React.ReactNode;
  confirmLabel?: string;
}) {
  const t = useT();
  return (
    <AlertDialog open={open} onOpenChange={next => { if (!pending) onOpenChange(next); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {title ?? t("common.are_you_sure_you_want_to_delete_this")}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={e => { e.preventDefault(); void onConfirm(); }}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {confirmLabel ?? t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
