"use client";
import React from "react";

import { Table } from "../global/Table";
import clsx from "clsx";
import { format } from "date-fns";
import { BestSeller, Order } from "@/lib/types";
import { OrderProduct, ProductOrders, Products } from "@prisma/client";
import OrderTableProduct from "../orders/order-table-product";
import Image from "next/image";

type Props = {
  data: void | BestSeller[];
};

const BestSellerTable = ({ data }: Props) => {
  if (!data) return <>No data provided</>;

  return (
    <Table>
      <thead>
        <tr>
          <Table.TH className="font-semibold">Sales</Table.TH>
          <Table.TH className="justify-evenly font-semibold">Product</Table.TH>
          <Table.TH className="justify-evenly font-semibold">Date</Table.TH>
        </tr>
      </thead>

      <tbody className="divide-y">
        {data.map((product, i) => (
          <tr key={i}>
            <Table.TD className="uppercase">{product.totalUnitsSold}</Table.TD>
            <Table.TD>
              <div className="flex items-center gap-2.5">
                <div
                  className={clsx("grid gap-1", {
                    // "grid-cols-2": order.products.length > 1,
                  })}
                >
                  <div className="flex gap-4 items-center">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      width={30}
                      height={30}
                      className="rounded-full"
                    />

                    <p className="text-sm font-medium text-dark-muted truncate w-full max-w-52">
                      {product.name}
                    </p>
                  </div>
                </div>
              </div>
            </Table.TD>
            <Table.TD className="justify-evenly whitespace-nowrap">
              {format(product.lastOrderDate, "dd MMM, yyyy")}
            </Table.TD>
          </tr>
        ))}

        {!data.length && <Table.Empty title="No sales made." />}
      </tbody>
    </Table>
  );
};

export default BestSellerTable;
