"use client";

import React from "react";
import { format } from "date-fns";

import { Table } from "../global/Table";
import { useRouter } from "next/navigation";
import { routes } from "@/routes";
import { Customers } from "@/lib/types";

type Props = {
  business_id: string;
  customers: void | Customers;
};

const CustomersTable = ({ business_id, customers }: Props) => {
  const router = useRouter();

  if (!customers) return <>No data provided</>;

  console.log(customers);

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <thead>
          <tr>
            <Table.TH className="font-semibold">Name</Table.TH>
            <Table.TH className="justify-evenly font-semibold">
              Contact
            </Table.TH>

            <Table.TH className="justify-evenly font-semibold">
              Last Order
            </Table.TH>
          </tr>
        </thead>

        <tbody className="divide-y">
          {customers.data.map(({ email, id, name, orders, phone }, i) => (
            <tr
              key={i}
              className="cursor-pointer"
              onClick={() => {
                router.push(
                  routes.customers.details
                    .replace(":business_id", business_id)
                    .replace(":customer_id", id)
                );
              }}
            >
              <Table.TD className="whitespace-nowrap text-dark dark:text-light font-semibold">
                {name}
              </Table.TD>
              <Table.TD className="justify-evenly whitespace-nowrap">
                {/* {format(customer.lastOrderDate, "dd MMM, yyyy")} */}
                <div className="flex flex-col gap-2.5 text-center">
                  <p className="text-sm font-semibold text-dark-muted dark:text-gray">
                    {email}
                  </p>
                  <p className="text-sm font-semibold">{phone}</p>
                </div>
              </Table.TD>
              <Table.TD className="justify-evenly whitespace-nowrap">
                {/* {format(customer.lastOrderDate, "dd MMM, yyyy")} */}
                <div className="flex flex-col gap-2.5 text-center">
                  <p className="text-sm font-semibold text-dark-muted dark:text-gray">
                    {`${orders[0].location.address}, ${orders[0].location.city}`}
                  </p>
                  <p className="text-sm font-semibold">
                    {format(orders[0].createdAt, "MMM do, yyyy")}
                  </p>
                </div>
              </Table.TD>
            </tr>
          ))}

          {!customers.data.length && <Table.Empty title="No customers found" />}
        </tbody>
      </Table>

      <Table.Pagination
        page={1}
        pages={customers?.pagination?.total_pages ?? 1}
      />
    </div>
  );
};

export default CustomersTable;
