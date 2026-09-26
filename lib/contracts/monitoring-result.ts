import { z } from "zod";
// URLs are links only. No remote fetch/thumbnail proxy is implemented here.
export function normalizeMonitoringUrl(value: string): string {
  const u = new URL(value);
  const h = u.hostname.toLowerCase();
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443") || !h.includes(".") || /^[\d.]+$/.test(h) || h.includes(":") || /(^|\.)(localhost|local|internal|test|invalid|example)$/.test(h) || h.endsWith(".")) throw new Error("UNSAFE_URL");
  u.hash = "";
  return u.href;
}
const safeUrl = z.string().max(2000).transform((v, ctx) => { try { return normalizeMonitoringUrl(v); } catch { ctx.addIssue({ code: "custom", message: "Unsafe URL" }); return z.NEVER; } });
export const monitoringResultSchema = z.strictObject({
  state: z.enum(["results", "empty", "partial"]),
  sources: z.array(z.strictObject({ name: z.string().min(1).max(100), status: z.enum(["succeeded", "failed"]) })).min(1).max(10),
  items: z.array(z.strictObject({ url: safeUrl, source: z.string().min(1).max(100), similarity: z.number().min(0).max(100).nullable(), discoveredAt: z.iso.datetime() })).max(50),
}).superRefine((r, ctx) => {
  const names = new Set(r.sources.map(s => s.name));
  const ok = r.sources.filter(s => s.status === "succeeded");
  const bad = r.sources.length - ok.length;
  if (names.size !== r.sources.length || !ok.length || (r.state === "partial") !== (bad > 0) || (r.state === "results" && !r.items.length) || (r.state === "empty" && r.items.length) || new Set(r.items.map(i => i.url)).size !== r.items.length || r.items.some(i => !ok.some(s => s.name === i.source))) ctx.addIssue({ code: "custom", message: "Inconsistent monitoring result" });
});
export type MonitoringResult = z.infer<typeof monitoringResultSchema>;
