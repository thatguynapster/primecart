import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Dashboard reporting.
 *
 * Aggregation pipelines rather than `findMany`, per the handover — these roll
 * up money and counts, and doing that in JavaScript means loading whole
 * collections to add up a few numbers.
 *
 * `merchantId` is the first condition of every `$match`. It arrives from the
 * Clerk session via `requireMerchant`, never from the client.
 *
 * Note on raw pipelines: MongoDB's extended JSON is required here, so object
 * ids are `{ $oid }` and dates `{ $date }` — Prisma passes the command through
 * untouched rather than serialising native values.
 */

const oid = (id: string) => ({ $oid: id });
const isoDate = (date: Date) => ({ $date: date.toISOString() });

type AggregateResult<T> = {
  cursor?: { firstBatch?: T[] };
};

async function aggregate<T>(
  collection: string,
  pipeline: Prisma.InputJsonValue[]
): Promise<T[]> {
  const command: Prisma.InputJsonObject = {
    aggregate: collection,
    pipeline,
    cursor: {},
  };

  const result = (await prisma.$runCommandRaw(command)) as AggregateResult<T>;

  return result.cursor?.firstBatch ?? [];
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export type OverviewKpis = {
  revenue: number;
  orders: number;
  averageOrder: number;
  stockValue: number;
  lowStockCount: number;
};

export async function getOverviewKpis(
  merchantId: string
): Promise<OverviewKpis> {
  const [sales, stock, low] = await Promise.all([
    // Paid orders only — an unpaid reservation is not revenue.
    aggregate<{ revenue: number; orders: number }>("Order", [
      {
        $match: {
          merchantId: oid(merchantId),
          paymentStatus: "PAID",
          createdAt: { $gte: isoDate(daysAgo(30)) },
        },
      },
      { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
    ]),

    aggregate<{ value: number }>("Product", [
      { $match: { merchantId: oid(merchantId), isActive: true } },
      { $unwind: "$variants" },
      { $match: { "variants.isActive": true } },
      {
        $group: {
          _id: null,
          value: {
            $sum: { $multiply: ["$variants.price", "$variants.stock"] },
          },
        },
      },
    ]),

    aggregate<{ count: number }>("Product", [
      { $match: { merchantId: oid(merchantId), isActive: true } },
      { $unwind: "$variants" },
      {
        $match: {
          "variants.isActive": true,
          $expr: { $lte: ["$variants.stock", "$variants.lowStockThreshold"] },
        },
      },
      { $count: "count" },
    ]),
  ]);

  const revenue = sales[0]?.revenue ?? 0;
  const orders = sales[0]?.orders ?? 0;

  return {
    revenue,
    orders,
    averageOrder: orders > 0 ? revenue / orders : 0,
    stockValue: stock[0]?.value ?? 0,
    lowStockCount: low[0]?.count ?? 0,
  };
}

export type DayBar = { label: string; value: number };

/** Paid revenue per day for the last 14 days, gaps filled with zero. */
export async function getSalesSeries(merchantId: string): Promise<DayBar[]> {
  const rows = await aggregate<{ _id: string; total: number }>("Order", [
    {
      $match: {
        merchantId: oid(merchantId),
        paymentStatus: "PAID",
        createdAt: { $gte: isoDate(daysAgo(13)) },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        total: { $sum: "$total" },
      },
    },
  ]);

  const byDay = new Map(rows.map((row) => [row._id, row.total]));
  const out: DayBar[] = [];

  // Built forwards from 13 days ago so the chart always has 14 columns, even
  // for a shop with no sales yet.
  for (let i = 13; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    out.push({
      label: date.toLocaleDateString("en-GH", { weekday: "narrow" }),
      value: byDay.get(key) ?? 0,
    });
  }

  return out;
}

export type BestSeller = { name: string; sold: number };

export async function getBestSellers(
  merchantId: string,
  limit = 4
): Promise<BestSeller[]> {
  return aggregate<BestSeller>("Order", [
    { $match: { merchantId: oid(merchantId), paymentStatus: "PAID" } },
    { $unwind: "$lineItems" },
    {
      $group: {
        _id: "$lineItems.productName",
        sold: { $sum: "$lineItems.quantity" },
      },
    },
    { $sort: { sold: -1 } },
    { $limit: limit },
    { $project: { _id: 0, name: "$_id", sold: 1 } },
  ]);
}

export type FeedOrder = {
  id: string;
  customer: string;
  item: string;
  total: number;
  createdAt: string;
};

/** Most recent storefront orders, for the live feed. */
export async function getLiveFeed(
  merchantId: string,
  limit = 5
): Promise<FeedOrder[]> {
  const rows = await aggregate<{
    _id: { $oid: string };
    customerName?: string;
    lineItems: { productName: string }[];
    total: number;
    createdAt: { $date: string };
  }>("Order", [
    { $match: { merchantId: oid(merchantId), source: "STOREFRONT" } },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
    {
      $project: {
        total: 1,
        createdAt: 1,
        lineItems: 1,
        customerName: "$shippingAddress.name",
      },
    },
  ]);

  return rows.map((row) => ({
    id: row._id.$oid,
    customer: row.customerName ?? "Guest",
    item: row.lineItems?.[0]?.productName ?? "Order",
    total: row.total,
    createdAt: row.createdAt.$date,
  }));
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type SavedView = "all" | "unpaid" | "fulfil" | "storefront" | "whatsapp";

/** Filter semantics come straight from the handoff. */
function viewFilter(view: SavedView): Record<string, unknown> {
  switch (view) {
    case "unpaid":
      return { paymentStatus: "UNPAID" };
    case "fulfil":
      return { status: { $in: ["CONFIRMED", "PROCESSING"] } };
    case "storefront":
      return { source: "STOREFRONT" };
    case "whatsapp":
      return { source: "WHATSAPP" };
    default:
      return {};
  }
}

export type OrderRow = {
  id: string;
  orderNumber: string;
  customer: string;
  channel: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
};

export async function listOrders(
  merchantId: string,
  view: SavedView,
  limit: number
): Promise<{ rows: OrderRow[]; total: number }> {
  const match = {
    merchantId: oid(merchantId),
    ...viewFilter(view),
  };

  const [rows, counted] = await Promise.all([
    aggregate<{
      _id: { $oid: string };
      orderNumber: string;
      customerName?: string;
      source: string;
      status: string;
      paymentStatus: string;
      total: number;
      createdAt: { $date: string };
    }>("Order", [
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      {
        $project: {
          orderNumber: 1,
          source: 1,
          status: 1,
          paymentStatus: 1,
          total: 1,
          createdAt: 1,
          customerName: "$shippingAddress.name",
        },
      },
    ]),
    aggregate<{ count: number }>("Order", [
      { $match: match },
      { $count: "count" },
    ]),
  ]);

  return {
    rows: rows.map((row) => ({
      id: row._id.$oid,
      orderNumber: row.orderNumber,
      customer: row.customerName ?? "Guest",
      channel: row.source,
      status: row.status,
      paymentStatus: row.paymentStatus,
      total: row.total,
      createdAt: row.createdAt.$date,
    })),
    total: counted[0]?.count ?? 0,
  };
}

/** Orders awaiting action — the rail's badge. */
export async function countOrdersNeedingAction(
  merchantId: string
): Promise<number> {
  const rows = await aggregate<{ count: number }>("Order", [
    {
      $match: {
        merchantId: oid(merchantId),
        status: { $in: ["CONFIRMED", "PROCESSING"] },
      },
    },
    { $count: "count" },
  ]);

  return rows[0]?.count ?? 0;
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export type CustomerRow = {
  id: string;
  name: string;
  contact: string;
  orders: number;
  spent: number;
  lastOrder: string | null;
};

export async function listCustomers(
  merchantId: string,
  limit = 50
): Promise<CustomerRow[]> {
  const rows = await aggregate<{
    _id: { $oid: string };
    name: string;
    email?: string | null;
    phone?: string | null;
    orders: number;
    spent: number;
    lastOrder?: { $date: string } | null;
  }>("Customer", [
    { $match: { merchantId: oid(merchantId) } },
    {
      $lookup: {
        from: "Order",
        let: { customerId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$customerId", "$$customerId"] },
              paymentStatus: "PAID",
            },
          },
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              spent: { $sum: "$total" },
              lastOrder: { $max: "$createdAt" },
            },
          },
        ],
        as: "stats",
      },
    },
    {
      $project: {
        name: 1,
        email: 1,
        phone: 1,
        orders: { $ifNull: [{ $first: "$stats.orders" }, 0] },
        spent: { $ifNull: [{ $first: "$stats.spent" }, 0] },
        lastOrder: { $first: "$stats.lastOrder" },
      },
    },
    { $sort: { spent: -1 } },
    { $limit: limit },
  ]);

  return rows.map((row) => ({
    id: row._id.$oid,
    name: row.name,
    contact: row.email ?? row.phone ?? "—",
    orders: row.orders,
    spent: row.spent,
    lastOrder: row.lastOrder?.$date ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export type AnalyticsKpis = {
  revenue: number;
  orders: number;
  repeatRate: number;
  refunds: number;
};

export async function getAnalyticsKpis(
  merchantId: string
): Promise<AnalyticsKpis> {
  const since = isoDate(daysAgo(365));

  const [totals, repeat, refunds] = await Promise.all([
    aggregate<{ revenue: number; orders: number }>("Order", [
      {
        $match: {
          merchantId: oid(merchantId),
          paymentStatus: "PAID",
          createdAt: { $gte: since },
        },
      },
      { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
    ]),

    // Customers with more than one paid order, over customers with any.
    aggregate<{ repeat: number; total: number }>("Order", [
      {
        $match: {
          merchantId: oid(merchantId),
          paymentStatus: "PAID",
          customerId: { $ne: null },
        },
      },
      { $group: { _id: "$customerId", orders: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          repeat: { $sum: { $cond: [{ $gt: ["$orders", 1] }, 1, 0] } },
        },
      },
    ]),

    aggregate<{ count: number }>("Order", [
      { $match: { merchantId: oid(merchantId), paymentStatus: "REFUNDED" } },
      { $count: "count" },
    ]),
  ]);

  const repeatRow = repeat[0];

  return {
    revenue: totals[0]?.revenue ?? 0,
    orders: totals[0]?.orders ?? 0,
    repeatRate:
      repeatRow && repeatRow.total > 0 ? repeatRow.repeat / repeatRow.total : 0,
    refunds: refunds[0]?.count ?? 0,
  };
}

export async function getMonthlyRevenue(merchantId: string): Promise<DayBar[]> {
  const rows = await aggregate<{ _id: string; total: number }>("Order", [
    {
      $match: {
        merchantId: oid(merchantId),
        paymentStatus: "PAID",
        createdAt: { $gte: isoDate(daysAgo(365)) },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        total: { $sum: "$total" },
      },
    },
  ]);

  const byMonth = new Map(rows.map((row) => [row._id, row.total]));
  const out: DayBar[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    out.push({
      label: date.toLocaleDateString("en-GH", { month: "narrow" }),
      value: byMonth.get(key) ?? 0,
    });
  }

  return out;
}

export type ChannelSplit = { name: string; orders: number; share: number };

export async function getChannelSplit(
  merchantId: string
): Promise<ChannelSplit[]> {
  const rows = await aggregate<{ _id: string; orders: number }>("Order", [
    { $match: { merchantId: oid(merchantId) } },
    { $group: { _id: "$source", orders: { $sum: 1 } } },
  ]);

  const bySource = new Map(rows.map((row) => [row._id, row.orders]));
  const total = rows.reduce((sum, row) => sum + row.orders, 0);

  return [
    { key: "STOREFRONT", name: "Storefront" },
    { key: "MANUAL", name: "Manual" },
    { key: "WHATSAPP", name: "WhatsApp" },
  ].map(({ key, name }) => {
    const orders = bySource.get(key) ?? 0;
    return { name, orders, share: total > 0 ? orders / total : 0 };
  });
}

export type CategoryStock = { name: string; units: number; value: number };

export async function getStockValueByCategory(
  merchantId: string
): Promise<CategoryStock[]> {
  const rows = await aggregate<{
    _id: string | null;
    units: number;
    value: number;
  }>("Product", [
    { $match: { merchantId: oid(merchantId), isActive: true } },
    { $unwind: "$variants" },
    { $match: { "variants.isActive": true } },
    {
      $group: {
        _id: "$category",
        units: { $sum: "$variants.stock" },
        value: { $sum: { $multiply: ["$variants.price", "$variants.stock"] } },
      },
    },
    { $sort: { value: -1 } },
  ]);

  return rows.map((row) => ({
    name: row._id ?? "Uncategorised",
    units: row.units,
    value: row.value,
  }));
}
