import "server-only";

const sensitive = /password|secret|token|authorization|cookie|email|name|address|database|connection|input|output|body|query|sql|stack|message|value|file|prompt|content/i;
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[REDACTED]";
  if (value instanceof Error) return "[REDACTED_ERROR]";
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => redact(item, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sensitive.test(key) ? "[REDACTED]" : redact(item, depth + 1)]));
  // Free text can hide credentials/PII even under an innocuous key.
  if (typeof value === "string") return "[REDACTED]";
  return typeof value === "number" || typeof value === "boolean" || value === null ? value : "[REDACTED]";
}
export function logRequestFailure(requestId: string, code: string, status: number) {
  // Only generated IDs and server-owned codes reach the log. No URL, body, raw error or headers.
  console.error(JSON.stringify({ level: "error", event: "request_failed", requestId, code, status }));
}
