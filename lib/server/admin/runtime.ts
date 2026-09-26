import "server-only";
import { authService } from "../auth/service";
import { jobService } from "../jobs/runtime";
import { AdminAccess } from "./access";
import { AdminService } from "./service";
import { ContentService } from "../localized-contents/service";
export function adminServices(requestId?: string) {
    const access = new AdminAccess(authService(), requestId);
    return { access, admin: new AdminService(access, jobService()), content: new ContentService(access) };
}
