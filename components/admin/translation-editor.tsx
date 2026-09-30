"use client";
import { useEffect, useState, useRef } from "react";
import { ApiClientError } from "@/lib/api/client";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Content } from "@/lib/server/localized-contents/service";
import {
  Field,
  ConfirmAction,
  type Row,
  type RequestFn,
  type Act,
} from "./shared";
type Translation = {
  resourceType: "partner" | "guide";
  resourceKey: string;
  locale: string;
  original: Content;
  draft: Content;
  published: Content | null;
  version: number;
  sourceRevision: number;
  needsUpdate: boolean;
};
export function TranslationEditor({
  type,
  readRetry = 0,
  id,
  request,
  act,
  busy,
}: {
  type: "partner" | "guide";
  readRetry?: number;
  id: string;
  request: RequestFn;
  act: Act;
  busy: boolean;
}) {
  const { t } = useLanguage();
  const region = useRef<HTMLElement>(null),
    [reasonError, setReasonError] = useState("");
  function withReason(fn: () => Promise<unknown>, message = "draftSaved") {
    if (!reason.trim()) {
      setReasonError(t("admin.reasonRequired"));
      region.current
        ?.querySelector<HTMLInputElement>('input[name="reason"]')
        ?.focus();
      return;
    }
    setReasonError("");
    void act(fn, message);
  }
  const [language, setLanguage] = useState(""),
    [locales, setLocales] = useState<Row[]>([]),
    [row, setRow] = useState<Translation | null>(null),
    [content, setContent] = useState<Content | null>(null),
    [reason, setReason] = useState(""),
    [json, setJson] = useState(""),
    [preview, setPreview] = useState<unknown>(null),
    [previewText, setPreviewText] = useState("");
  const [error, setError] = useState("");
  const path = `localized-contents/${type}/${id}/${language}`;
  useEffect(() => {
    let alive = true;
    Promise.all([
      request<{
        items: Row[];
      }>("locales"),
      language ? request<Translation>(path) : Promise.resolve(null),
    ])
      .then(([list, data]) => {
        if (alive) {
          setLocales(list.items);
          if (!language)
            setLanguage(
              String(
                list.items.find((l) => l.code !== "ko" && l.enabled)?.code ??
                  list.items.find((l) => l.code !== "ko")?.code ??
                  "ko",
              ),
            );
          if (data) {
            setRow(data);
            setContent(data.draft);
          }
          setError("");
        }
      })
      .catch((e) => {
        if (alive) setError(e instanceof ApiClientError ? e.message : "");
      });
    return () => {
      alive = false;
    };
  }, [path, request, language, readRetry]);
  const entry = () => ({
    resourceType: type,
    resourceKey: id,
    locale: language,
    version: row!.version,
    sourceRevision: row!.sourceRevision,
    content,
  });
  async function refresh() {
    const next = await request<Translation>(path);
    setRow(next);
    setContent(next.draft);
  }
  async function save() {
    await request("localized-contents/import", "POST", {
      schemaVersion: 1,
      entries: [entry()],
      reason,
    });
    await refresh();
  }
  async function download() {
    const data = await request(`${path}/export`),
      blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `${type}-${id}-${language}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function parsedImport() {
    if (new TextEncoder().encode(json).length > 65536)
      throw new Error(t("admin.jsonTooLarge"));
    try {
      const data = JSON.parse(json);
      return { ...data, reason };
    } catch {
      throw new Error(t("admin.jsonInvalid"));
    }
  }
  return (
    <section
      ref={region}
      className="space-y-4 rounded-xl border bg-background p-5"
      aria-label={t("admin.translations")}
    >
      <p>{t("admin.translationSteps")}</p>
      <h2 className="text-lg font-semibold">{t("admin.translations")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("admin.translationHelp")}
      </p>
      <label>
        {t("admin.contentLanguage")}
        <select
          aria-label={t("admin.contentLanguage")}
          className="ml-3 rounded border p-2"
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            setRow(null);
            setPreview(null);
          }}
        >
          {locales.map((l) => (
            <option key={l.code} value={l.code}>
              {String(l.native_name)} ({l.code})
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert">
          {error === "INTERNAL_ERROR" ? t("admin.error") : error}
        </p>
      )}
      {row && content && (
        <>
          <p role="status">
            {t(row.published ? "admin.published" : "admin.draft")}
          </p>
          {JSON.stringify(content) !== JSON.stringify(row.draft) && (
            <p>{t("admin.saveBeforePublish")}</p>
          )}
          {row.needsUpdate && (
            <p role="status" className="text-amber-700">
              {t("admin.needsUpdate")}
            </p>
          )}
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h3>{t("admin.original")}</h3>
              <ContentView content={row.original} />
            </div>
            <div className="space-y-3">
              <h3>{t("admin.draft")}</h3>
              {content.resourceType === "partner" ? (
                <>
                  <Field
                    name="name"
                    value={content.name}
                    change={(name) => setContent({ ...content, name })}
                  />
                  <Field
                    name="description"
                    value={content.description}
                    change={(description) =>
                      setContent({ ...content, description })
                    }
                    multiline
                  />
                  <Field
                    name="ipNames"
                    value={content.ipNames?.join(", ") ?? ""}
                    change={(value) =>
                      setContent({
                        ...content,
                        ipNames: value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                  <Field
                    name="marketDescription"
                    value={content.marketDescription ?? ""}
                    change={(marketDescription) =>
                      setContent({ ...content, marketDescription })
                    }
                    multiline
                  />
                  <Field
                    name="imageAlt"
                    value={content.imageAlt ?? ""}
                    change={(imageAlt) => setContent({ ...content, imageAlt })}
                  />
                </>
              ) : (
                content.rules.map((rule, index) => (
                  <div key={rule.ruleId}>
                    <Field
                      name="name"
                      value={rule.title}
                      change={(title) =>
                        setContent({
                          ...content,
                          rules: content.rules.map((r, i) =>
                            i === index ? { ...r, title } : r,
                          ),
                        })
                      }
                    />
                    <Field
                      name="description"
                      value={rule.description}
                      change={(description) =>
                        setContent({
                          ...content,
                          rules: content.rules.map((r, i) =>
                            i === index ? { ...r, description } : r,
                          ),
                        })
                      }
                      multiline
                    />
                  </div>
                ))
              )}
            </div>
          </div>
          <details>
            <summary>{t("admin.published")}</summary>
            {row.published ? (
              <ContentView content={row.published} />
            ) : (
              <p>{t("admin.notPublished")}</p>
            )}
          </details>
          <Field
            name="reason"
            value={reason}
            change={setReason}
            required
            error={reasonError}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || language === "ko"}
              onClick={() => withReason(save, "draftSaved")}
            >
              {t("admin.saveDraft")}
            </Button>
            <Button
              disabled={
                busy ||
                language === "ko" ||
                JSON.stringify(content) !== JSON.stringify(row.draft)
              }
              onClick={() =>
                withReason(async () => {
                  await request("localized-contents/publish", "POST", {
                    ...entry(),
                    reason,
                  });
                  await refresh();
                }, "published")
              }
            >
              {t("admin.publish")}
            </Button>
            {language !== "ko" && row.published && (
              <ConfirmAction
                label={t("admin.unpublish")}
                impact={t("admin.confirmImpact.unpublish")}
                target={language}
                reason={reason}
                busy={busy}
                run={() =>
                  void act(async () => {
                    await request("localized-contents/unpublish", "POST", {
                      resourceType: type,
                      resourceKey: id,
                      locale: language,
                      version: row.version,
                      reason,
                    });
                    await refresh();
                  }, "unpublished")
                }
              />
            )}
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void act(download, "exported")}
            >
              {t("admin.export")}
            </Button>
          </div>
          {language === "ko" && <p>{t("admin.editOriginal")}</p>}
          <details className="space-y-3">
            <summary>{t("admin.import")}</summary>
            <label className="mt-3 block">
              {t("admin.jsonFile")}
              <Input
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    void act(async () => {
                      if (file.size > 65536)
                        throw new Error(t("admin.jsonTooLarge"));
                      setJson(await file.text());
                      setPreview(null);
                    });
                }}
              />
            </label>
            <label className="block">
              {t("admin.jsonInput")}
              <Textarea
                rows={8}
                value={json}
                onChange={(e) => {
                  setJson(e.target.value);
                  setPreview(null);
                }}
              />
            </label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={busy || !json}
                onClick={() =>
                  withReason(async () => {
                    setPreview(
                      await request(
                        "localized-contents/import-preview",
                        "POST",
                        parsedImport(),
                      ),
                    );
                    setPreviewText(json);
                  })
                }
              >
                {t("admin.preview")}
              </Button>
              <Button
                disabled={busy || !preview || previewText !== json}
                onClick={() =>
                  withReason(async () => {
                    await request(
                      "localized-contents/import",
                      "POST",
                      parsedImport(),
                    );
                    setPreview(null);
                    await refresh();
                  })
                }
              >
                {t("admin.import")}
              </Button>
            </div>
            {!!preview && (
              <div className="overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th>{t("admin.name")}</th>
                      <th>{t("admin.before")}</th>
                      <th>{t("admin.after")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      (
                        preview as {
                          entries: {
                            resourceKey: string;
                            before: Content | null;
                            after: Content;
                          }[];
                        }
                      ).entries ?? []
                    ).flatMap((entry, index) =>
                      Object.keys(entry.after)
                        .filter(
                          (k) =>
                            JSON.stringify(
                              entry.before?.[k as keyof Content],
                            ) !==
                            JSON.stringify(entry.after[k as keyof Content]),
                        )
                        .map((k) => (
                          <tr key={`${index}/${k}`}>
                            <td className="p-2">
                              {entry.resourceKey}: {k}
                            </td>
                            <td className="max-w-64 whitespace-pre-wrap break-words p-2">
                              {JSON.stringify(
                                entry.before?.[k as keyof Content] ?? null,
                              )}
                            </td>
                            <td className="max-w-64 whitespace-pre-wrap break-words p-2">
                              {JSON.stringify(entry.after[k as keyof Content])}
                            </td>
                          </tr>
                        )),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </details>
        </>
      )}
    </section>
  );
}
function ContentView({ content }: { content: Content }) {
  return (
    <div className="space-y-2 whitespace-pre-wrap break-words rounded bg-muted p-3 text-sm">
      {content.resourceType === "partner" ? (
        <>
          <p className="font-medium">{content.name}</p>
          <p>{content.description}</p>
          <p>{content.ipNames?.join(" · ")}</p>
          <p>{content.marketDescription}</p>
          <p>{content.imageAlt}</p>
        </>
      ) : (
        content.rules.map((rule) => (
          <div key={rule.ruleId}>
            <p className="font-medium">{rule.title}</p>
            <p>{rule.description}</p>
          </div>
        ))
      )}
    </div>
  );
}
