export const routes = {
  setup: "/business",
  launchpad: "/business/:business_id/launchpad",
  dashboard: "/business/:business_id/dashboard",
  orders: {
    index: "/business/:business_id/orders",
    details: "/business/orders/:order_id",
  },
  inventory: {
    index: "/business/:business_id/inventory",
    details: "/business/:business_id/inventory/:product_id",
  },
  customers: {
    index: "/business/:business_id/customers",
    details: "/business/:business_id/customers/:customer_id",
  },
  finances: {
    overview: "/business/:business_id/finance",
    payout: "/business/:business_id/finance/payouts",
  },
  settings: "/business/:business_id/settings",
};
