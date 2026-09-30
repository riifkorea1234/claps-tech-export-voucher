"use client";
import { useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  ConfirmAction,
  type Row,
  type RequestFn,
  type Act,
} from "./shared";
export function LocaleEditor({
  rows,
  request,
  act,
  busy,
}: {
  rows: Row[];
  request: RequestFn;
  act: Act;
  busy: boolean;
}) {
  const { t } = useLanguage(),
    dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Row | null>(null),
    [open, setOpen] = useState(false),
    [code, setCode] = useState(""),
    [nativeName, setNativeName] = useState(""),
    [displayName, setDisplayName] = useState(""),
    [direction, setDirection] = useState("ltr"),
    [fallbackCode, setFallback] = useState("ko"),
    [enabled, setEnabled] = useState(false),
    [order, setOrder] = useState(0),
    [reason, setReason] = useState("");
  function edit(row: Row | null) {
    setSelected(row);
    setCode(row?.code ?? "");
    setNativeName(String(row?.native_name ?? ""));
    setDisplayName(String(row?.display_name ?? ""));
    setDirection(String(row?.direction ?? "ltr"));
    setFallback(String(row?.fallback_code ?? (row?.code === "ko" ? "" : "ko")));
    setEnabled(!!row?.enabled);
    setOrder(Number(row?.sort_order ?? 0));
    setReason("");
    setOpen(true);
    dialog.current?.showModal();
  }
  const data = (row: Row, value: boolean) => ({
    nativeName: row.native_name,
    displayName: row.display_name,
    direction: row.direction,
    fallbackCode: row.fallback_code,
    sortOrder: row.sort_order,
    version: row.version,
    enabled: value,
    reason,
  });
  async function save() {
    await request(
      `locales${selected ? `/${code}` : ""}`,
      selected ? "PATCH" : "POST",
      {
        nativeName,
        displayName,
        direction,
        fallbackCode: fallbackCode || null,
        enabled,
        sortOrder: order,
        reason,
        ...(selected ? { version: selected.version } : { code }),
      },
    );
    dialog.current?.close();
  }
  return (
    <section className="space-y-4">
      <Button onClick={() => edit(null)}>{t("admin.addLanguage")}</Button>
      <Field name="reason" value={reason} change={setReason} required />
      <div className="overflow-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {["name", "code", "status", "missing", "details"].map((k) => (
                <th key={k} className="p-3">
                  {t(`admin.${k}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code} className="border-t">
                <td className="p-3">{String(row.native_name)}</td>
                <td>{row.code}</td>
                <td>
                  {t(row.enabled ? "admin.enabled" : "admin.disabled")} ·{" "}
                  {t(row.deployed ? "admin.deployed" : "admin.notDeployed")}
                </td>
                <td>{String(row.missing)}</td>
                <td className="space-x-2 p-3">
                  <Button variant="outline" onClick={() => edit(row)}>
                    {t("admin.edit")}
                  </Button>
                  {row.code !== "ko" && (!!row.deployed || !!row.enabled) && (
                    <ConfirmAction
                      label={t(
                        row.enabled
                          ? "admin.disableLanguage"
                          : "admin.enableLanguage",
                      )}
                      impact={t("admin.confirmImpact.language")}
                      target={String(row.native_name)}
                      reason={reason}
                      busy={busy}
                      run={() =>
                        void act(
                          () =>
                            request(
                              `locales/${row.code}`,
                              "PATCH",
                              data(row, !row.enabled),
                            ),
                          "localeSaved",
                        )
                      }
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dialog
        aria-label={t("admin.localeEdit")}
        ref={dialog}
        onClose={() => setOpen(false)}
        className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-auto rounded-xl border bg-background p-6 text-foreground backdrop:bg-black/50"
      >
        {open && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (selected?.enabled && !enabled)
                e.currentTarget
                  .querySelector<HTMLButtonElement>("[data-confirm-action]")
                  ?.click();
              else void act(save, "localeSaved");
            }}
          >
            <h2>{t("admin.localeEdit")}</h2>
            {!selected && (
              <Field name="code" value={code} change={setCode} required />
            )}
            <Field
              name="nativeName"
              value={nativeName}
              change={setNativeName}
              required
            />
            <Field
              name="displayName"
              value={displayName}
              change={setDisplayName}
              required
            />
            <label>
              {t("admin.fallback")}
              <select
                aria-label={t("admin.fallback")}
                className="ml-2 rounded border p-2"
                value={fallbackCode}
                disabled={code === "ko"}
                onChange={(e) => setFallback(e.target.value)}
              >
                <option value="">—</option>
                {rows
                  .filter((r) => r.code !== code)
                  .map((r) => (
                    <option key={r.code} value={r.code}>
                      {String(r.native_name)} ({r.code})
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {t("admin.direction")}
              <select
                className="ml-2 rounded border p-2"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
              >
                <option value="ltr">{t("admin.ltr")}</option>
                <option value="rtl">{t("admin.rtl")}</option>
              </select>
            </label>
            <label className="block">
              {t("admin.order")}
              <Input
                type="number"
                min={0}
                max={10000}
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </label>
            <label className="flex gap-2">
              <input
                type="checkbox"
                disabled={
                  code === "ko" || !rows.find((r) => r.code === code)?.deployed
                }
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              {t("admin.enabled")}
            </label>
            {!rows.find((r) => r.code === code)?.deployed && (
              <p>{t("admin.packUnavailable")}</p>
            )}
            <Field name="reason" value={reason} change={setReason} required />
            {selected?.enabled && !enabled ? (
              <ConfirmAction
                label={t("admin.save")}
                impact={t("admin.confirmImpact.language")}
                target={nativeName}
                reason={reason}
                busy={busy}
                run={() => void act(save, "localeSaved")}
              />
            ) : (
              <Button disabled={busy}>{t("admin.save")}</Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => dialog.current?.close()}
            >
              {t("admin.discardCancel")}
            </Button>
          </form>
        )}
      </dialog>
    </section>
  );
}
