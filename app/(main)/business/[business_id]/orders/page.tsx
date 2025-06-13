import { startOfDay, subDays } from "date-fns";
import React from "react";

import { getOrders, getOrderSummary } from "@/lib/queries";
import OrdersTable from "@/components/orders/orders-table";
import LineChart from "@/components/global/line-chart";
import DateRange from "@/components/global/date-range";
import { ChartConfig } from "@/components/ui/chart";
import { parseCurrency } from "@/lib/utils";
import { chartData } from "@/lib/pages";

type Props = {
  params: { business_id: string };
  searchParams: any;
};

export const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "#027A48",
  },
  orders: {
    label: "Orders",
    color: "#0055D6",
  },
} satisfies ChartConfig;

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

  const chart_data = chartData(orders?.data);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <DateRange />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border-2 py-6 px-8 flex flex-col rounded-xl">
          <h1 className="text-sm font-medium text-dark-muted">Revenue</h1>
          <div className="flex justify-between gap-2 items-center">
            <h1 className="text-2xl font-semibold">

              {parseCurrency(orderSummary?.revenue.toFixed(2))}
            </h1>

            {/* <p className="text-sm font-bold text-success">+22%</p> */}
          </div>
        </div>

        <div className="border-2 py-6 px-8 flex flex-col rounded-xl">
          <h1 className="text-sm font-medium text-dark-muted">Orders</h1>
          <div className="flex justify-between gap-2 items-center">
            <h1 className="text-2xl font-semibold">{orderSummary?.orders}</h1>

            {/* <p className="text-sm font-bold text-error">-21%</p> */}
          </div>
        </div>
      </div>

      <div className="flex border-2 rounded-2xl p-8 h-full min-h-[456px]">
        <LineChart chartData={chart_data} {...{ chartConfig }} />
      </div>

      <div className="flex flex-col divide-y border-2 rounded-2xl px-6 md:px-8 pt-2 pb-8">
        <div className="flex gap-4 justify-between py-4">
          <h2 className="text-xl font-semibold">Recent Orders</h2>
        </div>

        <OrdersTable {...{ orders }} />
      </div>
    </div>
  );
};

export default OrdersPage;
