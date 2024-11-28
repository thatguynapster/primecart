import PayoutsTable from "@/components/finance/payouts-table";
import { Card, CardContent } from "@/components/ui/card";
import { getPayouts } from "@/lib/queries";
import React from "react";

type Props = {
  params: { business_id: string };
};

const PayoutPage = async ({ params: { business_id } }: Props) => {

  const payouts = await getPayouts({
    business_id,
  })
  return (
    <Card>
      <CardContent>
        <PayoutsTable {...{ payouts }} />
      </CardContent>
    </Card>
  );
};

export default PayoutPage;
