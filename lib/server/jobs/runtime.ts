import "server-only";
import { authService } from "../auth/service";
import { productionHandlers } from "../adapters/registry";
import { JobService } from "./service";
import { developmentQueuePolicy } from "./policy";
export const jobService = () => new JobService(authService(), productionHandlers, developmentQueuePolicy);
