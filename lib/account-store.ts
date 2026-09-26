import { matchLocale } from "./i18n/core";
import { errorMessages } from "./contracts/errors";
// Account data comes only from the authenticated server session.
export type Account = { id: string; email: string; name: string; org: string; role?: string; status: string; locale?: string };
export const ROLES = ["marketing", "design", "merchandising", "licensing", "management", "other"];
class AccountRequestError extends Error {}
export async function accountRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const locale = document.documentElement.lang || "ko";
  const fallback = matchLocale(locale, ["ko", "en"]) === "en" ? "en" : "ko";
  try {
    const response = await fetch(path, { method, cache: "no-store", headers: { "Content-Type": "application/json", "X-Claps-Locale": locale }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const result = await response.json();
    if (!response.ok) throw new AccountRequestError(result.error?.message ?? errorMessages[fallback].SERVICE_UNAVAILABLE);
    return result.data as T;
  } catch (error) {
    if (error instanceof AccountRequestError) throw error;
    throw new AccountRequestError(errorMessages[fallback].SERVICE_UNAVAILABLE);
  }
}
// Authentication changes replace the document to discard the previous user's RSC cache
// and language context. Ordinary navigation and language switching remain client-side.
export function navigateAfterAuth(path: string) {
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin) throw new Error("Invalid authentication destination");
  window.location.replace(url.href);
}
export const getAccount = () => accountRequest<Account>("/api/me");
export const upsertAccount = (a: { name: string; org: string; role?: string }) => accountRequest<Account>("/api/me", "PATCH", a);
export const deleteAccount = () => accountRequest("/api/me", "DELETE", {});
export const clearCurrent = () => accountRequest("/api/auth/sign-out", "POST", {});
