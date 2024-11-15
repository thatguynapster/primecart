import {
  CalendarDays,
  ChevronDown,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import React from "react";

import ChangeStatusButton from "@/components/orders/change-status-button";
import OrderProductTable from "@/components/orders/order-product-table";
import BackButton from "@/components/global/back-button";
import { getSingleOrder } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { routes } from "@/routes";
import { _verifyPayment } from "@/lib/helpers";

type Props = { params: { business_id: string; order_id: string } };

const OrderDetailsPage = async ({
  params: { business_id, order_id },
}: Props) => {
  const order = await getSingleOrder(business_id, order_id);

  if (!order) return null;

  return (
    <div className="flex flex-col gap-4">
      <BackButton
        url={routes.orders.index.replace(":business_id", business_id)}
        showText={false}
        withIcon={true}
      />

      <div className="flex flex-col gap-6 p-6 rounded-2xl border-2">
        <div className="flex flex-col gap-4 md:gap-2">
          <div className="flex flex-wrap gap-3 md:gap-6 justify-between">
            <div className="flex gap-4 items-center">
              <p className="text-xl font-semibold">
                Order Id:{" "}
                <span className="uppercase">
                  #{order.id.substring(order.id.length - 7)}
                </span>
              </p>
              <Badge variant={order.orderStatus} className="capitalize">
                {order.orderStatus.toLowerCase()}
              </Badge>
              <Badge
                variant={order.payment?.status ?? "FAILED"}
                className="capitalize"
              >
                {order.payment?.status.toLowerCase() ?? "Failed"}
              </Badge>
            </div>

            <div className="flex gap-6">
              <ChangeStatusButton
                order={{ id: order.id, status: order.orderStatus }}
                payment={{
                  id: order.payment_id!,
                  reference: order.payment?.reference!,
                  link: order.payment?.checkout_url ?? '', status: order.payment?.status ?? 'FAILED'
                }} 
              >
                <p className="text-sm font-semibold">Change Status</p>
                <ChevronDown size={16} />
              </ChangeStatusButton>

              {/* TODO: add this feature later */}
              {/* <Button aria-label="print order details" variant="outline">
                <Printer size={16} />
              </Button> */}
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-3 md:gap-6">
            <div className="flex gap-2 items-center">
              <CalendarDays size={16} />
              <p className="font-semibold">
                {format(order.createdAt, "dd MMM, yyyy")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="w-full max-w-[19.875rem]">
            <div className="flex flex-col gap-2 rounded-xl border-2 p-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg p-4 border w-14 h-14">
                  <UserRound size={24} />
                </div>
                <h1 className="text-xl font-semibold">{order.customer.name}</h1>
              </div>

              <p className="font-semibold text-dark-muted dark:text-gray w-full truncate">
                {order.customer.email}
              </p>
              <p className="font-semibold text-dark-muted dark:text-gray w-full">
                {order.customer.phone}
              </p>
            </div>
          </div>

          <div className="w-full max-w-[19.875rem]">
            <div className="flex flex-col gap-2 rounded-xl border-2 p-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg p-4 border w-14 h-14">
                  <ShoppingBag size={24} />
                </div>
                <h1 className="text-xl font-semibold"> Deliver To</h1>
              </div>

              <p className="font-semibold text-dark-muted dark:text-gray w-full truncate">
                {`${order.location.address},  ${order.location.city}`}
              </p>
              <p className="font-semibold text-dark-muted dark:text-gray w-full truncate">
                {order.location.region}
              </p>
            </div>
          </div>

          {/* <div className="w-full max-w-[19.875rem]">
            <div className="flex flex-col gap-2 rounded-xl border-2 p-4">
              <h1 className="text-xl font-semibold">Payment Info</h1>

              <div className="flex gap-2 items-center">
                <CreditCard size={24} />
                <p className="font-semibold text-dark-muted dark:text-gray">
                  Master Card **** **** **** 6557
                </p>
              </div>
              <p className="font-semibold text-dark-muted dark:text-gray">
                Jane Cooper
              </p>
              <p className="font-semibold text-dark-muted dark:text-gray">
                +900 231 1212
              </p>
            </div>
          </div> */}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6 rounded-2xl border-2">
        <h1 className="text-xl font-semibold">Products</h1>
        {/* <hr /> */}

        <OrderProductTable {...{ order }} />
      </div>
    </div>
  );
};

export default OrderDetailsPage;
