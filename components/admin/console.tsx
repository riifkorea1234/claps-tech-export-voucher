"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { z } from "zod";
import { apiRequest, ApiClientError } from "@/lib/api/client";
import { clearCurrent, navigateAfterAuth } from "@/lib/account-store";
import { useLanguage } from "@/lib/i18n/provider";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FieldErrors,
  Tabs,
  type Row,
  type Result,
  type RequestFn,
} from "./shared";
import { ListPage, endpoint } from "./list-page";
import { DetailPage } from "./detail-page";
import { LocaleEditor } from "./locale-editor";
const operations = ["jobs", "monitoring", "audit-logs", "locales"];
export function AdminConsole({
  section,
  id,
  actor,
}: {
  section: string;
  id?: string;
  actor: string;
}) {
  const { t, locale } = useLanguage(),
    pathname = usePathname(),
    searchParams = useSearchParams();
  const [result, setResult] = useState<Result | null>(null),
    [detail, setDetail] = useState<Row | null>(null),
    [loading, setLoading] = useState(
      section === "overview" || section === "locales" || (!!id && id !== "new"),
    ),
    [reauth, setReauth] = useState(false),
    [password, setPassword] = useState("");
  const [error, setError] = useState<ApiClientError | Error | null>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [reload, setReload] = useState(0),
    [expires, setExpires] = useState("");
  const [now, setNow] = useState(Date.now()),
    [readRetry, setReadRetry] = useState(0);
  const pending = useRef<(() => Promise<void>) | null>(null),
    reauthDialog = useRef<HTMLDialogElement>(null),
    alert = useRef<HTMLDivElement>(null),
    localeRef = useRef(locale);
  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);
  const request: RequestFn = useCallback(
    async <T,>(path: string, method = "GET", body?: unknown): Promise<T> => {
      try {
        return (
          await apiRequest(`/api/admin/${path}`, {
            schema: z.unknown(),
            locale: localeRef.current,
            method,
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          })
        ).data as T;
      } catch (e) {
        if (e instanceof ApiClientError && e.code === "ADMIN_REAUTH_REQUIRED")
          queueMicrotask(() => setReauth(true));
        throw e;
      }
    },
    [],
  );
  const failed = useCallback((e: unknown) => {
    if (e instanceof ApiClientError && e.code === "ADMIN_REAUTH_REQUIRED")
      setReauth(true);
    else setError(e instanceof Error ? e : new Error("INTERNAL_ERROR"));
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (reauth) reauthDialog.current?.showModal();
    else reauthDialog.current?.close();
  }, [reauth]);
  useEffect(() => {
    if (error || notice) alert.current?.focus();
  }, [error, notice]);
  useEffect(() => {
    let alive = true;
    if (
      !(section === "overview" || section === "locales" || (id && id !== "new"))
    ) {
      return;
    }
    queueMicrotask(() => {
      if (alive) setLoading(true);
    });
    request<Result & Row>(id ? `${endpoint(section)}/${id}` : section)
      .then((data) => {
        if (alive) {
          if (id) setDetail(data);
          else setResult(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (alive) failed(e);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [section, id, reload, request, failed]);
  useEffect(() => {
    request<{ expiresAt: string }>("session")
      .then((data) => setExpires(data.expiresAt))
      .catch(() => {});
  }, [request, reload]);
  async function act(fn: () => Promise<unknown>, message = "saved") {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      await fn();
      setNotice(t(`admin.done.${message}`));
      setReload((v) => v + 1);
    } catch (e) {
      if (e instanceof ApiClientError && e.code === "ADMIN_REAUTH_REQUIRED") {
        pending.current = () => act(fn, message);
        setReauth(true);
      } else failed(e);
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const data = await request<{ expiresAt: string }>(
        "reauthenticate",
        "POST",
        { password },
      );
      setExpires(data.expiresAt);
      setPassword("");
      setReauth(false);
      setNotice(t("admin.reauthDone"));
      const next = pending.current;
      pending.current = null;
      setBusy(false);
      if (next) await next();
      else {
        setReadRetry((v) => v + 1);
        setReload((v) => v + 1);
      }
    } catch (e) {
      failed(e);
    } finally {
      setBusy(false);
    }
  }
  function update(data: Record<string, string>) {
    const params = new URLSearchParams(window.location.search);
    Object.entries(data).forEach(([k, v]) =>
      v ? params.set(k, v) : params.delete(k),
    );
    window.history.replaceState(null, "", `${pathname}?${params}`);
  }
  const params = new URLSearchParams(searchParams),
    back = params.get("back");
  const safeBack =
    back &&
    /^\/admin(?:\/[a-z-]+(?:\/[a-f0-9-]+)?)?(?:\?[^\\\r\n]*)?$/.test(back)
      ? back
      : `/admin/${section}`;
  const menus = ["overview", "users", "projects", "partners", "operations"],
    active = operations.includes(section) ? "operations" : section;
  return (
    <FieldErrors.Provider
      value={error instanceof ApiClientError ? (error.fieldErrors ?? {}) : {}}
    >
      <div className="min-h-screen bg-muted/20">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-5 py-4">
          <Link href="/admin" className="font-semibold">
            CLAPS · {t("admin.title")}
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              {t("admin.administrator")}: {actor}
            </span>
            {expires && (
              <span>
                {t("admin.verifiedUntil")}:{" "}
                {new Date(expires).toLocaleTimeString(locale)}
              </span>
            )}
            <Link className="underline" href="/projects">
              {t("admin.backApp")}
            </Link>
            <Button
              variant="outline"
              onClick={() =>
                void clearCurrent()
                  .then(() => navigateAfterAuth("/"))
                  .catch(failed)
              }
            >
              {t("navigation.log_out")}
            </Button>
            <LanguageSwitcher />
          </div>
        </header>
        <div className="mx-auto flex max-w-7xl flex-col md:flex-row">
          <nav
            aria-label={t("admin.menu")}
            className="flex flex-wrap gap-1 border-b p-3 md:w-48 md:shrink-0 md:flex-col md:border-r"
          >
            {menus.map((menu) => (
              <Link
                key={menu}
                href={
                  menu === "overview"
                    ? "/admin"
                    : `/admin/${menu === "operations" ? "jobs" : menu}`
                }
                aria-current={active === menu ? "page" : undefined}
                className={`rounded px-3 py-2 text-sm ${active === menu ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {t(`admin.${menu}`)}
              </Link>
            ))}
          </nav>
          <main
            className="min-w-0 flex-1 space-y-5 p-5 md:p-8"
            aria-busy={busy}
          >
            <h1 className="text-2xl font-semibold">{t(`admin.${section}`)}</h1>
            <div ref={alert} tabIndex={-1}>
              {error && (
                <div
                  role="alert"
                  className="space-y-2 rounded border border-destructive p-3"
                >
                  <p>
                    {error.message === "INTERNAL_ERROR"
                      ? t("admin.error")
                      : error.message}
                  </p>
                  {error instanceof ApiClientError && (
                    <>
                      <p>
                        {t("admin.requestId")}: {error.requestId ?? "—"}
                      </p>
                      {Object.entries(error.fieldErrors ?? {}).map(
                        ([key, values]) => (
                          <p key={key}>
                            {key}: {values.join(", ")}
                          </p>
                        ),
                      )}
                      {error.code === "VERSION_CONFLICT" && (
                        <Button onClick={() => setReload((v) => v + 1)}>
                          {t("admin.loadLatest")}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
              {notice && <p role="status">{notice}</p>}
              {["archive", "restore"].includes(
                searchParams.get("result") ?? "",
              ) && (
                <p role="status">
                  {t(`admin.done.${searchParams.get("result")}`)}{" "}
                  {searchParams.get("result") === "archive" &&
                    /^[a-f0-9-]+$/.test(
                      searchParams.get("restoreId") ?? "",
                    ) && (
                      <Link
                        className="underline"
                        href={`/admin/${section}/${searchParams.get("restoreId")}?back=${encodeURIComponent(pathname + "?" + searchParams)}`}
                      >
                        {t("admin.restore")}
                      </Link>
                    )}
                </p>
              )}
            </div>
            {expires && new Date(expires).getTime() - now < 120000 && (
              <p role="status">{t("admin.expirySoon")}</p>
            )}
            {busy && <p role="status">{t("admin.processing")}</p>}
            <dialog
              aria-label={t("admin.reauth")}
              ref={reauthDialog}
              onCancel={() => {
                pending.current = null;
                setReauth(false);
                setNotice(t("admin.reauthCanceled"));
              }}
              className="m-auto max-w-md rounded-xl border bg-background text-foreground backdrop:bg-black/50"
            >
              {reauth && (
                <form
                  className="max-w-md space-y-4 rounded-xl border bg-background p-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void verify();
                  }}
                >
                  <h2 className="text-lg font-medium">{t("admin.reauth")}</h2>
                  {error && (
                    <p role="alert">
                      {error.message}
                      {error instanceof ApiClientError &&
                        ` · ${t("admin.requestId")}: ${error.requestId ?? "—"}`}
                    </p>
                  )}
                  <p>{t("admin.reauthHelp")}</p>
                  <label>
                    {t("admin.password")}
                    <Input
                      autoFocus
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                  <Button disabled={busy}>{t("admin.confirm")}</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      pending.current = null;
                      setReauth(false);
                      setNotice(t("admin.reauthCanceled"));
                    }}
                  >
                    {t("admin.discardCancel")}
                  </Button>
                </form>
              )}
            </dialog>
            <div
              inert={reauth || busy ? true : undefined}
              className="space-y-5"
            >
              {operations.includes(section) && (
                <Tabs
                  items={operations}
                  selected={section}
                  href={(key) => `/admin/${key}`}
                />
              )}
              {loading && <p role="status">{t("admin.loading")}</p>}
              {section === "overview" && result && (
                <>
                  <section className="space-y-2 rounded border bg-background p-4">
                    <h2>{t("admin.today")}</h2>
                    {Number(result.failed) > 0 ? (
                      <Link
                        className="underline"
                        href="/admin/jobs?status=failed"
                      >
                        {t("admin.failed")}: {String(result.failed)} ·{" "}
                        {t("admin.open")}
                      </Link>
                    ) : (
                      <p>{t("admin.noTasks")}</p>
                    )}
                  </section>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    {["users", "projects", "queued", "failed", "cleanup"].map(
                      (k) => (
                        <div
                          key={k}
                          className="rounded border bg-background p-4"
                        >
                          {k === "cleanup" ? (
                            <h2>{t(`admin.${k}`)}</h2>
                          ) : (
                            <Link
                              className="underline"
                              href={
                                k === "users" || k === "projects"
                                  ? `/admin/${k}`
                                  : `/admin/jobs?status=${k}`
                              }
                            >
                              {t(`admin.${k}`)}
                            </Link>
                          )}
                          <p className="text-3xl">{String(result[k] ?? 0)}</p>
                          <p className="text-sm text-muted-foreground">
                            {t(`admin.hint.${k}`)}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                  <h2>{t("admin.usage")}</h2>
                  {!(result.usage as Row[])?.length ? (
                    <p>{t("admin.usageEmpty")}</p>
                  ) : (
                    <div className="overflow-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr>
                            {["date", "kind", "status", "requests"].map((k) => (
                              <th key={k} className="p-3">
                                {t(`admin.${k}`)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(result.usage as Row[]).map((r, i) => (
                            <tr key={i}>
                              <td className="p-3">
                                {new Date(
                                  String(r.usage_date),
                                ).toLocaleDateString(locale)}
                              </td>
                              <td>{t(`common.jobs.kind.${r.kind}`)}</td>
                              <td>{t(`admin.value.${r.status}`)}</td>
                              <td>{String(r.requests)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
              {!id && !["overview", "locales"].includes(section) && (
                <>
                  {section === "partners" && (
                    <Button asChild>
                      <Link href="/admin/partners/new">
                        {t("admin.create")}
                      </Link>
                    </Button>
                  )}
                  <ListPage
                    section={section}
                    params={params}
                    update={update}
                    request={request}
                    reload={reload}
                    failed={failed}
                  />
                </>
              )}
              {section === "locales" && result && (
                <LocaleEditor
                  rows={result.items ?? []}
                  request={request}
                  act={act}
                  busy={busy}
                />
              )}
              {id && (
                <>
                  <Link className="underline" href={safeBack}>
                    {t("admin.backList")}
                  </Link>
                  {(detail || id === "new") && (
                    <DetailPage
                      key={`${section}/${id}`}
                      section={section}
                      id={id}
                      row={detail}
                      readRetry={readRetry}
                      params={params}
                      update={update}
                      back={safeBack}
                      request={request}
                      act={act}
                      busy={busy}
                      reload={reload}
                      failed={failed}
                    />
                  )}{" "}
                  {!detail && !loading && id !== "new" && (
                    <Button onClick={() => setReload((v) => v + 1)}>
                      {t("admin.refresh")}
                    </Button>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </FieldErrors.Provider>
  );
}
