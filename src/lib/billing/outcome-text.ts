import type { ApplyOutcome } from "@/lib/billing/subscription";

/** Merchant-facing wording for each verify-and-apply outcome. Shared by server and client. */
export const OUTCOME_TEXT: Record<ApplyOutcome, string> = {
  applied: "Payment confirmed. Thank you!",
  already: "This payment is already recorded.",
  pending: "Paystack hasn't confirmed this payment yet. If you paid, try again in a minute.",
  failed: "Paystack says this payment failed. Nothing was added.",
  review: "We received this payment but need to check it. We'll be in touch. You haven't lost anything.",
  unknown: "We couldn't find this payment.",
};
