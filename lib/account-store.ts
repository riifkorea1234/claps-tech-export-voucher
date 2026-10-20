import { DEFAULT_LOCALE, matchLocale } from "./i18n/core";
import { errorMessages, errorLocales, type ErrorLocale } from "./contracts/errors";
// Account data comes only from the authenticated server session.
export type { Account } from "./contracts/account";
import { accountSchema, type Account } from "./contracts/account";
export const ROLES = ["marketing", "design", "merchandising", "licensing", "management", "other"];
class AccountRequestError extends Error {}
export async function accountRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const locale = document.documentElement.lang || DEFAULT_LOCALE;
  const fallback = (matchLocale(locale, errorLocales) ?? DEFAULT_LOCALE) as ErrorLocale;
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
export const getAccount = () => accountRequest<Account>("/api/me").then(data => accountSchema.parse(data));
export const upsertAccount = (a: { name: string; org: string; role?: string; locale?: string; familyName?: string | null; givenName?: string | null; familyNameKana?: string | null; givenNameKana?: string | null }) => accountRequest<Account>("/api/me", "PATCH", a).then(data => accountSchema.parse(data));
export const deleteAccount = () => accountRequest("/api/me", "DELETE", {});
export const clearCurrent = () => accountRequest("/api/auth/sign-out", "POST", {});
