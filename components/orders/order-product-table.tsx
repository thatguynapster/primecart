"use client";

import React from "react";
import { Table } from "../global/Table";
import Image from "next/image";
import { ProductOrders } from "@prisma/client";
import { Order } from "@/lib/types";
import { parseCurrency } from "@/lib/utils";

type Props = { order: Order };

const OrderProductTable = ({ order }: Props) => {
  return (
    <div className="flex flex-col gap-4">
      <Table>
        <thead>
          <tr>
            <Table.TH>Product</Table.TH>
            <Table.TH className="justify-evenly">Quantity</Table.TH>
            <Table.TH className="justify-end">Total</Table.TH>
          </tr>
        </thead>

        <tbody className="divide-y">
          {order.products.map(
            ({ amount, product, product_variation, quantity }, i) => (
              <tr className="cursor-pointer" key={i}>
                <Table.TD className="font-semibold">
                  <div className="flex gap-4 items-center">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      width={40}
                      height={40}
                      className="rounded-lg"
                    />
                    <p>
                      {`${product.name} (${Object.values(
                        product_variation.attributes!
                      )
                        .map((attr, i) => attr)
                        .join(" / ")})`}
                    </p>
                  </div>
                </Table.TD>
                <Table.TD className="text-sm font-semibold justify-evenly">
                  {quantity}
                </Table.TD>
                <Table.TD className="font-semibold justify-end">
                  {parseCurrency(amount)}
                </Table.TD>
              </tr>
            )
          )}
        </tbody>
      </Table>

      <div className="flex flex-col gap-4 w-full max-w-64 ml-auto">
        {/* <div className="flex gap-8 justify-between w-full">
          <p className="font-semibold">Subtotal</p>
          <p className="font-semibold">${order.amount.toFixed(2)}</p>
        </div> */}
        {/* <div className="flex gap-8 justify-between w-full">
          <p className="font-semibold">Tax (20%)</p>
          <p className="font-semibold">$601.32</p>
        </div> */}
        {/* <div className="flex gap-8 justify-between w-full">
          <p className="font-semibold">Discount</p>
          <p className="font-semibold">$0</p>
        </div> */}
        <div className="flex gap-8 items-center justify-between w-full">
          <p className="text-2xl font-semibold">Total</p>
          <p className="text-2xl font-semibold">{parseCurrency(order.amount)}</p>
        </div>
      </div>
    </div>
  );
};

export default OrderProductTable;
