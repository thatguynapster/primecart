import { NextResponse } from "next/server";

import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import { prisma } from "@/lib/prisma";

/**
 * What the cart needs to know about the shop right now. The storefront layout
 * renders from a five-minute cache; this doesn't, so a merchant switching
 * checkout on or changing a delivery fee reaches the next cart opened. Public
 * facts only. Nested under `[subdomain]` for the same reason as api/products.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;

  // The cached lookup is fine for resolving the shop itself.
  const storefront = await getMerchantBySubdomain(subdomain);
  if (!storefront || !storefront.isActive) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const merchant = await prisma.merchant.findUnique({
    where: { id: storefront.id },
    select: { storefront: true, storefrontPaymentsEnabled: true, deliveryOptions: true },
  });
  if (!merchant) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      paymentsEnabled: merchant.storefrontPaymentsEnabled === true,
      deliveryOptions: merchant.deliveryOptions,
      returnsPolicy: merchant.storefront?.returnsPolicy ?? null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
