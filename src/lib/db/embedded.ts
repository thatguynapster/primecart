import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Writes to embedded document fields.
 *
 * Prisma v6's MongoDB support cannot update fields inside embedded types
 * (ProductVariant, OrderLineItem, ShippingAddress, MerchantStorefront) through
 * standard Client methods. Every such write goes through $runCommandRaw, and
 * every one of them goes through this module rather than calling
 * $runCommandRaw directly — so the merchant scoping and the "did it actually
 * match anything" check are applied uniformly.
 *
 * The dangerous failure mode here is silence: a raw update whose filter matches
 * nothing returns ok:1 with n:0 and looks like success. runEmbeddedUpdate
 * throws instead.
 */

/** Wraps a hex string id for use in a raw MongoDB filter. */
export function oid(id: string): { $oid: string } {
  return { $oid: id };
}

type MongoUpdateResult = {
  ok?: number;
  n?: number;
  nModified?: number;
  writeErrors?: unknown[];
};

export type EmbeddedUpdateArgs = {
  /** Collection name as MongoDB sees it, e.g. "Product". */
  collection: string;
  /**
   * Tenant scope. Applied as the first condition of the filter, mirroring the
   * rule that every query is scoped by merchantId. Omit only for collections
   * that have no merchantId field — Merchant itself, where the record id is
   * the tenant.
   */
  merchantId?: string;
  /** Additional filter conditions, e.g. { _id: oid(productId) }. */
  filter: Prisma.InputJsonObject;
  /** Update document, e.g. { $inc: { "variants.$.stock": -2 } }. */
  update: Prisma.InputJsonObject;
  /** Positional array filters, for the `$[<identifier>]` operator. */
  arrayFilters?: Prisma.InputJsonObject[];
  /**
   * When true (the default), a filter that matches no document throws. Set
   * false only where a no-op is a legitimate outcome.
   */
  requireMatch?: boolean;
};

/**
 * Runs a single raw update against an embedded field.
 *
 * @returns the number of documents actually modified.
 */
export async function runEmbeddedUpdate({
  collection,
  merchantId,
  filter,
  update,
  arrayFilters,
  requireMatch = true,
}: EmbeddedUpdateArgs): Promise<number> {
  const scopedFilter: Prisma.InputJsonObject = merchantId
    ? { merchantId: oid(merchantId), ...filter }
    : filter;

  const command: Prisma.InputJsonObject = {
    update: collection,
    updates: [
      {
        q: scopedFilter,
        u: update,
        multi: false,
        ...(arrayFilters ? { arrayFilters } : {}),
      },
    ],
  };

  const result = (await prisma.$runCommandRaw(command)) as MongoUpdateResult;

  if (result.ok !== 1 || (result.writeErrors?.length ?? 0) > 0) {
    throw new Error(
      `Embedded update on ${collection} failed: ${JSON.stringify(result)}`
    );
  }

  const matched = result.n ?? 0;
  if (requireMatch && matched === 0) {
    throw new Error(
      `Embedded update on ${collection} matched no document. ` +
        `Filter: ${JSON.stringify(scopedFilter)}`
    );
  }

  return result.nModified ?? 0;
}
