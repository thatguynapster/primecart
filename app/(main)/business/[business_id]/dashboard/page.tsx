import { startOfDay, subDays } from "date-fns";
import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BestSellerTable from "@/components/dashboard/best-seller-table";
import {
  getBestSellers,
  getLatestOrders,
  getOrders,
  getOrderSummary,
} from "@/lib/queries";
import DateRange from "@/components/global/date-range";
import LineChart from "@/components/global/line-chart";
import { chartConfig } from "../orders/page";
import { chartData } from "@/lib/pages";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { routes } from "@/routes";
import OrdersTable from "@/components/orders/orders-table";
import { Orders } from "@/lib/types";

type Props = { params: { business_id: string }; searchParams: any };

const DashboardPage = async ({
  params: { business_id },
  searchParams,
}: Props) => {
  const date_filter = {
    from_date:
      (searchParams["from_date"] && parseInt(searchParams["from_date"])) ??
      startOfDay(subDays(Date.now(), 7)).valueOf(),
    to_date:
      (searchParams["from_date"] && parseInt(searchParams["to_date"])) ??
      Date.now().valueOf(),
  };

  const best_sellers = await getBestSellers({ business_id });

  const orders = await getOrders({
    business_id,
    ...date_filter,
  });

  const orderSummary = await getOrderSummary({
    business_id,
    ...date_filter,
  });

  const chart_data = chartData(orders?.data);

  const latest_orders = await getLatestOrders(business_id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end w-full">
        <DateRange />
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Card className="w-full max-w-[29.0625rem]">
          <div className="flex flex-col gap-4">
            <CardHeader>
              <CardTitle>Best Sellers</CardTitle>
            </CardHeader>
            <hr className="text-gray" />
            <CardContent>
              <BestSellerTable data={best_sellers} />
            </CardContent>
          </div>
        </Card>

        <div className="flex flex-col gap-4 w-full">
          <div className="flex gap-4">
            <Card className="w-full">
              <CardContent>
                <h1 className="text-sm font-medium text-dark-muted dark:text-gray">
                  Revenue
                </h1>
                <div className="flex justify-between gap-2 items-center">
                  <h1 className="text-2xl font-semibold">
                    ${orderSummary?.revenue.toFixed(2)}
                  </h1>

                  {/* <p className="text-sm font-bold text-error">-21%</p> */}
                </div>
              </CardContent>
            </Card>
            <Card className="w-full">
              <CardContent>
                <h1 className="text-sm font-medium text-dark-muted dark:text-gray">
                  Orders
                </h1>
                <div className="flex justify-between gap-2 items-center">
                  <h1 className="text-2xl font-semibold">
                    {orderSummary?.orders}
                  </h1>

                  {/* <p className="text-sm font-bold text-error">-21%</p> */}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="w-full">
            <CardHeader>
              <CardTitle>Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart
                chartData={chart_data}
                {...{ chartConfig }}
                height={240}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle>Latest Orders</CardTitle>

            <Link
              href={routes.orders.index.replace(":business_id", business_id)}
              className="flex gap-2 items-center"
            >
              <p className="text-dark-muted font-medium">View all</p>
              <ArrowRight size={16} />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <OrdersTable
            orders={{ data: latest_orders ?? [] }}
            withPagination={false}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
