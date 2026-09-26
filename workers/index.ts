import { writeFile, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { getEnvironment, ConfigurationError } from "../lib/server/config/env";
import { createDatabase } from "../lib/server/db";
import { AuthService } from "../lib/server/auth/service";
import { productionHandlers } from "../lib/server/adapters/registry";
import { JobService } from "../lib/server/jobs/service";
import { JobQueue } from "../lib/server/jobs/queue";
import { runClaimedJob } from "../lib/server/jobs/runner";
import { developmentQueuePolicy } from "../lib/server/jobs/policy";
import { maintainStorage } from "../lib/server/storage/maintenance";
loadEnvConfig(process.cwd());
async function main() {
  const env = getEnvironment(), { pool } = createDatabase(env.DATABASE_URL, env.DB_POOL_MAX);
  const queue = new JobQueue(new JobService(new AuthService(pool, async () => { throw new Error("WORKER_MAIL_DISABLED"); }, "http://localhost"), productionHandlers, developmentQueuePolicy));
  const workerId = `worker_${randomUUID()}`, controller = new AbortController();
  let wake: (() => void) | undefined;
  const stop = () => { controller.abort(); wake?.(); };
  process.once("SIGTERM", stop); process.once("SIGINT", stop);
  let healthTask: Promise<void> | undefined;
  async function health() {
    try {
      await pool.query("SELECT lease_token FROM jobs LIMIT 1");
      if (controller.signal.aborted) return;
      await writeFile(`${env.WORKER_HEARTBEAT_PATH}.tmp`, String(Date.now()), { mode: 0o600 });
      await rename(`${env.WORKER_HEARTBEAT_PATH}.tmp`, env.WORKER_HEARTBEAT_PATH);
    } catch { await rm(env.WORKER_HEARTBEAT_PATH, { force: true }); console.error(JSON.stringify({ level: "error", event: "worker_database_unavailable" })); }
  }
  const pulse = setInterval(() => { if (!healthTask) healthTask = health().finally(() => { healthTask = undefined; }); }, 5_000);
  let maintenanceAt = 0;
  try {
    await health();
    while (!controller.signal.aborted) {
      try {
        await queue.recoverExpired();
        if (Date.now() >= maintenanceAt) { await maintainStorage(pool); maintenanceAt = Date.now() + 30_000; }
        if (controller.signal.aborted) break;
        const job = await queue.claim(workerId);
        if (job) { await runClaimedJob(queue, job, controller.signal); continue; }
      } catch { console.error(JSON.stringify({ level: "error", event: "worker_iteration_failed" })); }
      if (!controller.signal.aborted) await new Promise<void>(resolve => {
        const timer = setTimeout(resolve, 1_000); wake = () => { clearTimeout(timer); resolve(); };
      });
    }
  } finally {
    clearInterval(pulse); await healthTask;
    await rm(env.WORKER_HEARTBEAT_PATH, { force: true });
    await rm(`${env.WORKER_HEARTBEAT_PATH}.tmp`, { force: true });
    await pool.end(); process.removeListener("SIGTERM", stop); process.removeListener("SIGINT", stop);
  }
}
main().catch(error => { console.error(error instanceof ConfigurationError ? error.message : "Worker startup failed."); process.exitCode = 1; });
