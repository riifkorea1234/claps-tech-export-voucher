"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/provider";
import { workspaceRequest } from "@/lib/api/workspace";
import { useRemote, useWorkspaceMutation, WorkspaceError } from "./workspace-data";
import { Button } from "@/components/ui/button";
type Guide = { id: string; version: number; status: string; rules: { rules: { ruleId: string; title: string; description: string }[] } | null };
export function EvidenceSamplePanel({ projectId, sessionId, step, reload }: { projectId?: string | null; sessionId?: string; step?: number; reload?: () => void }) {
  const enabled = useRemote<{ enabled: boolean }>("/api/evidence-sample");
  return enabled.data?.enabled ? <SampleControls projectId={projectId} sessionId={sessionId} step={step} reload={reload} /> : null;
}
function SampleControls({ projectId, sessionId, step, reload }: { projectId?: string | null; sessionId?: string; step?: number; reload?: () => void }) {
  const guides = useRemote<Guide[] | { enabled: boolean }>(projectId ? `/api/evidence-sample?project=${projectId}` : "/api/evidence-sample");
  const guideItems = Array.isArray(guides.data) ? guides.data : [];
  const { locale } = useLanguage(), ja = locale.startsWith("ja");
  const [prompt, setPrompt] = useState("SAMPLE: mascot campaign, mint palette"), [job, setJob] = useState<{ id: string; status: string }>();
  const m = useWorkspaceMutation(() => { guides.reload(); reload?.(); });
  useEffect(() => {
    if (!job || ["failed", "succeeded", "canceled"].includes(job.status)) return;
    const timer = setInterval(() => { void workspaceRequest<{ id: string; status: string }>(`/api/jobs/${job.id}`).then(j => { setJob(j); if (["failed", "succeeded", "canceled"].includes(j.status)) { guides.reload(); reload?.(); } }); }, 1000);
    return () => clearInterval(timer);
  }, [job, guides, reload]);
  const active = guideItems.find(g => g.status === "published"), latest = guideItems[0];
  const busy = m.pending || !!job && ["queued", "running"].includes(job.status);
  async function run(action: string, values: object) { const j = await workspaceRequest<{ id: string; status: string }>("/api/evidence-sample", "POST", { action, ...values }); if (j.id) setJob(j); }
  return <section className="space-y-3 rounded-xl border border-amber-500 bg-amber-50 p-4 text-slate-900" data-testid="evidence-sample-panel">
    <h2 className="font-semibold">{ja ? "証憑用サンプル実行" : "Evidence sample execution"}</h2>
    <p className="text-sm">{ja ? "合成データです。実際のAI評価・Web検索ではありません。" : "Synthetic fixtures. No AI model assessment or live web search."}</p>
    <WorkspaceError error={m.error} />
    {projectId && !sessionId && <>
      <label className="block text-sm">{ja ? "サンプルガイドPDFをアップロード" : "Upload sample guide PDF"}<input type="file" accept="application/pdf" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) void m.run(async () => { const response = await fetch(`/api/evidence-sample?project=${projectId}`, { method: "POST", headers: { "Content-Type": "application/pdf" }, body: f }); if (!response.ok) throw Error("Upload failed"); }); }} /></label>
      {guideItems.map(g => <div key={g.id} className="space-y-2 rounded border bg-white p-3"><p>v{g.version} · {g.status}</p><ul>{g.rules?.rules.map(r => <li key={r.ruleId}><strong>{r.title}</strong> — {r.description}</li>)}</ul><div className="flex flex-wrap gap-2"><Button disabled={busy || g.status === "published"} onClick={() => m.run(() => run("extract", { guideId: g.id, outputLocale: ja ? "ja" : "en", idempotencyKey: crypto.randomUUID() }))}>{ja ? "サンプル規則抽出" : "Extract sample rules"}</Button><Button disabled={busy || !["draft", "published"].includes(g.status)} onClick={() => m.run(() => run("publish", { guideId: g.id }))}>{ja ? "公開して有効化" : "Publish and activate"}</Button></div></div>)}
    </>}
    {sessionId && step === 1 && <><textarea aria-label="Sample prompt" className="w-full rounded border bg-white p-2" value={prompt} onChange={e => setPrompt(e.target.value)} /><Button disabled={busy || !prompt.trim()} onClick={() => m.run(() => run("generate", { sessionId, prompt, ...(active ? { guideId: active.id } : {}), outputLocale: ja ? "ja" : "en", idempotencyKey: crypto.randomUUID() }))}>{ja ? "サンプル画像を生成" : "Generate sample images"}</Button></>}
    {sessionId && step === 2 && <Button disabled={busy || !active} onClick={() => m.run(async () => { const assets = await workspaceRequest<{ id: string; adopted: boolean; finalizedAt: string | null }[]>(`/api/asset-sessions/${sessionId}/assets`); const data = await workspaceRequest<{ jobId: string }>(`/api/asset-sessions/${sessionId}/verifications`, "POST", { assetIds: assets.filter(a => a.adopted && !a.finalizedAt).map(a => a.id).slice(0, 10), guideId: active!.id, outputLocale: ja ? "ja" : "en", idempotencyKey: crypto.randomUUID() }); setJob({ id: data.jobId, status: "queued" }); })}>{ja ? "サンプル検証を実行" : "Run sample verification"}</Button>}
    {sessionId && !active && <p className="text-sm">{ja ? "プロジェクトでガイドを公開してください。" : "Publish a guide from the project to verify assets."} {latest?.status}</p>}
    {job && <div role="status" className="flex flex-wrap items-center gap-3 text-sm"><a className="underline" href={`/jobs/${job.id}`}>{job.status} · {job.id}</a>{["queued", "running"].includes(job.status) && <Button onClick={() => m.run(async () => { setJob(await workspaceRequest(`/api/jobs/${job.id}/cancel`, "POST", {})); })}>{ja ? "取消" : "Cancel"}</Button>}{job.status === "failed" && <Button onClick={() => m.run(() => run("retry", { jobId: job.id }))}>{ja ? "再試行" : "Retry"}</Button>}</div>}
  </section>;
}
