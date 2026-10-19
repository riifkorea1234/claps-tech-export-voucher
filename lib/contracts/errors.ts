import ko from "../../messages/ko/errors.json";
import en from "../../messages/en/errors.json";
import ja from "../../messages/ja/errors.json";
export type ErrorLocale = keyof typeof errorMessages;
export type ErrorCode = Exclude<keyof typeof ko, "INVALID_FIELD">;
export const errorMessages = { ko, en, ja };
export const errorLocales = Object.keys(errorMessages) as ErrorLocale[];
export const errorStatus: Record<ErrorCode, number> = {
  ADMIN_REAUTH_REQUIRED: 403, BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404,
  VERSION_CONFLICT: 409, STATE_CONFLICT: 409, IDEMPOTENCY_CONFLICT: 409,
  VALIDATION_ERROR: 422, RATE_LIMITED: 429, PROVIDER_ERROR: 502, SERVICE_UNAVAILABLE: 503, INTERNAL_ERROR: 500,
};
