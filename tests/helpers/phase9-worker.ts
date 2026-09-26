// Test entry point for the real, external-service-free matching handler.
import { getTestDatabaseUrl } from "../../lib/server/config/env";
import { getDatabase } from "../../lib/server/db";
import { jobService } from "../../lib/server/jobs/runtime";
import { JobQueue } from "../../lib/server/jobs/queue";
import { runClaimedJob } from "../../lib/server/jobs/runner";
async function main() {
  getTestDatabaseUrl({ TEST_DATABASE_URL: process.env.DATABASE_URL });
  const queue = new JobQueue(jobService());
  try {
    const job = await queue.claim("phase9-browser-worker");
    if (!job || job.kind !== "matching") throw new Error("EXPECTED_MATCHING_JOB");
    await runClaimedJob(queue, job);
  } finally { await getDatabase().pool.end(); }
}
main().catch(() => { console.error("Matching worker test failed"); process.exitCode = 1; });
