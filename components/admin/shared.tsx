"use client";
import Link from "next/link";
import { useId, useRef, useState, createContext, useContext } from "react";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
export const FieldErrors = createContext<Record<string, string[]>>({});
export type Row = {
  id?: string;
  code?: string;
  version?: number;
  name?: string;
  status?: string;
  visibility?: string;
  [key: string]: unknown;
};
export type Result = {
  items?: Row[];
  totalPages?: number;
  total?: number;
  [key: string]: unknown;
};
export type RequestFn = <T>(
  path: string,
  method?: string,
  body?: unknown,
) => Promise<T>;
export type Act = (
  fn: () => Promise<unknown>,
  message?: string,
) => Promise<void>;
export function Field({
  name,
  value,
  change,
  multiline = false,
  required = false,
  error,
}: {
  name: string;
  value: string;
  change: (value: string) => void;
  multiline?: boolean;
  required?: boolean;
  error?: string;
}) {
  const { t } = useLanguage(),
    id = useId();
  const [invalid, setInvalid] = useState(false);
  const serverErrors = useContext(FieldErrors);
  error = error || serverErrors[name]?.join(", ");
  const hints = ["reason", "tags", "ipNames", "imageAlt"];
  return (
    <label className="block space-y-1 text-sm">
      <span>{t(`admin.${name}`)}</span>
      {multiline ? (
        <Textarea
          aria-label={t(`admin.${name}`)}
          aria-invalid={!!error || invalid}
          aria-describedby={`${id}-help`}
          required={required}
          value={value}
          onChange={(e) => {
            setInvalid(false);
            change(e.target.value);
          }}
          rows={4}
        />
      ) : (
        <Input
          aria-label={t(`admin.${name}`)}
          name={name}
          onInvalid={() => setInvalid(true)}
          aria-invalid={!!error || invalid}
          aria-describedby={`${id}-help`}
          type={name === "contactEmail" ? "email" : "text"}
          maxLength={name === "reason" ? 500 : undefined}
          required={required}
          value={value}
          onChange={(e) => {
            setInvalid(false);
            change(e.target.value);
          }}
        />
      )}
      <span id={`${id}-help`} className="block text-muted-foreground">
        {error ||
          (invalid && name === "reason" ? t("admin.reasonRequired") : "") ||
          (hints.includes(name) ? t(`admin.hint.${name}`) : "")}
      </span>
      {["tags", "ipNames"].includes(name) && (
        <span className="flex flex-wrap gap-1">
          {value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
            .map((v, i) => (
              <span key={i} className="rounded bg-muted px-2">
                {v}
              </span>
            ))}
        </span>
      )}
    </label>
  );
}
export function ConfirmAction({
  label,
  impact,
  target,
  reason,
  busy,
  run,
}: {
  label: string;
  impact: string;
  target: string;
  reason: string;
  busy: boolean;
  run: () => void;
}) {
  const { t } = useLanguage(),
    dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  function close() {
    dialog.current?.close();
    trigger.current?.focus();
  }
  return (
    <>
      <Button
        ref={trigger}
        data-confirm-action
        type="button"
        variant="destructive"
        className="border-destructive bg-background text-destructive hover:bg-background hover:underline dark:bg-background dark:text-foreground dark:hover:bg-background"
        disabled={busy}
        onClick={() => {
          const form = trigger.current?.closest("form");
          if (form && !form.reportValidity()) return;
          if (!reason.trim()) {
            const input = trigger.current
              ?.closest("section")
              ?.querySelector<HTMLInputElement>('input[name="reason"]');
            input?.reportValidity();
            input?.focus();
            return;
          }
          dialog.current?.showModal();
        }}
      >
        {label}
      </Button>
      <dialog
        aria-label={label}
        ref={dialog}
        onClose={() => trigger.current?.focus()}
        className="m-auto max-w-lg space-y-4 rounded-xl border bg-background p-6 text-foreground backdrop:bg-black/50"
      >
        <h2 className="text-lg font-semibold">{label}</h2>
        <p>{target}</p>
        <p>{impact}</p>
        <p>
          {t("admin.reason")}: {reason}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={close}>
            {t("admin.discardCancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="border-destructive bg-background text-destructive hover:bg-background hover:underline dark:bg-background dark:text-foreground dark:hover:bg-background"
            disabled={busy}
            onClick={() => {
              close();
              run();
            }}
          >
            {t("admin.confirm")}
          </Button>
        </div>
      </dialog>
    </>
  );
}
export function Tabs({
  items,
  selected,
  href,
}: {
  items: string[];
  selected: string;
  href: (key: string) => string;
}) {
  const { t } = useLanguage();
  return (
    <nav aria-label={t("admin.tabs")} className="flex flex-wrap gap-2">
      {items.map((key) => (
        <Link
          key={key}
          aria-current={selected === key ? "page" : undefined}
          className={`rounded border px-3 py-2 text-sm ${selected === key ? "bg-primary text-primary-foreground" : "bg-background"}`}
          href={href(key)}
        >
          {t(`admin.${key}`)}
        </Link>
      ))}
    </nav>
  );
}
export function RecordView({ row: record }: { row: Row }) {
  const { t, locale } = useLanguage();
  const row = { ...record, ...((record.profile as Row) ?? {}) };
  const visible = [
    "name",
    "email",
    "org_name",
    "app_role",
    "status",
    "ip_name",
    "description",
    "visibility",
    "contact_email",
    "tags",
    "ipNames",
    "marketDescription",
    "imageAlt",
    "created_at",
    "archived_at",
    "kind",
    "attempt",
    "error_code",
    "cost_state",
    "provider",
    "latest_result_count",
    "email_verified",
    "profile_completed_at",
  ];
  return (
    <>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {visible
          .filter((key) => key in row)
          .map((key) => {
            const value = row[key];
            const display =
              value == null
                ? "—"
                : key.endsWith("_at")
                  ? new Date(String(value)).toLocaleString(locale)
                  : typeof value === "boolean"
                    ? t(value ? "admin.yes" : "admin.no")
                    : key === "kind"
                      ? t(`common.jobs.kind.${value}`)
                      : [
                            "status",
                            "visibility",
                            "app_role",
                            "cost_state",
                          ].includes(key)
                        ? t(`admin.value.${value}`)
                        : key === "error_code"
                          ? t(`common.jobs.error.${value}`)
                          : Array.isArray(value)
                            ? value.join(", ")
                            : String(value);
            return (
              <div key={key} className="min-w-0">
                <dt className="text-muted-foreground">
                  {t(`admin.field.${key}`)}
                </dt>
                <dd className="whitespace-pre-wrap break-words">{display}</dd>
              </div>
            );
          })}
      </dl>
      <details className="mt-4">
        <summary>{t("admin.advanced")}</summary>
        <dl className="space-y-2 text-sm">
          {[
            "id",
            "version",
            "source_revision",
            "provider_request_id",
            "owner_id",
            "project_id",
            "retry_of_id",
            "active_guide_id",
          ]
            .filter((k) => row[k] != null)
            .map((k) => (
              <div key={k}>
                <dt>{t(`admin.field.${k}`)}</dt>
                <dd className="break-words">
                  {[
                    "owner_id",
                    "project_id",
                    "retry_of_id",
                    "active_guide_id",
                  ].includes(k) ? (
                    <Link
                      className="underline"
                      href={`/admin/${({ owner_id: "users", project_id: "projects", retry_of_id: "jobs", active_guide_id: "guides" } as Record<string, string>)[k]}/${row[k]}`}
                    >
                      {t("admin.open")}
                    </Link>
                  ) : (
                    String(row[k])
                  )}
                </dd>
              </div>
            ))}
        </dl>
      </details>
    </>
  );
}
