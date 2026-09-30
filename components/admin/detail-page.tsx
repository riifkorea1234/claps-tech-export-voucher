"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { apiRequest } from "@/lib/api/client";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanHistory } from "@/components/domain/monitoring-workspace";
import {
  Tabs,
  Field,
  RecordView,
  ConfirmAction,
  type Row,
  type RequestFn,
  type Act,
} from "./shared";
import { ListPage } from "./list-page";
import { TranslationEditor } from "./translation-editor";
export function DetailPage({
  section,
  id,
  row,
  params,
  update,
  back,
  request,
  act,
  busy,
  reload,
  readRetry,
  failed,
}: {
  section: string;
  id: string;
  row: Row | null;
  params: URLSearchParams;
  update: (data: Record<string, string>) => void;
  back: string;
  request: RequestFn;
  act: Act;
  busy: boolean;
  reload: number;
  readRetry: number;
  failed: (e: unknown) => void;
}) {
  const { t, locale } = useLanguage(),
    router = useRouter();
  const profile = row?.profile as Row | undefined;
  const initial = {
    name: row?.name ?? "",
    description: String(profile?.description ?? row?.description ?? ""),
    ipName: String(row?.ip_name ?? ""),
    contactEmail: String(row?.contact_email ?? ""),
    tags: ((profile?.tags as string[]) ?? []).join(", "),
    ipNames: ((profile?.ipNames as string[]) ?? []).join(", "),
    marketDescription: String(profile?.marketDescription ?? ""),
    imageAlt: String(profile?.imageAlt ?? ""),
    visibility: row?.visibility ?? "private",
  };
  const [form, setForm] = useState(initial),
    [reason, setReason] = useState(""),
    [guide, setGuide] = useState(""),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [baseline, setBaseline] = useState(initial),
    version = useRef(row?.version);
  const editing = id === "new" || params.get("mode") === "edit",
    dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const editable = ["projects", "partners"].includes(section);
  const visibilityChange =
    section === "partners" &&
    (form.visibility !== baseline.visibility ||
      (id === "new" && form.visibility === "public"));
  const tab = params.get("tab") || "basic";
  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (alive && !editing && row) {
        const p = row.profile as Row | undefined;
        const next = {
          name: row.name ?? "",
          description: String(p?.description ?? row.description ?? ""),
          ipName: String(row.ip_name ?? ""),
          contactEmail: String(row.contact_email ?? ""),
          tags: ((p?.tags as string[]) ?? []).join(", "),
          ipNames: ((p?.ipNames as string[]) ?? []).join(", "),
          marketDescription: String(p?.marketDescription ?? ""),
          imageAlt: String(p?.imageAlt ?? ""),
          visibility: row.visibility ?? "private",
        };
        setForm(next);
        setBaseline(next);
        version.current = row.version;
      }
    });
    return () => {
      alive = false;
    };
  }, [row, editing]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const click = (e: MouseEvent) => {
      if (
        (e.target as Element).closest("a") &&
        !window.confirm(t("admin.discardChanges"))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, t]);
  const tabs =
    section === "users"
      ? ["basic", "projects", "jobs", "monitoring", "history"]
      : section === "projects"
        ? ["basic", "guides", "assets", "jobs", "history"]
        : section === "partners"
          ? ["basic", "images", "translations", "history"]
          : section === "monitoring"
            ? ["basic", "scans", "history"]
            : ["basic", "history"];
  function href(key: string) {
    const p = new URLSearchParams(params);
    p.set("tab", key);
    p.delete("page");
    p.delete("q");
    return `/admin/${section}/${id}?${p}`;
  }
  function hasReason() {
    if (reason.trim()) return true;
    setFieldErrors({ reason: t("admin.reasonRequired") });
    document.querySelector<HTMLInputElement>('input[name="reason"]')?.focus();
    return false;
  }
  function mutation(
    action: string,
    fn: () => Promise<unknown>,
    message = action,
  ) {
    if (hasReason()) void act(fn, message);
  }
  async function submit() {
    const data =
      section === "partners"
        ? {
            name: form.name,
            description: form.description,
            marketDescription: form.marketDescription,
            imageAlt: form.imageAlt,
            contactEmail: form.contactEmail || null,
            tags: form.tags
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
            ipNames: form.ipNames
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
            visibility: form.visibility,
            reason,
          }
        : {
            name: form.name,
            ipName: form.ipName,
            description: form.description,
            archived: !!row?.archived_at,
            reason,
          };
    try {
      const saved = await request<{ id: string; version: number }>(
        `${section}${id === "new" ? "" : `/${id}`}`,
        id === "new" ? "POST" : "PATCH",
        { ...data, ...(id === "new" ? {} : { version: version.current }) },
      );
      version.current = saved.version;
      setBaseline(form);
      if (id === "new") router.replace(`/admin/${section}/${saved.id}`);
      else update({ mode: "" });
    } catch (e) {
      const errors = (e as { fieldErrors?: Record<string, string[]> })
        .fieldErrors;
      if (errors)
        setFieldErrors(
          Object.fromEntries(
            Object.entries(errors).map(([k, v]) => [k, v.join(", ")]),
          ),
        );
      throw e;
    }
  }
  function archive() {
    mutation(
      "archive",
      async () => {
        if (section === "projects")
          await request(`projects/${id}`, "PATCH", {
            version: row?.version,
            name: row?.name,
            ipName: row?.ip_name,
            description: row?.description,
            archived: !row?.archived_at,
            reason,
          });
        else
          await request(
            `${section === "monitoring" ? "monitoring-records" : section}/${id}`,
            "POST",
            {
              version: row?.version,
              action: row?.archived_at ? "restore" : "archive",
              reason,
            },
          );
        const target = new URL(back, location.origin);
        target.searchParams.set(
          "result",
          row?.archived_at ? "restore" : "archive",
        );
        target.searchParams.set("restoreId", id);
        router.push(target.pathname + target.search);
      },
      row?.archived_at ? "restore" : "archive",
    );
  }
  const entity = (
    {
      users: "user",
      projects: "project",
      partners: "partner",
      jobs: "job",
      monitoring: "monitoring",
    } as Record<string, string>
  )[section];
  const relatedParams = new URLSearchParams(params);
  ["mode", "back", "tab"].forEach((k) => relatedParams.delete(k));
  if (tab === "history") {
    relatedParams.set("entityType", entity);
    relatedParams.set("entityId", id);
  } else relatedParams.set(section === "users" ? "ownerId" : "projectId", id);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          {row?.name ?? t(`admin.${section}`)}{" "}
          {row?.archived_at ? (
            <span className="rounded bg-muted p-1 text-sm">
              {t("admin.archived")}
            </span>
          ) : null}
        </h2>
        {editable && !editing && tab === "basic" && (
          <Button onClick={() => update({ mode: "edit" })}>
            {t("admin.edit")}
          </Button>
        )}
      </div>
      {id !== "new" && <Tabs items={tabs} selected={tab} href={href} />}
      {tab === "basic" && (
        <section className="space-y-4 rounded border bg-background p-5">
          {!editing && row && <RecordView row={row} />}
          {editing && editable && (
            <form
              className="max-w-2xl space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (visibilityChange)
                  e.currentTarget
                    .querySelector<HTMLButtonElement>("[data-confirm-action]")
                    ?.click();
                else if (hasReason()) void act(submit, "saved");
              }}
            >
              {(section === "projects"
                ? ["name", "ipName", "description"]
                : [
                    "name",
                    "description",
                    "marketDescription",
                    "imageAlt",
                    "contactEmail",
                    "tags",
                    "ipNames",
                  ]
              ).map((k) => (
                <Field
                  key={k}
                  name={k}
                  value={form[k as keyof typeof form]}
                  change={(v) => setForm({ ...form, [k]: v })}
                  multiline={["description", "marketDescription"].includes(k)}
                  required={["name", "ipName"].includes(k)}
                  error={fieldErrors[k]}
                />
              ))}
              {section === "partners" && (
                <label>
                  {t("admin.visibility")}
                  <select
                    aria-label={t("admin.visibility")}
                    className="ml-2 rounded border p-2"
                    value={form.visibility}
                    onChange={(e) =>
                      setForm({ ...form, visibility: e.target.value })
                    }
                  >
                    {["private", "public"].map((v) => (
                      <option
                        disabled={v === "public" && !!row?.archived_at}
                        value={v}
                        key={v}
                      >
                        {t(`admin.${v}`)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div data-admin-reason>
                <Field
                  name="reason"
                  value={reason}
                  change={setReason}
                  required
                  error={fieldErrors.reason}
                />
              </div>
              {section === "partners" && id === "new" && (
                <p>{t("admin.imagesAfterSave")}</p>
              )}
              {visibilityChange ? (
                <ConfirmAction
                  label={t("admin.save")}
                  impact={t("admin.confirmImpact.visibility")}
                  target={form.name}
                  reason={reason}
                  busy={busy || (id !== "new" && !dirty)}
                  run={() => mutation("saved", submit)}
                />
              ) : (
                <Button disabled={busy || (id !== "new" && !dirty)}>
                  {t("admin.save")}
                </Button>
              )}
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  if (dirty && !window.confirm(t("admin.discardChanges")))
                    return;
                  setForm(baseline);
                  setReason("");
                  update({ mode: "" });
                  if (id === "new") router.push(back);
                }}
              >
                {t("admin.discardCancel")}
              </Button>
            </form>
          )}
          {section === "users" && row?.status === "withdrawal_pending" && (
            <p>{t("admin.withdrawalHelp")}</p>
          )}
          {section === "jobs" && (
            <>
              <p>{t("admin.retryHelp")}</p>
              <p>{t("admin.jobReadonly")}</p>
              <Field
                name="reason"
                value={reason}
                change={setReason}
                required
                error={fieldErrors.reason}
              />
              {row?.retryJobId ? (
                <Link
                  className="underline"
                  href={`/admin/jobs/${row.retryJobId}`}
                >
                  {t("admin.openRetry")}
                </Link>
              ) : row?.canRetry ? (
                <Button
                  disabled={busy}
                  onClick={() =>
                    mutation("retry", async () => {
                      const r = await request<{ id: string }>(
                        `jobs/${id}`,
                        "POST",
                        { action: "retry", reason },
                      );
                      router.push(`/admin/jobs/${r.id}`);
                    })
                  }
                >
                  {t("admin.retry")}
                </Button>
              ) : (
                <p>{t("admin.retryUnavailable")}</p>
              )}
              {row?.canCancel ? (
                <ConfirmAction
                  label={t("admin.cancel")}
                  impact={t("admin.confirmImpact.cancel")}
                  target={t(`common.jobs.kind.${row?.kind}`)}
                  reason={reason}
                  busy={busy}
                  run={() =>
                    mutation("cancel", () =>
                      request(`jobs/${id}`, "POST", {
                        action: "cancel",
                        reason,
                      }),
                    )
                  }
                />
              ) : (
                <p>{t("admin.cancelUnavailable")}</p>
              )}
              {!!row?.usage && (
                <p>
                  {t("admin.usageUnits")}:{" "}
                  {String((row.usage as Row).units ?? "—")}{" "}
                  {String((row.usage as Row).unit ?? "")}
                </p>
              )}
            </>
          )}
          {section === "monitoring" && (
            <>
              <Field
                name="reason"
                value={reason}
                change={setReason}
                required
                error={fieldErrors.reason}
              />
              {!(row?.record as Row)?.scanAvailable && (
                <p>{t("monitoring.providerUnavailable")}</p>
              )}
              <Button
                disabled={busy || !(row?.record as Row)?.scanAvailable}
                onClick={() =>
                  mutation("scan", () =>
                    request(`monitoring-records/${id}`, "POST", {
                      version: row?.version,
                      action: "scan",
                      reason,
                      outputLocale: locale,
                      idempotencyKey: crypto.randomUUID(),
                    }),
                  )
                }
              >
                {t("monitoring.start_scan")}
              </Button>
            </>
          )}
        </section>
      )}
      {tab === "history" && (
        <ListPage
          section="audit-logs"
          params={relatedParams}
          update={update}
          request={request}
          reload={reload}
          failed={failed}
          related
        />
      )}
      {((section === "users" &&
        ["projects", "jobs", "monitoring"].includes(tab)) ||
        (section === "projects" && tab === "jobs")) && (
        <ListPage
          section={tab}
          params={relatedParams}
          update={update}
          request={request}
          reload={reload}
          failed={failed}
          related
        />
      )}
      {tab === "scans" && (
        <ScanHistory path={`/api/admin/monitoring-records/${id}/scans`} />
      )}
      {tab === "assets" && (
        <section className="space-y-4">
          <p>{t("admin.assetsReadonly")}</p>
          {["sessions", "assets"].map((k) => (
            <div key={k} className="overflow-auto">
              <h3>{t(`admin.${k}`)}</h3>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th>{t("admin.name")}</th>
                    <th>{t("admin.status")}</th>
                    <th>{t("admin.details")}</th>
                  </tr>
                </thead>
                <tbody>
                  {((row?.[k] as Row[]) ?? []).map((item, i) => (
                    <tr key={item.id}>
                      <td className="p-3">
                        {String(item.title ?? `${t("admin.assets")} ${i + 1}`)}
                      </td>
                      <td>
                        {k === "assets"
                          ? t(
                              item.finalized_at
                                ? "admin.finalized"
                                : item.adopted
                                  ? "admin.adopted"
                                  : "admin.generated",
                            )
                          : "—"}
                      </td>
                      <td>
                        <details>
                          <summary>{t("admin.details")}</summary>
                          <pre className="max-w-sm overflow-auto whitespace-pre-wrap">
                            {(item.verification as Row)?.verdict
                              ? t(
                                  `assets.verdict.${(item.verification as Row).verdict}`,
                                )
                              : "—"}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!(row?.[k] as Row[])?.length && <p>{t("admin.empty")}</p>}
            </div>
          ))}
        </section>
      )}
      {tab === "guides" && (
        <section className="space-y-4">
          <p>{t("admin.guidesLater")}</p>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {["version", "status", "created_at"].map((k) => (
                    <th key={k}>{t(`admin.field.${k}`)}</th>
                  ))}
                  <th>{t("admin.current")}</th>
                  <th>{t("admin.details")}</th>
                </tr>
              </thead>
              <tbody>
                {((row?.guides as Row[]) ?? []).map((g) => (
                  <tr key={g.id}>
                    <td className="p-3">v{g.version}</td>
                    <td>{t(`admin.value.${g.status}`)}</td>
                    <td>
                      {g.created_at
                        ? new Date(String(g.created_at)).toLocaleDateString(
                            locale,
                          )
                        : "—"}
                    </td>
                    <td>
                      {g.id === row?.active_guide_id ? t("admin.yes") : "—"}
                    </td>
                    <td>
                      <Button variant="outline" onClick={() => setGuide(g.id!)}>
                        {t("admin.translations")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {guide && (
            <TranslationEditor
              readRetry={readRetry}
              key={guide}
              type="guide"
              id={guide}
              request={request}
              act={act}
              busy={busy}
            />
          )}
        </section>
      )}
      {tab === "translations" && (
        <TranslationEditor
          readRetry={readRetry}
          type="partner"
          id={id}
          request={request}
          act={act}
          busy={busy}
        />
      )}
      {tab === "images" && (
        <section className="space-y-4 rounded border p-4">
          <Field
            name="reason"
            value={reason}
            change={setReason}
            required
            error={fieldErrors.reason}
          />
          <label>
            {t("admin.uploadImage")}
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && hasReason())
                  void act(async () => {
                    const q = new URLSearchParams({
                      version: String(row?.version),
                      reason,
                      name: file.name,
                    });
                    await apiRequest(`/api/admin/partners/${id}/images?${q}`, {
                      schema: z.object({ version: z.number() }),
                      locale,
                      method: "POST",
                      headers: { "Content-Type": file.type },
                      body: file,
                    });
                  }, "imageAdded");
                e.target.value = "";
              }}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            {Array.from(
              { length: Number(profile?.imageCount ?? 0) },
              (_, i) => (
                <div key={i} className="space-y-2">
                  <Image
                    unoptimized
                    width={96}
                    height={96}
                    src={`/api/partners/${id}/images/${i}?admin=1&version=${row?.version}`}
                    alt={String(profile?.imageAlt || row?.name)}
                  />
                  <ConfirmAction
                    label={t("admin.removeImage")}
                    impact={t("admin.confirmImpact.image")}
                    target={`${row?.name} · ${i + 1}`}
                    reason={reason}
                    busy={busy}
                    run={() =>
                      mutation("imageRemoved", () =>
                        request(`partners/${id}/images/${i}`, "DELETE", {
                          version: row?.version,
                          reason,
                        }),
                      )
                    }
                  />
                </div>
              ),
            )}
          </div>
        </section>
      )}
      {id !== "new" && !editing && section !== "jobs" && (
        <section className="space-y-3 rounded border border-destructive/40 bg-background p-5">
          <h2>{t("admin.dangerZone")}</h2>
          {section === "users" ? (
            <>
              {row?.isSelf ? (
                <p>{t("admin.selfHelp")}</p>
              ) : row?.status === "withdrawal_pending" ? (
                <p>{t("admin.withdrawalHelp")}</p>
              ) : (
                <>
                  <Field
                    name="reason"
                    value={reason}
                    change={setReason}
                    required
                    error={fieldErrors.reason}
                  />
                  {row?.status === "suspended" ? (
                    row.email_verified && row.profile_completed_at ? (
                      <ConfirmAction
                        label={t("admin.restore")}
                        impact={t("admin.confirmImpact.restore")}
                        target={row.name ?? ""}
                        reason={reason}
                        busy={busy}
                        run={() =>
                          mutation("restore", () =>
                            request(`users/${id}`, "PATCH", {
                              version: row?.version,
                              action: "restore",
                              reason,
                            }),
                          )
                        }
                      />
                    ) : (
                      <p>{t("admin.restoreUnavailable")}</p>
                    )
                  ) : (
                    row?.status === "active" && (
                      <ConfirmAction
                        label={t("admin.suspend")}
                        impact={t("admin.confirmImpact.suspend")}
                        target={row.name ?? ""}
                        reason={reason}
                        busy={busy}
                        run={() =>
                          mutation("suspend", () =>
                            request(`users/${id}`, "PATCH", {
                              version: row?.version,
                              action: "suspend",
                              reason,
                            }),
                          )
                        }
                      />
                    )
                  )}
                  <ConfirmAction
                    label={t("admin.revoke")}
                    impact={t("admin.confirmImpact.revoke")}
                    target={row?.name ?? ""}
                    reason={reason}
                    busy={busy}
                    run={() =>
                      mutation("revoke", () =>
                        request(`users/${id}`, "PATCH", {
                          version: row?.version,
                          action: "revoke",
                          reason,
                        }),
                      )
                    }
                  />
                </>
              )}
            </>
          ) : (
            <>
              <p>{t(`admin.confirmImpact.${section}`)}</p>
              <Field
                name="reason"
                value={reason}
                change={setReason}
                required
                error={fieldErrors.reason}
              />
              <ConfirmAction
                label={t(row?.archived_at ? "admin.restore" : "admin.archive")}
                impact={t(
                  `admin.confirmImpact.${row?.archived_at ? "restore" : section}`,
                )}
                target={row?.name ?? ""}
                reason={reason}
                busy={busy || dirty}
                run={archive}
              />
            </>
          )}
        </section>
      )}
    </div>
  );
}
