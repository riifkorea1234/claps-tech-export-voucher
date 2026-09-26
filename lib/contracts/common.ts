import { z } from "zod";

export const MAX_METADATA_BYTES = 64 * 1024;
export const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
export const localeCodeSchema = z.string().min(2).max(35).refine((value) => {
  try { return Intl.getCanonicalLocales(value)[0] === value; } catch { return false; }
});
export const paginationSchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});
export const versionSchema = z.number().int().positive().max(2_147_483_647);
export type Pagination = { page: number; pageSize: number; total: number; totalPages: number };
export type ApiResponse<T> = { data: T; pagination?: Pagination };
export type ApiErrorBody = { error: { code: string; message: string; fieldErrors?: Record<string, string[]>; requestId: string } };
export function paginate(page: number, pageSize: number, total: number): Pagination {
  paginationSchema.parse({ page, pageSize });
  z.number().int().nonnegative().safe().parse(total);
  return { page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}
