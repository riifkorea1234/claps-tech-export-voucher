import { z } from "zod";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const SESSION_COOKIE = "claps-session";
export const emailSchema = z.string().trim().toLowerCase().email().max(320);
export const passwordSchema = z.string().min(8).max(128);
export const profileSchema = z.strictObject({ name: z.string().trim().min(1).max(100), org: z.string().trim().min(1).max(200), role: z.enum(["marketing", "design", "merchandising", "licensing", "management", "other"]).optional() });
export const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
