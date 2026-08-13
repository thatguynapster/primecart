/**
 * PLACEHOLDER — replaced in Phase 13 (Subscription Billing).
 *
 * Where the proxy sends a merchant whose `subscriptionStatus` is EXPIRED.
 *
 * Sign-in is required: this is a specific merchant's billing page, and an
 * anonymous visitor has no subscription to reactivate. Visiting it signed-out
 * therefore redirects to Clerk, which is correct.
 *
 * What it must *not* be is a dashboard route — the subscription guard redirects
 * EXPIRED merchants here, so if this path were itself guarded the redirect
 * would loop and the merchant could never pay.
 *
 * OPEN: D-14 in docs/TASKS.md — whether to split this into a public "your trial
 * has ended" explainer plus a protected payment page. Deferred to Phase 13.
 */
export default function BillingPlaceholder() {
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="mb-2 text-lg font-semibold">Subscription required</h1>
      <p className="text-sm text-neutral-500">
        Your trial has ended. Phase 13 puts the payment flow here.
      </p>
    </main>
  );
}
