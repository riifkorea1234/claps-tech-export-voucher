import { readFile } from "node:fs/promises";
try {
  const timestamp = Number(await readFile(process.env.WORKER_HEARTBEAT_PATH || "/tmp/claps-worker-heartbeat", "utf8"));
  const age = Date.now() - timestamp;
  if (!Number.isFinite(timestamp) || age < 0 || age > 20_000) process.exitCode = 1;
} catch { process.exitCode = 1; }
