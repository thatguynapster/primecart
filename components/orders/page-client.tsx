"use client";

import DateRange from "@/components/global/date-range";
import OrdersTable from "@/components/orders/orders-table";
import useStore from "@/hooks/useStore";
import { getOrders, getOrderSummary } from "@/lib/queries";
import { Order, OrderSummary } from "@/lib/types";
import { routes } from "@/routes";
import { format, getTime, startOfDay, subDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import queryString from "query-string";
import { ChartConfig } from "@/components/ui/chart";
import LineChart from "@/components/global/line-chart";

type Props = {
  business_id: string;
  orders: {
    data: Order[];
    pagination: {
      total: number;
      total_pages: number;
    };
  };
  orderSummary: OrderSummary | null;
};

const PageClient = ({ business_id, orders, orderSummary }: Props) => {
  console.log(orders);
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<{
    orders: boolean;
    summary: boolean;
  }>({ orders: false, summary: false });

  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "#027A48",
    },
    orders: {
      label: "Orders",
      color: "#0055D6",
    },
  } satisfies ChartConfig;

  const chartData: { name: string; revenue: number; orders: number }[] =
    (() => {
      if (!orders?.data) return [];

      // Aggregate data by date using reduce
      const dailyData = orders.data.reduce<
        Record<string, Record<string, number>>
      >((acc, order) => {
        const dateKey = format(order.createdAt!, "MMM dd");
        const orderRevenue = order.amount || 0;

        if (!acc[dateKey]) {
          acc[dateKey] = { revenue: 0, orders: 0 };
        }

        acc[dateKey].revenue += orderRevenue;
        acc[dateKey].orders += 1;

        return acc;
      }, {});

      // Convert the data into the expected return type
      const data = Object.entries(dailyData).map(
        ([dateKey, { revenue, orders }]) => ({
          name: dateKey,
          orders,
          revenue: revenue,
        })
      );

      return data;
    })();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <DateRange
          onUpdate={(dates) => {
            router.replace(
              `${routes.orders.index.replace(
                ":business_id",
                business_id
              )}?${queryString.stringify({
                from_date: getTime(dates[0]),
                to_date: !isNaN(getTime(dates[1])) ? getTime(dates[1]) : "",
              })}`
            );
            setTimeout(() => {
              router.refresh();
            });
          }}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border-2 py-6 px-8 flex flex-col rounded-xl">
          <h1 className="text-sm font-medium text-dark-muted">Revenue</h1>
          <div className="flex justify-between gap-2 items-center">
            {isLoading.summary ? (
              <div className="h-8 w-24 rounded-lg bg-dark-muted dark:bg-gray animate-pulse"></div>
            ) : (
              <h1 className="text-2xl font-semibold">
                $ {orderSummary?.revenue.toFixed(2)}
              </h1>
            )}
            {/* <p className="text-sm font-bold text-success">+22%</p> */}
          </div>
        </div>

        <div className="border-2 py-6 px-8 flex flex-col rounded-xl">
          <h1 className="text-sm font-medium text-dark-muted">Orders</h1>
          <div className="flex justify-between gap-2 items-center">
            {isLoading.summary ? (
              <div className="h-8 w-24 rounded-lg bg-dark-muted dark:bg-gray animate-pulse"></div>
            ) : (
              <h1 className="text-2xl font-semibold">{orderSummary?.orders}</h1>
            )}
            {/* <p className="text-sm font-bold text-error">-21%</p> */}
          </div>
        </div>
      </div>

      <div className="flex border-2 rounded-2xl p-8 h-full min-h-[456px]">
        {isLoading.orders ? (
          <div className="flex flex-1 items-center justify-center">
            Loading...
          </div>
        ) : (
          <LineChart {...{ chartData, chartConfig }} />
        )}
      </div>

      <div className="flex flex-col divide-y border-2 rounded-2xl px-6 md:px-8 pt-2 pb-8">
        <div className="flex gap-4 justify-between py-4">
          <h2 className="text-xl font-semibold">Recent Orders</h2>
        </div>

        {isLoading.orders ? null : <OrdersTable {...{ business_id, orders }} />}
      </div>
    </div>
  );
};

export default PageClient;
