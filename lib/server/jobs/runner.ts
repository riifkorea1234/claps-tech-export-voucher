import "server-only";
import { JobQueue } from "./queue";
import { JobFailure, type JobRow } from "./types";
export async function runClaimedJob(queue: JobQueue, job: JobRow, stop?: AbortSignal) {
  const handler = queue.service.registry.get(job.kind);
  if (!handler) { await queue.fail(job, new JobFailure("UNAVAILABLE")); return; }
  const controller = new AbortController();
  let rejectStop: (error: JobFailure) => void = () => {};
  const interrupted = new Promise<never>((_, reject) => { rejectStop = reject; });
  const abort = (failure: JobFailure) => { controller.abort(); rejectStop(failure); };
  const shutdown = () => abort(new JobFailure("WORKER_LOST", true));
  const timeout = setTimeout(() => abort(new JobFailure("TIMEOUT", true)), Math.max(1, (job.deadline_at?.getTime() ?? Date.now()) - Date.now()));
  let pulse: ReturnType<typeof setTimeout> | undefined;
  let finished = false;
  async function heartbeat() {
    try { if (!await queue.heartbeat(job)) { abort(new JobFailure("WORKER_LOST", true)); return; } }
    catch { abort(new JobFailure("WORKER_LOST", true)); return; }
    if (!finished) pulse = setTimeout(heartbeat, Math.max(25, Math.floor(queue.service.policy.leaseMs / 3)));
  }
  pulse = setTimeout(heartbeat, Math.max(25, Math.floor(queue.service.policy.leaseMs / 3)));
  stop?.addEventListener("abort", shutdown, { once: true });
  if (stop?.aborted) shutdown();
  // Late resolutions still pass through the DB fence, retaining usage but never reviving a terminal job.
  const execution = Promise.resolve().then(async () => {
    if (controller.signal.aborted) throw new JobFailure("WORKER_LOST", true);
    const result = await handler.run({ job, signal: controller.signal, dispatch: (p, id) => queue.dispatch(job, p, id), providerRequest: id => queue.providerRequest(job, id), reserveFile: file => queue.reserveFile(job, file) });
    try { return await queue.complete(job, handler, result, () => !controller.signal.aborted); }
    catch (error) { if (error instanceof Error && /JOB_KIND_MISMATCH|METADATA|ZodError/.test(`${error.name}:${error.message}`)) throw new JobFailure("INVALID_RESULT"); throw error; }
  });
  try { await Promise.race([execution, interrupted]); }
  catch (error) { await queue.fail(job, error); }
  finally { finished = true; clearTimeout(timeout); clearTimeout(pulse); stop?.removeEventListener("abort", shutdown); }
}
