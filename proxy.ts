import { NextResponse, type NextRequest } from "next/server";
import { LANGUAGE_SCOPE_HEADER, languageScope } from "@/lib/i18n/core";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  // Always overwrite the incoming value; only the route determines page scope.
  headers.set(LANGUAGE_SCOPE_HEADER, languageScope(request.nextUrl.pathname));
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
