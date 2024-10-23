import PayoutsTable from "@/components/finance/payouts-table";
import { Card, CardContent } from "@/components/ui/card";
import React from "react";

type Props = {};

const PayoutPage = (props: Props) => {
  return (
    <Card>
      <CardContent>
        <PayoutsTable />
      </CardContent>
    </Card>
  );
};

export default PayoutPage;
