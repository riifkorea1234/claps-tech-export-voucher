"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Row, type Result, type RequestFn } from "./shared";
export const endpoint = (section: string) =>
  section === "monitoring" ? "monitoring-records" : section;
const columns: Record<string, string[]> = {
  users: ["name", "email", "org_name", "created_at", "status"],
  projects: ["name", "ip_name", "status", "archived_at", "created_at"],
  partners: ["name", "visibility", "archived_at", "created_at"],
  jobs: ["kind", "status", "attempt", "error_code", "created_at"],
  monitoring: ["name", "latest_result_count", "archived_at", "created_at"],
  guides: ["version", "status", "created_at"],
  "audit-logs": ["created_at", "action", "entity_type", "reason"],
};
export function ListPage({
  section,
  params,
  update,
  request,
  reload,
  failed,
  related = false,
}: {
  section: string;
  params: URLSearchParams;
  update: (data: Record<string, string>) => void;
  request: RequestFn;
  reload: number;
  failed: (e: unknown) => void;
  related?: boolean;
}) {
  const { t, locale } = useLanguage();
  const [result, setResult] = useState<Result | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const page = Number(params.get("page") || 1),
    from = params.get("from") || "",
    to = params.get("to") || "";
  const validRange = !from || !to || from <= to;
  const key = params.toString();
  useEffect(() => {
    let alive = true;
    if (!validRange) return;
    const q = new URLSearchParams(key);
    ["tab", "back", "mode", "refresh", "result", "restoreId"].forEach((k) =>
      q.delete(k),
    );
    if (from) q.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) q.set("to", new Date(`${to}T23:59:59.999`).toISOString());
    queueMicrotask(() => {
      if (alive) {
        setLoading(true);
        setError(false);
      }
    });
    request<Result>(`${endpoint(section)}?${q}`)
      .then((data) => {
        if (alive) setResult(data);
      })
      .catch((e) => {
        if (alive) {
          setError(true);
          failed(e);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [key, section, reload, request, failed, from, to, validRange]);
  function change(k: string, v: string) {
    update({ [k]: v, page: "1" });
  }
  function cell(row: Row, k: string) {
    const value = row[k];
    if (k === "created_at")
      return new Date(String(value)).toLocaleString(locale);
    if (k === "archived_at")
      return t(value ? "admin.archived" : "admin.activeRecords");
    if (k === "kind") return t(`common.jobs.kind.${value}`);
    if (k === "action") return t(`admin.audit.${value}`);
    if (k === "entity_type") return t(`admin.entity.${value}`);
    if (["status", "visibility"].includes(k)) return t(`admin.value.${value}`);
    if (k === "error_code" && value) return t(`common.jobs.error.${value}`);
    return String(value ?? "—");
  }
  function detailLink(row: Row) {
    const back = related
      ? `${location.pathname}${location.search}`
      : `/admin/${section}?${key}`;
    return `/admin/${section}/${row.id}?${new URLSearchParams({ back })}`;
  }
  return (
    <section className="space-y-4" aria-busy={loading}>
      {section === "audit-logs" && <p>{t("admin.auditReadonly")}</p>}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          change("q", query);
        }}
      >
        <label className="min-w-0">
          {t("admin.search")}
          <Input
            placeholder={t(`admin.searchHint.${section}`)}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <Button>{t("admin.search")}</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => update({ refresh: String(Date.now()) })}
        >
          {t("admin.refresh")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setQuery("");
            update({
              q: "",
              status: "",
              kind: "",
              from: "",
              to: "",
              archived: "active",
              page: "1",
              entityType: "",
              actorId: "",
              action: "",
            });
          }}
        >
          {t("admin.resetFilters")}
        </Button>
      </form>
      <div className="flex flex-wrap gap-3">
        {["projects", "partners", "monitoring"].includes(section) && (
          <label>
            {t("admin.archived")}
            <select
              aria-label={t("admin.archived")}
              className="block rounded border p-2"
              value={params.get("archived") || "active"}
              onChange={(e) => change("archived", e.target.value)}
            >
              {["active", "archived", "all"].map((v) => (
                <option key={v} value={v}>
                  {t(v === "active" ? "admin.activeRecords" : `admin.${v}`)}
                </option>
              ))}
            </select>
          </label>
        )}
        {["jobs", "users"].includes(section) && (
          <label>
            {t("admin.status")}
            <select
              aria-label={t("admin.status")}
              className="block rounded border p-2"
              value={params.get("status") || ""}
              onChange={(e) => change("status", e.target.value)}
            >
              <option value="">{t("admin.all")}</option>
              {(section === "jobs"
                ? ["queued", "running", "succeeded", "failed", "canceled"]
                : [
                    "active",
                    "suspended",
                    "withdrawal_pending",
                    "email_unverified",
                    "profile_pending",
                  ]
              ).map((v) => (
                <option key={v} value={v}>
                  {t(`admin.value.${v}`)}
                </option>
              ))}
            </select>
          </label>
        )}
        {section === "jobs" && (
          <label>
            {t("admin.kind")}
            <select
              aria-label={t("admin.kind")}
              className="block rounded border p-2"
              value={params.get("kind") || ""}
              onChange={(e) => change("kind", e.target.value)}
            >
              <option value="">{t("admin.all")}</option>
              {[
                "generation",
                "guide_extraction",
                "verification",
                "matching",
                "monitoring",
                "export",
              ].map((v) => (
                <option key={v} value={v}>
                  {t(`common.jobs.kind.${v}`)}
                </option>
              ))}
            </select>
          </label>
        )}
        {section === "audit-logs" && (
          <label>
            {t("admin.entityType")}
            <select
              aria-label={t("admin.entityType")}
              className="block rounded border p-2"
              value={params.get("entityType") || ""}
              onChange={(e) => change("entityType", e.target.value)}
            >
              <option value="">{t("admin.all")}</option>
              {[
                "user",
                "project",
                "partner",
                "job",
                "monitoring",
                "guide",
                "locale",
              ].map((v) => (
                <option key={v} value={v}>
                  {t(`admin.entity.${v}`)}
                </option>
              ))}
            </select>
          </label>
        )}
        {["jobs", "audit-logs"].includes(section) && (
          <>
            <label>
              {t("admin.from")}
              <Input
                type="date"
                value={from}
                onChange={(e) => change("from", e.target.value)}
              />
            </label>
            <label>
              {t("admin.to")}
              <Input
                type="date"
                value={to}
                onChange={(e) => change("to", e.target.value)}
              />
            </label>
          </>
        )}
        <label>
          {t("admin.pageSize")}
          <select
            aria-label={t("admin.pageSize")}
            className="block rounded border p-2"
            value={params.get("pageSize") || "20"}
            onChange={(e) => change("pageSize", e.target.value)}
          >
            {[20, 50, 100].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          {t("admin.sort")}
          <select
            aria-label={t("admin.sort")}
            className="block rounded border p-2"
            value={params.get("sort") || "created_at"}
            onChange={(e) => change("sort", e.target.value)}
          >
            <option value="created_at">{t("admin.date")}</option>
            {columns[section]?.includes("name") && (
              <option value="name">{t("admin.name")}</option>
            )}
          </select>
        </label>
        <label>
          {t("admin.order")}
          <select
            aria-label={t("admin.order")}
            className="block rounded border p-2"
            value={params.get("order") || "desc"}
            onChange={(e) => change("order", e.target.value)}
          >
            {["desc", "asc"].map((v) => (
              <option key={v} value={v}>
                {t(`admin.${v}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!validRange && <p role="alert">{t("admin.dateRangeError")}</p>}
      {loading && <p role="status">{t("admin.loading")}</p>}
      {error && (
        <Button
          variant="outline"
          onClick={() => update({ refresh: String(Date.now()) })}
        >
          {t("admin.refresh")}
        </Button>
      )}
      {result && validRange && !error && (
        <div className="overflow-auto rounded border bg-background">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{t(`admin.${section}`)}</caption>
            <thead>
              <tr>
                {columns[section]?.map((k) => (
                  <th scope="col" key={k} className="p-3">
                    {t(`admin.field.${k}`)}
                  </th>
                ))}
                <th scope="col" className="p-3">
                  {t("admin.details")}
                </th>
              </tr>
            </thead>
            <tbody>
              {result.items?.map((row) => (
                <tr key={row.id} className="border-t">
                  {columns[section]?.map((k, i) => (
                    <td key={k} className="max-w-64 break-words p-3">
                      {i === 0 && section !== "audit-logs" ? (
                        <Link className="underline" href={detailLink(row)}>
                          {cell(row, k)}
                        </Link>
                      ) : (
                        cell(row, k)
                      )}
                    </td>
                  ))}
                  <td className="p-3">
                    {section === "audit-logs" ? (
                      <details>
                        <summary>{t("admin.details")}</summary>
                        <Link
                          className="underline"
                          href={`/admin/${({ user: "users", project: "projects", partner: "partners", job: "jobs", monitoring: "monitoring", guide: "guides", locale: "locales" } as Record<string, string>)[String(row.entity_type)] ?? ""}/${row.entity_type === "locale" ? "" : row.entity_id}`}
                        >
                          {t("admin.open")}
                        </Link>
                        <pre className="max-w-sm overflow-auto text-xs">
                          {JSON.stringify(row.changes, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <Link className="underline" href={detailLink(row)}>
                        {t("admin.open")}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !result.items?.length && (
            <p className="p-5">{t("admin.empty")}</p>
          )}
        </div>
      )}
      {!loading && result && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => update({ page: String(page - 1) })}
          >
            {t("admin.previous")}
          </Button>
          <span>
            {page} / {Math.max(1, result.totalPages ?? 1)}
          </span>
          <Button
            variant="outline"
            disabled={page >= (result.totalPages ?? 1)}
            onClick={() => update({ page: String(page + 1) })}
          >
            {t("admin.next")}
          </Button>
        </div>
      )}
    </section>
  );
}
