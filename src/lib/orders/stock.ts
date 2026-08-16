import { prisma } from "@/lib/prisma";
import { oid, runEmbeddedUpdate } from "@/lib/db/embedded";
import { notifyLowStock } from "@/lib/notifications/events";

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

  // Collected while reserving, sent only after every line succeeds — an
  // order that fails partway through rolls its stock back, and a low-stock
  // email for stock that was never actually taken would be a false alarm.
  const lowStockAlerts: {
    productId: string;
    productName: string;
    variantName: string;
    newStock: number;
    lowStockThreshold: number;
  }[] = [];

  const reserved: StockLine[] = [];
  try {
    for (const line of lines) {
      const product = productById.get(line.productId)!;
      const variant = product.variants.find((v) => v.id === line.variantId)!;
      const newStock = variant.stock - line.quantity;

      // Once-per-crossing dedupe (docs/NOTIFICATIONS.md): only alert the
      // first time a sale leaves stock at or below the threshold, not on
      // every subsequent sale until it's restocked (variants.ts's
      // setVariantStock, or restoreStock below, clear the flag).
      const crossing = newStock <= variant.lowStockThreshold && !variant.lowStockAlertedAt;

      await runEmbeddedUpdate({
        collection: "Product",
        merchantId,
        filter: {
          _id: oid(line.productId),
          variants: {
            $elemMatch: { id: line.variantId, stock: { $gte: line.quantity } },
          },
        },
        // $runCommandRaw needs MongoDB extended JSON for dates — a plain
        // JS Date serialises through Prisma.InputJsonValue as an ISO
        // *string*, which then fails to read back through Prisma Client
        // ("Failed to convert ... to DateTime"). Verified live.
        update: crossing
          ? {
              $inc: { "variants.$[v].stock": -line.quantity },
              $set: { "variants.$[v].lowStockAlertedAt": { $date: new Date().toISOString() } },
            }
          : { $inc: { "variants.$[v].stock": -line.quantity } },
        arrayFilters: [{ "v.id": line.variantId }],
      });
      reserved.push(line);

      if (crossing) {
        lowStockAlerts.push({
          productId: product.id,
          productName: product.name,
          variantName: variant.name,
          newStock,
          lowStockThreshold: variant.lowStockThreshold,
        });
      }
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

  if (lowStockAlerts.length > 0) {
    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (merchant) {
      await Promise.all(
        lowStockAlerts.map((alert) =>
          notifyLowStock({
            merchantEmail: merchant.email,
            productId: alert.productId,
            productName: alert.productName,
            variantName: alert.variantName,
            stock: alert.newStock,
            lowStockThreshold: alert.lowStockThreshold,
          })
        )
      );
    }
  }
}

/**
 * Puts reserved stock back. Used by `reserveStock`'s own rollback and by
 * order cancellation/expiry — never called with negative quantities.
 *
 * Also clears the low-stock dedupe flag once stock rises back above its
 * threshold, so a later sale that dips it again can alert. Reads current
 * stock first (same shape as reserveStock's phase 1) purely to make that
 * decision — a stale read only affects when the flag resets, never money or
 * inventory correctness.
 */
export async function restoreStock(
  merchantId: string,
  lines: StockLine[]
): Promise<void> {
  if (lines.length === 0) return;

  const productIds = [...new Set(lines.map((line) => line.productId))];
  const products = await prisma.product.findMany({
    where: { merchantId, id: { in: productIds } },
  });
  const productById = new Map(products.map((product) => [product.id, product]));

  for (const line of lines) {
    const variant = productById
      .get(line.productId)
      ?.variants.find((v) => v.id === line.variantId);
    const backAboveThreshold =
      variant !== undefined &&
      variant.stock + line.quantity > variant.lowStockThreshold;

    await runEmbeddedUpdate({
      collection: "Product",
      merchantId,
      filter: { _id: oid(line.productId), "variants.id": line.variantId },
      update: backAboveThreshold
        ? {
            $inc: { "variants.$[v].stock": line.quantity },
            $set: { "variants.$[v].lowStockAlertedAt": null },
          }
        : { $inc: { "variants.$[v].stock": line.quantity } },
      arrayFilters: [{ "v.id": line.variantId }],
    });
  }
}
