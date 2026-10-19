import { z } from "zod";
import { idSchema } from "./common";
export const feedbackReasons = ["different_subject", "licensed_use", "own_content", "other"] as const;
export const feedbackReportSchema = z.strictObject({ reason: z.enum(feedbackReasons), idempotencyKey: idSchema });
export const feedbackWithdrawSchema = z.strictObject({ idempotencyKey: idSchema });
// Canonical decimal indices only; reject alternate encodings and composite IDs.
export const resultIndexSchema = z.string().regex(/^(?:[0-9]|[1-4][0-9])$/).transform(Number);
export type FeedbackState = { resultId: string; reported: boolean; reason: typeof feedbackReasons[number] | null; sequence: number; eventId: string | null; createdAt: string | null };
export const emptyFeedback = (resultId: string): FeedbackState => ({ resultId, reported: false, reason: null, sequence: 0, eventId: null, createdAt: null });
