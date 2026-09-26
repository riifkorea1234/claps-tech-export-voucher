import "server-only";
import { cookies } from "next/headers";
import { authService } from "./service";
import { SESSION_COOKIE } from "./policy";
export async function currentUser() { return authService().session((await cookies()).get(SESSION_COOKIE)?.value); }
