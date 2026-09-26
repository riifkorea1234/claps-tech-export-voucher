"use client";

import { useEffect, useRef, useState } from "react";
import { Check, FileText, LoaderCircle, Upload, X } from "lucide-react";
import { useLanguage, useT } from "@/lib/i18n/provider";
import { guideAnalysisRules } from "@/lib/mock/guide-analysis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type RuleEdit = { title: string; description: string };
const stages = ["reading", "organizing", "extracting", "finishing"] as const;

// UI prototype only: no PDF content extraction, remote requests, or DB mutations.
export function GuideAnalysisPanel() {
  const t = useT();
  const { locale } = useLanguage();
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const operation = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "running" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, RuleEdit>>({});
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const busy = status === "checking" || status === "running";

  function stop() {
    operation.current++;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  useEffect(() => () => {
    operation.current++;
    if (timer.current) clearInterval(timer.current);
  }, []);

  async function analyze(selected: File) {
    stop();
    const current = operation.current;
    setDragging(false);
    setError(null);
    if (!/\.pdf$/i.test(selected.name) || selected.size === 0) {
      setError("projects.analysis.invalid");
      return;
    }
    if (selected.size > 20 * 1024 * 1024) {
      setError("projects.analysis.tooLarge");
      return;
    }
    setStatus("checking");
    try {
      const header = await selected.slice(0, 5).text();
      if (current !== operation.current) return;
      if (header !== "%PDF-") throw new Error("INVALID_PDF");
    } catch {
      if (current !== operation.current) return;
      setStatus(status === "done" ? "done" : "idle");
      setError("projects.analysis.invalid");
      return;
    }
    setFile(selected);
    setProgress(0);
    setEdits({});
    setEditing(false);
    setStatus("running");
    let next = 0;
    timer.current = setInterval(() => {
      if (current !== operation.current) return;
      next = Math.min(100, next + 5);
      setProgress(next);
      if (next === 100) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        setStatus("done");
      }
    }, 200);
  }

  function reset() {
    stop();
    setStatus("idle");
    setFile(null);
    setProgress(0);
    setEdits({});
    setEditing(false);
    setError(null);
    setDragging(false);
  }

  return <section className="min-w-0 rounded-xl border bg-card p-5" aria-label={t("projects.brand_guide")}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{t("projects.brand_guide")}</h2>
      {status === "done" && <span role="status" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"><Check className="size-3.5" aria-hidden />{t("projects.analysis.complete")}</span>}
    </div>
    <input ref={input} type="file" accept=".pdf,application/pdf" aria-label={t("projects.choose_file")} className="sr-only" disabled={busy} onChange={e => {
      const selected = e.target.files?.[0];
      e.target.value = "";
      if (selected) void analyze(selected);
    }} />

    {!file && !busy && <div className={`mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed px-5 py-8 text-center transition-colors ${dragging ? "border-brand bg-brand/5" : "bg-muted/30"}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false); }}
      onDrop={e => { e.preventDefault(); setDragging(false); const selected = e.dataTransfer.files[0]; if (selected) void analyze(selected); }}>
      <span className="rounded-xl border bg-background p-3"><Upload className="size-5 text-muted-foreground" aria-hidden /></span>
      <div><p className="text-sm font-medium">{t("projects.analysis.upload")}</p><p className="mt-1 text-xs text-muted-foreground">{t("projects.analysis.help")}</p></div>
      <Button variant="outline" onClick={() => input.current?.click()}>{t("projects.choose_file")}</Button>
    </div>}

    {file && <div className="mt-4 flex items-center gap-3 rounded-lg bg-muted/40 p-3">
      <FileText className="size-5 shrink-0 text-brand" aria-hidden />
      <div className="min-w-0 flex-1"><p className="break-all text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">PDF · {(file.size / 1024 / 1024).toFixed(2)} MB</p></div>
      <Button variant="ghost" size="icon" aria-label={t("projects.remove_brand_guide")} onClick={reset}><X className="size-4" aria-hidden /></Button>
    </div>}
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{t(error)}</p>}

    {busy && <div className="mt-5 space-y-4">
      <div role="status" className="flex items-center gap-2 text-sm font-medium"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none text-brand" aria-hidden />{t(`projects.analysis.${status === "checking" ? "checking" : stages[Math.min(3, Math.floor(progress / 25))]}`)}</div>
      <div role="progressbar" aria-label={t("projects.analysis.progress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={status === "checking" ? 0 : progress} className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-brand transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${status === "checking" ? 0 : progress}%` }} /></div>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">{stages.map((stage, index) => <li key={stage} className={`flex items-center gap-1.5 text-xs ${status === "running" && progress >= index * 25 ? "text-foreground" : "text-muted-foreground"}`}><span className="flex size-5 shrink-0 items-center justify-center rounded-full border">{status === "running" && progress >= (index + 1) * 25 ? <Check className="size-3" aria-hidden /> : index + 1}</span>{t(`projects.analysis.stage.${stage}`)}</li>)}</ol>
      <Button variant="ghost" size="sm" onClick={() => { stop(); setStatus("idle"); setProgress(0); }}>{t("projects.cancel")}</Button>
    </div>}

    {status === "done" && <div className="mt-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{t("projects.analysis.rules", { count: guideAnalysisRules.length })}</h3><Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>{t(editing ? "projects.analysis.finishEditing" : "projects.analysis.edit")}</Button></div>
      <div className="grid gap-3 md:grid-cols-2">{guideAnalysisRules.map((rule, index) => {
        const [title, description] = locale === "ko" ? rule.ko : rule.en;
        const value = edits[rule.id] ?? { title, description };
        return <article key={rule.id} className="flex gap-3 rounded-lg border p-4"><span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">{index + 1}</span><div className="min-w-0 flex-1">{editing ? <div className="space-y-2"><Input aria-label={t("projects.analysis.ruleTitle", { number: index + 1 })} value={value.title} maxLength={200} onChange={e => setEdits(previous => ({ ...previous, [rule.id]: { ...value, title: e.target.value } }))} /><Textarea aria-label={t("projects.analysis.ruleDescription", { number: index + 1 })} value={value.description} maxLength={1000} onChange={e => setEdits(previous => ({ ...previous, [rule.id]: { ...value, description: e.target.value } }))} /></div> : <><h4 className="break-words text-sm font-medium">{value.title}</h4><p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">{value.description}</p></>}</div></article>;
      })}</div>
    </div>}
    {file && !busy && <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void analyze(file)}>{t("projects.analysis.retry")}</Button><Button variant="ghost" size="sm" onClick={() => input.current?.click()}>{t("projects.analysis.replace")}</Button></div>}
  </section>;
}
