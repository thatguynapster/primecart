"use client";

import { OrderStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import React from "react";
import clsx from "clsx";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { updateOrderStatus } from "@/lib/queries";
import { Table } from "../global/Table";
import { Order } from "@/lib/types";
import { routes } from "@/routes";

type Props = {
  business_id: string;
  orders?: {
    data: Order[];
    pagination: {
      total: number;
      total_pages: number;
    };
  };
  // onUpdate: () => void;
};

const OrdersTable = ({ business_id, orders }: Props) => {
  const router = useRouter();

  const orderStatuses: OrderStatus[] = [
    "PENDING",
    "SHIPPING",
    "DELIVERED",
    "CANCELLED",
  ];

  const _updateOrderStatus = async (id: string, status: OrderStatus) => {
    const updatedOrder = await updateOrderStatus(business_id, id, status);

    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <thead>
          <tr>
            <Table.TH>Order ID</Table.TH>
            <Table.TH>Product</Table.TH>
            <Table.TH className="justify-evenly">Quantity</Table.TH>
            <Table.TH className="justify-evenly">Date</Table.TH>
            <Table.TH className="justify-evenly">Payment Method</Table.TH>
            <Table.TH>Customer</Table.TH>
            <Table.TH>Status</Table.TH>
            <Table.TH className="justify-end">Amount</Table.TH>
            <Table.TH className="justify-evenly">Actions</Table.TH>
          </tr>
        </thead>

        <tbody className="divide-y">
          {orders?.data?.map(
            (order, i) => (
              console.log(order),
              (
                <tr
                  key={i}
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
                          .map(
                            (
                              { name, image, product_variation, quantity },
                              key
                            ) =>
                              key < 3 ? (
                                <Tooltip key={key}>
                                  <TooltipTrigger>
                                    <Image
                                      src={image}
                                      alt={`${name} - (${quantity})`}
                                      width={30}
                                      height={30}
                                      className="rounded-full"
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {/* {`${name} - (${quantity})`} */}
                                    <div className="flex flex-col">
                                      <p>{name}</p>
                                      <p>
                                        Variant:{" "}
                                        {Object.values(
                                          product_variation.attributes!
                                        )
                                          .map((attr, i) => attr)
                                          .join(" / ")}
                                      </p>
                                      <p>Qty: {quantity}</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center bg-muted">
                                  +{order.products.length - 3}
                                </div>
                              )
                          )}
                      </div>
                    </div>
                  </Table.TD>
                  <Table.TD className="justify-evenly">
                    {order.products.reduce((a, b) => a + (b?.quantity ?? 0), 0)}
                  </Table.TD>
                  <Table.TD className="justify-evenly whitespace-nowrap">
                    {format(order.createdAt!, "dd MMM, yyyy")}
                  </Table.TD>
                  <Table.TD className="justify-evenly"></Table.TD>
                  <Table.TD className="whitespace-nowrap">
                    {order.customer.name}
                  </Table.TD>
                  <Table.TD className="capitalize">
                    <div className="flex gap-2 items-center">
                      <span
                        className={clsx("w-2 h-2 rounded-full", {
                          "bg-gray": order.orderStatus === "PENDING",
                          "bg-dark dark:bg-light":
                            order.orderStatus === "SHIPPING",
                          "bg-success": order.orderStatus === "DELIVERED",
                          "bg-warning": order.orderStatus === "CANCELLED",
                        })}
                      />
                      <p>{order.orderStatus.toLowerCase()}</p>
                    </div>
                  </Table.TD>
                  <Table.TD className="justify-end capitalize">
                    ${order.amount.toFixed(2)}
                  </Table.TD>
                  <Table.TD className="justify-evenly">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="px-4 py-2 border-2 rounded-lg"
                        aria-label="Order Actions"
                      >
                        <Ellipsis className="h-5 w-5 rotate-0 scale-100 transition-all" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="!mb-2">
                        {orderStatuses
                          .filter(
                            (status) =>
                              status.toLowerCase() !==
                              order.orderStatus.toLowerCase()
                          )
                          .map((status, i) => (
                            <DropdownMenuItem
                              key={i}
                              className="capitalize cursor-pointer"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                _updateOrderStatus(order.id, status);
                              }}
                            >
                              Set to {status.toLowerCase()}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Table.TD>
                </tr>
              )
            )
          )}

          {!orders?.data?.length && (
            <Table.Empty
              className="my-8"
              field="variants"
              title="No orders yet"
            />
          )}
        </tbody>
      </Table>

      <Table.Pagination page={1} pages={orders?.pagination?.total_pages ?? 1} />
    </div>
  );
};

export default OrdersTable;
