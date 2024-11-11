import { Card, CardContent } from "@/components/ui/card";
import { chartData } from "@/lib/pages";
import { getCustomerOrders, getSingleCustomer } from "@/lib/queries";
import { format } from "date-fns";
import { Calendar, MapPin } from "lucide-react";
import React from "react";
import { chartConfig } from "../../orders/page";
import LineChart from "@/components/global/line-chart";
import OrdersTable from "@/components/orders/orders-table";

type Props = { params: { business_id: string; customer_id: string } };

const CustomerDetailsPage = async ({
  params: { business_id, customer_id },
}: Props) => {
  const customer = await getSingleCustomer(business_id, customer_id);
  // console.log("customer:", customer);

  const customer_orders = await getCustomerOrders({ business_id, customer_id });
  // console.log("customer orders:", customer_orders);

  const chart_data = chartData(customer_orders?.data);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 w-full">
        <Card className="w-full max-w-80">
          <div className="flex flex-col gap-4">
            <CardContent className="divide-y">
              <div className="flex flex-col gap-4 text-center pb-4">
                <p className="font-bold text-sm">{customer?.name}</p>
                <div className="flex flex-col">
                  <p className="text-sm text-dark-muted dark:text-gray">
                    {customer?.phone}
                  </p>
                  <p className="text-sm text-dark-muted dark:text-gray">
                    {customer?.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-4">
                <div className="flex flex-col gap-1 relative justify-center">
                  <div className="relative">
                    <MapPin size={16} className="absolute left-0" />
                    <p className="pl-8 text-sm font-semibold">Location</p>
                  </div>
                  <p className="pl-8 text-sm text-dark-muted dark:text-gray">
                    {`${customer?.location.address}, ${customer?.location.city}`}
                  </p>
                </div>

                {customer?.firstOrder && (
                  <div className="flex flex-col gap-1 relative justify-center">
                    <div className="relative">
                      <Calendar size={16} className="absolute left-0" />
                      <p className="pl-8 text-sm font-semibold">First Order</p>
                    </div>
                    <p className="pl-8 text-sm text-dark-muted dark:text-gray">
                      {format(
                        customer?.firstOrder?.createdAt,
                        "MMM do, yyyy h:mm a"
                      )}
                    </p>
                  </div>
                )}

                {customer?.lastOrder && (
                  <div className="flex flex-col gap-1 relative justify-center">
                    <div className="relative">
                      <Calendar size={16} className="absolute left-0" />
                      <p className="pl-8 text-sm font-semibold">Latest Order</p>
                    </div>
                    <p className="pl-8 text-sm text-dark-muted dark:text-gray">
                      {format(
                        customer?.lastOrder?.createdAt,
                        "MMM do, yyyy h:mm a"
                      )}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </div>
        </Card>

        <Card className="w-full">
          <LineChart chartData={chart_data} {...{ chartConfig }} height={240} />
        </Card>
      </div>

      <Card>
        <OrdersTable orders={customer_orders} />
      </Card>
    </div>
  );
};

export default CustomerDetailsPage;
