import ko from "../../messages/ko/errors.json";
import en from "../../messages/en/errors.json";
export type ErrorLocale = "ko" | "en";
export type ErrorCode = Exclude<keyof typeof ko, "INVALID_FIELD">;
export const errorMessages = { ko, en };
export const errorStatus: Record<ErrorCode, number> = {
  ADMIN_REAUTH_REQUIRED: 403, BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404,
  VERSION_CONFLICT: 409, STATE_CONFLICT: 409, IDEMPOTENCY_CONFLICT: 409,
  VALIDATION_ERROR: 422, RATE_LIMITED: 429, PROVIDER_ERROR: 502, SERVICE_UNAVAILABLE: 503, INTERNAL_ERROR: 500,
};
