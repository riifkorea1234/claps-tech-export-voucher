import { z } from "zod";
export function strictEvidenceQuery(params: URLSearchParams) {
  const result: Record<string, string> = {};
  for (const [key, value] of params) {
    if (Object.hasOwn(result, key)) throw new z.ZodError([{ code: "custom", path: [], message: "Duplicate query key" }]);
    Object.defineProperty(result, key, { value, enumerable: true });
  }
  return result;
}
