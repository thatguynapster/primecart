import CustomersTable from "@/components/customers/customers-table";
import { Card, CardContent } from "@/components/ui/card";
import { getCustomers } from "@/lib/queries";
import React from "react";

type Props = { params: { business_id: string } };

const CustomersPage = async ({ params: { business_id } }: Props) => {
  const customers = await getCustomers({ business_id });

  return (
    <Card className="w-full">
      <div className="flex flex-col gap-4">
        <CardContent>
          <CustomersTable {...{ business_id }} customers={customers} />
        </CardContent>
      </div>
    </Card>
  );
};

export default CustomersPage;
