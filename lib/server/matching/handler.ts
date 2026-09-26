import "server-only";
import { isDeepStrictEqual } from "node:util";
import { JobFailure, type JobHandler } from "../jobs/types";
import { scoreMatches } from "./engine";
export function matchingHandler(): JobHandler {
  return {
    async run(context) {
      context.signal.throwIfAborted();
      if (context.job.input.kind !== "matching" || !context.job.input.snapshot) throw new JobFailure("INVALID_RESULT");
      const evaluation = scoreMatches(context.job.input.snapshot);
      return { output: { schemaVersion: 1, kind: "matching", partnerIds: evaluation.results.map(r => r.partnerId), evaluation } };
    },
    async apply(_c, job, result) {
      if (job.input.kind !== "matching" || result.output.kind !== "matching" || !result.output.evaluation) throw new JobFailure("INVALID_RESULT");
      if (!isDeepStrictEqual(result.output.evaluation, scoreMatches(job.input.snapshot)) || !isDeepStrictEqual(result.output.partnerIds, result.output.evaluation.results.map(r => r.partnerId))) throw new JobFailure("INVALID_RESULT");
    },
  };
}
