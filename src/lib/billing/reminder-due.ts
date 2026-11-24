/** Which billing reminder is due now. Pure: see plans.ts for why. */
import { GRACE_DAYS, daysLeft, type EffectiveStatus } from "./status.ts";

export type BillingReminderKind =
  | "trial-3"
  | "trial-1"
  | "renew-7"
  | "renew-1"
  | "expired"
  | "closing-1";

/** `date` is what the reminder is about; for both lapsed kinds, the lapse. */
export function reminderFor(
  status: EffectiveStatus,
  endsAt: Date | null,
  lapsedAt: Date | null,
  now: Date
): { kind: BillingReminderKind; date: Date } | null {
  if (status === "TRIAL" && endsAt) {
    const d = daysLeft(endsAt, now);
    if (d <= 1) return { kind: "trial-1", date: endsAt };
    if (d <= 3) return { kind: "trial-3", date: endsAt };
  }
  if (status === "ACTIVE" && endsAt) {
    const d = daysLeft(endsAt, now);
    if (d <= 1) return { kind: "renew-1", date: endsAt };
    if (d <= 7) return { kind: "renew-7", date: endsAt };
  }
  if (status === "LAPSED" && lapsedAt) {
    const d = daysLeft(new Date(lapsedAt.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000), now);
    if (d === 1) return { kind: "closing-1", date: lapsedAt };
    if (d > 1) return { kind: "expired", date: lapsedAt };
  }
  return null;
}
