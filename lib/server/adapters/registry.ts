import "server-only";
import { HandlerRegistry } from "../jobs/types";
// Real provider handlers are registered by Phases 7–10. Test adapters are never imported here.
import { exportHandler } from "../exports/handler";
import { matchingHandler } from "../matching/handler";
export const productionHandlers = new HandlerRegistry().register("export", exportHandler()).register("matching", matchingHandler());
