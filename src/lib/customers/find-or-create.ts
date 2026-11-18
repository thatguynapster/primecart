import type { Customer } from "@prisma/client";

import { normalizeGhanaPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

/**
 * Customer matching for order creation.
 *
 * The handover: "Auto-created from orders (storefront and manual). No
 * standalone customer creation flow." This is that auto-creation — called
 * from both the storefront checkout (Phase 9) and manual order entry
 * (Phase 10), so an order's customer history is consistent regardless of
 * which channel it came from.
 *
 * Customer is a plain top-level model, not an embedded type, so this is
 * ordinary Prisma Client — no $runCommandRaw involved.
 */

export type CustomerInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
};

/**
 * Matched on phone first, then email. Ghanaian retail customers reliably give
 * a phone number — it's how the merchant already reaches them on WhatsApp —
 * while email is often skipped or improvised on a manual, walk-in sale.
 *
 * A customer supplying neither cannot be matched and gets a new record each
 * time. The schema has no unique constraint here, and the handover does not
 * ask for one; this is a best-effort match, not deduplication.
 */
export async function findOrCreateCustomer(
  merchantId: string,
  input: CustomerInput
): Promise<Customer> {
  const phone = input.phone?.trim() || null;
  const email = input.email?.trim().toLowerCase() || null;
  const name = input.name.trim();

  if (phone) {
    // D-18e: storefront numbers are now stored as +233XXXXXXXXX, while older
    // records (and manual orders) hold whatever was typed — usually
    // 0XXXXXXXXX. Match either spelling of the same number so a returning
    // buyer doesn't become a second customer.
    const normalised = normalizeGhanaPhone(phone);
    const spellings = normalised
      ? [...new Set([phone, normalised, `0${normalised.slice(4)}`])]
      : [phone];
    const byPhone = await prisma.customer.findFirst({
      where: { merchantId, phone: { in: spellings } },
    });
    if (byPhone) return byPhone;
  }

  if (email) {
    const byEmail = await prisma.customer.findFirst({
      where: { merchantId, email },
    });
    if (byEmail) return byEmail;
  }

  return prisma.customer.create({
    data: { merchantId, name, email, phone },
  });
}
