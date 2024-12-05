"use client";

import React from "react";
import { Table } from "../global/Table";
import { PaymentTransaction } from "@prisma/client";
import { format } from "date-fns";
import { Payouts } from "@/lib/types";
import { parseCurrency } from "@/lib/utils";
import clsx from "clsx";

type Props = {
  payouts?: Payouts
};

const PayoutsTable = ({ payouts }: Props) => {
  console.log(payouts)

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <thead>
          <tr>
            <Table.TH>Date</Table.TH>
            <Table.TH>Description</Table.TH>
            <Table.TH className="justify-end">Amount</Table.TH>
            <Table.TH className="justify-evenly">Status</Table.TH>
            <Table.TH>Method</Table.TH>
          </tr>
        </thead>

        <tbody className="divide-y">
          {payouts?.payments?.map((payment, i) => (
            <tr key={i}>
              <Table.TD className="justify-evenly whitespace-nowrap">
                {format(payment.createdAt, "dd MMM, yyyy")}
              </Table.TD>

              <Table.TD>
                {payment.description}
              </Table.TD>

              <Table.TD className="capitalize font-semibold justify-end">
                {parseCurrency(payment.amount)}
              </Table.TD>

              <Table.TD className="capitalize justify-evenly">
                <div className="flex gap-2 items-center">
                  <span
                    className={clsx("w-2 h-2 rounded-full", {
                      "bg-gray": payment.status === "PROCESSING",
                      "bg-success": payment.status === "PAID",
                      "bg-error": payment.status === "FAILED",
                    })}
                  />
                  <p>{payment.status.toLowerCase()}</p>
                </div>
              </Table.TD>

              <Table.TD>
                <p>{payment.meta_data?.preferred_channel}</p>
              </Table.TD>
            </tr>
          ))}

          {!payouts?.payments?.length && (
            <Table.Empty className="my-8" title="No orders yet" />
          )}
        </tbody>
      </Table>

      <Table.Pagination page={1} pages={payouts?.pagination?.total_pages ?? 1} />
    </div>
  );
};

export default PayoutsTable;
