import { startOfDay, subDays } from "date-fns";
import React from "react";

import { getOrders, getOrderSummary } from "@/lib/queries";
import PageClient from "./_components/page-client";

type Props = {
  params: { business_id: string };
  searchParams: any;
};

const OrdersPage = async ({ params: { business_id }, searchParams }: Props) => {
  const date_filter = {
    from_date:
      (searchParams["from_date"] && parseInt(searchParams["from_date"])) ??
      startOfDay(subDays(Date.now(), 7)).valueOf(),
    to_date:
      (searchParams["from_date"] && parseInt(searchParams["to_date"])) ??
      Date.now().valueOf(),
  };

  const orders = await getOrders({
    business_id,
    ...date_filter,
  });

  const orderSummary = await getOrderSummary({
    business_id,
    ...date_filter,
  });

  return <PageClient {...{ business_id, orders, orderSummary }} />;
};

export default OrdersPage;
