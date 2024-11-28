"use client";

import React from "react";
import { Table } from "../global/Table";
import { PaymentTransaction } from "@prisma/client";
import { format } from "date-fns";
import { parseCurrency } from "@/lib/utils";
import clsx from "clsx";

type Props = { transactions: void | { pagination: { total: number; total_pages: number; }, data: PaymentTransaction[] } };

const TransactionsTable = ({ transactions }: Props) => {
  return (
    <div className="flex flex-col gap-4">
      <Table>
        <thead>
          <tr>
            <Table.TH>Date</Table.TH>
            <Table.TH>Description</Table.TH>
            <Table.TH>Amount</Table.TH>
            <Table.TH>Status</Table.TH>
          </tr>
        </thead>

        <tbody className="divide-y">
          {transactions?.data?.map((transaction, i) => (
            <tr key={i}>
              <Table.TD className="justify-evenly whitespace-nowrap">
                {format(transaction.createdAt, "dd MMM, yyyy")}
              </Table.TD>
              <Table.TD>
                {transaction.description}
              </Table.TD>
              <Table.TD className="capitalize font-semibold">
                <span className={clsx({
                  'text-success': transaction.type === 'CREDIT',
                  'text-error': transaction.type === 'DEBIT'
                })}>
                  {parseCurrency(transaction.amount)}</span>
              </Table.TD>
              <Table.TD className="capitalize">

                <p className={clsx("flex gap-2 items-center", {
                  "text-success": transaction.status === 'PAID',
                  "text-error": transaction.status === "FAILED",
                })}> <span className={clsx("w-2 h-2 rounded-full capitalize", {
                  "bg-gray": transaction.status === 'PROCESSING',
                  "bg-success": transaction.status === 'PAID',
                  "bg-error": transaction.status === "FAILED",
                })}></span>{transaction.status.toLowerCase()}</p>

              </Table.TD>
            </tr>
          ))}

          {!transactions?.data?.length && (
            <Table.Empty className="my-8" title="No orders yet" />
          )}
        </tbody>
      </Table>

      <Table.Pagination page={1} pages={transactions?.pagination?.total_pages ?? 1} />
    </div >
  );
};

export default TransactionsTable;
