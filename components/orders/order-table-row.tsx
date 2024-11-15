"use client";

import { routes } from "@/routes";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { Table } from "../global/Table";
import { Orders } from "@/lib/types";
import clsx from "clsx";
import OrderTableProduct from "./order-table-product";
import { differenceInMinutes, format } from "date-fns";
import { Badge } from "../ui/badge";
import { parseCurrency } from "@/lib/utils";
import ChangeStatusButton from "./change-status-button";
import { Ellipsis } from "lucide-react";
import { verifyPayment } from "@/lib/paystack";
import { updateOrderPaymentStatus } from "@/lib/queries";
import toast from "react-hot-toast";
import { _verifyPayment } from "@/lib/helpers";

type Props = { order: Orders["data"][0] };

const OrderTableRow = ({ order }: Props) => {
  const router = useRouter();
  const { business_id } = useParams<{ business_id: string }>();

  useEffect(() => {
    if (order.payment?.status === "PROCESSING" && differenceInMinutes(new Date(), order.createdAt) > 10) { // add time since order creation
      console.log(order);
      _verifyPayment({ payment_id: order.payment_id!, reference: order.payment?.reference! });
    }
  }, [order]);

  return (
    <tr
      className="cursor-pointer"
      onClick={() => {
        router.push(
          routes.orders.details
            .replace(":business_id", business_id)
            .replace(":order_id", order.id)
        );
      }}
    >
      <Table.TD className="uppercase">
        #{order.id.substring(order.id.length - 7)}
      </Table.TD>
      <Table.TD>
        <div className="flex items-center gap-2.5">
          <div
            className={clsx("grid gap-1", {
              "grid-cols-2": order.products.length > 1,
            })}
          >
            {order.products
              .map(({ product, product_variation, quantity }) => ({
                name: product.name,
                image: product.images[0],
                product_variation,
                quantity,
              }))
              .map(({ name, image, product_variation, quantity }, key) => (
                <OrderTableProduct
                  key={key}
                  index={key}
                  {...{
                    image,
                    name,
                    product_variation,
                    quantity,
                  }}
                  dataLength={order.products.length}
                />
              ))}
          </div>
        </div>
      </Table.TD>
      <Table.TD className="justify-evenly">
        {order.products.reduce((a, b) => a + (b?.quantity ?? 0), 0)}
      </Table.TD>
      <Table.TD className="justify-evenly text-center whitespace-nowrap">
        {format(order.createdAt, "dd MMM, yyyy")}
        {', '}
        {format(order.createdAt, "h:mm a")}
      </Table.TD>
      {/* <Table.TD className="justify-evenly"></Table.TD> */}
      <Table.TD className="whitespace-nowrap">{order.customer.name}</Table.TD>
      <Table.TD className="capitalize flex gap-4">
        <Badge variant={order.orderStatus} className="capitalize">
          {order.orderStatus.toLowerCase()}
        </Badge>

        <Badge
          variant={order.payment?.status ?? "FAILED"}
          className="capitalize"
        >
          {order.payment?.status.toLowerCase() ?? "Failed"}
        </Badge>
      </Table.TD>
      <Table.TD className="justify-end capitalize">
        {parseCurrency(order.amount)}
      </Table.TD>
      <Table.TD className="justify-evenly">
        <ChangeStatusButton order_id={order.id} orderStatus={order.orderStatus} payment={{ link: order.payment?.checkout_url ?? '', status: order.payment?.status ?? 'FAILED' }} onVerifyPayment={() => {
          _verifyPayment({ payment_id: order.payment_id!, reference: order.payment?.reference! });
        }}>
          <Ellipsis className="h-5 w-5 rotate-0 scale-100 transition-all" />
        </ChangeStatusButton>
      </Table.TD>
    </tr >
  );
};

export default OrderTableRow;
