import type { Merchant } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isLapsed, isLocked } from "@/lib/billing/state";
import { BILLING_SEEN_COOKIE } from "@/lib/billing/seen-cookie";
import { requireMerchant } from "@/lib/merchant/current";

/**
 * The merchant, for every dashboard page except billing (D-24).
 *
 * Lapsed: billing opens first, then the rest for an hour (the proxy sets the
 * cookie when billing is opened). Locked: billing, plus the order list and
 * order pages (`ordersPage`), so orders already placed can still be seen and
 * handled. Shoppers who ordered, some of whom paid, still need their goods,
 * and the order data is the merchant's. Everything else redirects to billing.
 * In the page and not the layout, because layouts don't re-run on navigation
 * between their pages.
 */
export async function requireDashboardMerchant(
  { ordersPage = false }: { ordersPage?: boolean } = {}
): Promise<Merchant> {
  const merchant = await requireMerchant();
  if (!isLapsed(merchant)) return merchant;

  const seen = (await cookies()).has(BILLING_SEEN_COOKIE);
  if (!seen || (isLocked(merchant) && !ordersPage)) redirect("/dashboard/billing");
  return merchant;
}
