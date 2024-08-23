export const routes = {
  setup: "/business",
  launchpad: "/business/:business_id/launchpad",
  dashboard: "/business/dashboard",
  orders: { index: "/business/orders", details: "/business/orders/:order_id" },
  inventory: {
    index: "/business/inventory",
    details: "/business/inventory/:inventory_id",
  },
  customers: {
    index: "/business/customers",
    details: "/business/customers/:customer_id",
  },
  finances: {
    overview: "/business/finance",
    payout: "/business/finance/payouts",
  },
  settings: "/business/settings",
};
