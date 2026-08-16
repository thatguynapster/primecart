import { prisma } from "@/lib/prisma";
import { oid, runEmbeddedUpdate } from "@/lib/db/embedded";

/**
 * Stock reservation for orders.
 *
 * "Reservation" here means a hard decrement at order creation, per the
 * handover's stock deduction logic — not a soft hold. The 30-minute deadline
 * lives on Order.reservedUntil; this module only moves the numbers.
 */

export type StockLine = {
  productId: string;
  variantId: string;
  quantity: number;
};

export class OversellError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OversellError";
  }
}

/**
 * Verifies stock and reserves it for every line, or reserves none.
 *
 * Two phases, because MongoDB writes made through `$runCommandRaw` do not
 * participate in Prisma's interactive transactions — there is no single
 * atomic step that can both check and decrement several documents at once.
 *
 * Phase 1 reads the requested products and rejects with the handover's exact
 * wording ("Sorry, only X units available.") if any line is short. Cheap, and
 * correct for the common case: a cart built from stale localStorage data.
 *
 * Phase 2 still reserves each line through an atomic, conditional `$inc`
 * (`stock >= quantity` in the filter itself), because two checkouts can both
 * pass phase 1 for the last unit. If a line loses that race, every line this
 * call already reserved is put back before throwing — the whole order is
 * rejected, never partially fulfilled.
 */
export async function reserveStock(
  merchantId: string,
  lines: StockLine[]
): Promise<void> {
  if (lines.length === 0) return;

  const productIds = [...new Set(lines.map((line) => line.productId))];
  const products = await prisma.product.findMany({
    where: { merchantId, id: { in: productIds }, isActive: true },
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  for (const line of lines) {
    const product = productById.get(line.productId);
    const variant = product?.variants.find(
      (candidate) => candidate.id === line.variantId && candidate.isActive
    );

    if (!product || !variant) {
      throw new OversellError(
        "One of the items in your cart is no longer available."
      );
    }
    if (variant.stock < line.quantity) {
      throw new OversellError(
        `Sorry, only ${variant.stock} of ${product.name} (${variant.name}) available.`
      );
    }
  }

  const reserved: StockLine[] = [];
  try {
    for (const line of lines) {
      await runEmbeddedUpdate({
        collection: "Product",
        merchantId,
        filter: {
          _id: oid(line.productId),
          variants: {
            $elemMatch: { id: line.variantId, stock: { $gte: line.quantity } },
          },
        },
        update: { $inc: { "variants.$[v].stock": -line.quantity } },
        arrayFilters: [{ "v.id": line.variantId }],
      });
      reserved.push(line);
    }
  } catch {
    await restoreStock(merchantId, reserved).catch((rollbackError: unknown) => {
      // The oversell error below is what the shopper needs to see; a failed
      // rollback is a stock-value discrepancy for an operator to reconcile,
      // not something that should mask the real error with a crash.
      console.error(
        "Failed to roll back a partial stock reservation:",
        rollbackError
      );
    });
    throw new OversellError(
      "That item just sold out. Please review your cart and try again."
    );
  }
}

/**
 * Puts reserved stock back. Used by `reserveStock`'s own rollback and by
 * order expiry — never called with negative quantities.
 */
export async function restoreStock(
  merchantId: string,
  lines: StockLine[]
): Promise<void> {
  for (const line of lines) {
    await runEmbeddedUpdate({
      collection: "Product",
      merchantId,
      filter: { _id: oid(line.productId), "variants.id": line.variantId },
      update: { $inc: { "variants.$[v].stock": line.quantity } },
      arrayFilters: [{ "v.id": line.variantId }],
    });
  }
}
