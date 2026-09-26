// Executed only by the fault-injection integration suite, never loaded by the production worker.
import { createDatabase } from "../../lib/server/db";
import { getTestDatabaseUrl } from "../../lib/server/config/env";
import { AuthService } from "../../lib/server/auth/service";
import { JobService } from "../../lib/server/jobs/service";
import { JobQueue } from "../../lib/server/jobs/queue";
import { HandlerRegistry } from "../../lib/server/jobs/types";
import { developmentQueuePolicy } from "../../lib/server/jobs/policy";
import { runClaimedJob } from "../../lib/server/jobs/runner";
async function main() {
const { pool } = createDatabase(getTestDatabaseUrl(), 3);
const registry = new HandlerRegistry().register("matching", { run: async context => {
  if (process.argv[2] === "after-dispatch") await context.dispatch("synthetic", "fixture-request");
  process.send?.({ ready: true, id: context.job.id });
  await new Promise<void>(resolve => context.signal.addEventListener("abort", () => resolve(), { once: true }));
  return { output: { schemaVersion: 1, kind: "matching", partnerIds: [] } };
} });
const queue = new JobQueue(new JobService(new AuthService(pool, async () => {}, "http://localhost"), registry, developmentQueuePolicy));
const stop = new AbortController(); process.once("SIGTERM", () => stop.abort());
try {
  const job = await queue.claim(`test_${process.pid}`);
  if (!job) throw new Error("NO_FIXTURE_JOB");
  await runClaimedJob(queue, job, stop.signal);
} finally { await pool.end(); }

}
main().catch(() => { console.error("Synthetic worker failed"); process.exitCode = 1; });
