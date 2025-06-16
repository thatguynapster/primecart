"use client";

import React from "react";

import OrderTableRow from "./order-table-row";
import { Table } from "../global/Table";
import { Orders } from "@/lib/types";

type Props = {
  orders: Orders | void;
  withPagination?: boolean;
};

const OrdersTable = ({ orders, withPagination = true }: Props) => {

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <thead>
          <tr>
            <Table.TH>Order ID</Table.TH>
            <Table.TH>Product</Table.TH>
            <Table.TH className="justify-evenly">Quantity</Table.TH>
            <Table.TH className="justify-evenly">Date</Table.TH>
            {/* <Table.TH className="justify-evenly">Payment Method</Table.TH> */}
            <Table.TH>Customer</Table.TH>
            <Table.TH>Status</Table.TH>
            <Table.TH className="justify-end">Amount</Table.TH>
            <Table.TH className="justify-evenly">Actions</Table.TH>
          </tr>
        </thead>

        <tbody className="divide-y">
          {orders?.data?.map((order, i) => (
            <OrderTableRow key={i} {...{ order }} />
          ))}

          {!orders?.data?.length && (
            <Table.Empty className="my-8" title="No orders yet" />
          )}
        </tbody>
      </Table>

      {withPagination && (
        <Table.Pagination
          page={1}
          pages={orders?.pagination?.total_pages ?? 1}
        />
      )}
    </div>
  );
};

export default OrdersTable;
