import "server-only";
import { HandlerRegistry } from "../jobs/types";
// Real provider handlers are registered by Phases 7–10. Test adapters are never imported here.
import { exportHandler } from "../exports/handler";
import { matchingHandler } from "../matching/handler";
import { registerEvidenceHandlers } from "../evidence-sample/handlers";
export const productionHandlers = new HandlerRegistry().register("export", exportHandler()).register("matching", matchingHandler());
// Explicit opt-in plus per-owner authorization; there is no normal-user AI fallback.
if (process.env.EVIDENCE_SAMPLE_MODE === "claps-evidence-v1") registerEvidenceHandlers(productionHandlers);
