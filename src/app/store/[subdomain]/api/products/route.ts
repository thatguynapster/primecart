import { NextResponse } from "next/server";

import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import {
  listStorefrontProducts,
  sellableVariants,
} from "@/lib/storefront/catalogue";

/**
 * Public catalogue endpoint — `<shop>.primecart.app/api/products`.
 *
 * An API Route rather than a Server Action, per the handover: it must be
 * callable by an anonymous shopper's browser.
 *
 * It lives *inside* the `[subdomain]` segment deliberately. The proxy rewrites
 * every path on a shop's host to `/store/<shop>/…`, so a route at `/app/api/…`
 * would be rewritten to a path that does not exist. Nesting it here means the
 * browser calls a clean relative `/api/products` and the subdomain arrives as
 * a route param.
 *
 * Its job is to let the cart re-check itself: cart lines live in localStorage
 * and can sit there for days, so prices drift and stock runs out.
 *
 * Only public facts are exposed — nothing about archived products, no merchant
 * id, no cost information.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;

  const merchant = await getMerchantBySubdomain(subdomain);
  if (!merchant || !merchant.isActive) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const products = await listStorefrontProducts(merchant.id);

  return NextResponse.json(
    {
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        images: product.images,
        variants: sellableVariants(product).map((variant) => ({
          id: variant.id,
          name: variant.name,
          price: variant.price,
          stock: variant.stock,
          imageUrls: variant.imageUrls ?? [],
        })),
      })),
    },
    {
      headers: {
        // Cheap protection against a busy shop hammering the database, while
        // staying fresh enough that a sold-out item does not linger.
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    }
  );
}
