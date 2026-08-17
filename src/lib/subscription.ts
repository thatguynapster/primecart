import { prisma } from "@/lib/prisma";
import { invalidateSubscription } from "@/lib/merchant/lookup";
import { setStorefrontActive } from "@/lib/merchant/storefront";

/**
 * Subscription state transitions (Phase 13).
 *
 * The proxy's dashboard guard and the storefront's own active/inactive check
 * both read through the caches in src/lib/merchant/lookup.ts — every mutation
 * here must invalidate both, or a merchant could keep dashboard access, or a
 * shopper could keep buying from a deactivated shop, for up to five minutes.
 *
 * A merchant without a completed storefront cannot reach here in practice
 * (there is nothing to subscribe to until onboarding is done), but the
 * storefront-touching half of each function is skipped defensively rather
 * than assumed.
 */

type MerchantRef = {
  id: string;
  storefront: { subdomain: string } | null;
};

/**
 * A subscription payment was confirmed — either the webhook's
 * `subscription.create` (task 13.8, first-ever charge against a plan) or a
 * plan-linked `charge.success` (every renewal after that, since Paystack
 * fires `subscription.create` exactly once per subscription object and never
 * again — verified live: a second real payment against an already-existing
 * subscription produced only `charge.success`). A lapsed merchant
 * resubscribing also lands here, so the storefront is switched back on too.
 *
 * `subscriptionCode` is optional: a renewal `charge.success` has no code of
 * its own to report, and must not overwrite the one already stored from the
 * original `subscription.create`.
 */
export async function activateSubscription(
  merchant: MerchantRef,
  subscriptionCode?: string
): Promise<void> {
  await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      subscriptionStatus: "ACTIVE",
      ...(subscriptionCode ? { paystackSubscriptionCode: subscriptionCode } : {}),
    },
  });
  invalidateSubscription(merchant.id);

  if (merchant.storefront) {
    await setStorefrontActive(merchant.id, merchant.storefront.subdomain, true);
  }
}

/**
 * A subscription lapsed — trial ran out unpaid (13.7), a renewal charge
 * failed (13.9), or Paystack disabled the subscription outright (13.10).
 * Same effect in every case: lock the dashboard, take the storefront down.
 */
export async function expireSubscription(merchant: MerchantRef): Promise<void> {
  await prisma.merchant.update({
    where: { id: merchant.id },
    data: { subscriptionStatus: "EXPIRED" },
  });
  invalidateSubscription(merchant.id);

  if (merchant.storefront) {
    await setStorefrontActive(merchant.id, merchant.storefront.subdomain, false);
  }
}

/**
 * Finds merchants whose 30-day trial has lapsed with no subscription started,
 * and expires them (13.2 + 13.7).
 *
 * Claims each merchant via a conditional `updateMany` before acting on it —
 * the same race-safe pattern as `expireAbandonedOrders` — so a merchant who
 * subscribes in the same instant the cron runs cannot have the cron's write
 * land after the webhook's and undo it.
 */
export async function expireLapsedTrials(): Promise<{ expired: number }> {
  // Deliberately not scoped by merchantId — a system job over every tenant,
  // the one documented exception to "every query filters on merchantId first"
  // (same exception `expireAbandonedOrders` already makes).
  const candidates = await prisma.merchant.findMany({
    where: { subscriptionStatus: "TRIAL", trialExpiresAt: { lt: new Date() } },
    select: { id: true, storefront: { select: { subdomain: true } } },
  });

  let expired = 0;
  for (const candidate of candidates) {
    const claimed = await prisma.merchant.updateMany({
      where: { id: candidate.id, subscriptionStatus: "TRIAL" },
      data: { subscriptionStatus: "EXPIRED" },
    });
    if (claimed.count === 0) continue; // lost a race to a webhook — leave it alone

    invalidateSubscription(candidate.id);
    if (candidate.storefront) {
      await setStorefrontActive(candidate.id, candidate.storefront.subdomain, false);
    }
    expired += 1;
  }

  return { expired };
}
