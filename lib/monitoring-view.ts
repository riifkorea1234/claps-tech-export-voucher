// Presentation only: grade and stored factors retain their original precision.
export function formatMonitoringPercent(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value) + "%";
}
export type FeedbackAttempt = { action: "POST" | "DELETE"; reason: string; baseSequence: number; key: string };
export function feedbackAttempt(previous: FeedbackAttempt | null, action: FeedbackAttempt["action"], reason: string, baseSequence: number, newKey: () => string): FeedbackAttempt {
  return previous?.action === action && previous.reason === reason && previous.baseSequence === baseSequence
    ? previous : { action, reason, baseSequence, key: newKey() };
}
