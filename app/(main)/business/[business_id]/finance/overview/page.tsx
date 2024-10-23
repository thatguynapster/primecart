import TransactionsTable from "@/components/finance/transactions-table";
import { Button } from "@/components/global/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BuildingOffice2Icon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";
import { Plus, Wallet } from "lucide-react";
import React from "react";

type Props = {};

const FinancePage = (props: Props) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col lg:flex-row gap-4">
        <Card className="w-full">
          <CardContent className="flex-flex-col divide-y">
            <div className="flex justify-between items-center gap-4 pb-4">
              <div className="flex flex-1 gap-4 items-center">
                <Card className="!border px-2.5 py-2">
                  <Wallet size={24} />
                </Card>

                <p className="text-2xl font-medium">$23.00</p>
                <p className="text-xs font-medium text-success">+23%</p>
              </div>
              <Button variant="outline">Withdraw</Button>
            </div>

            <div className="flex justify-between gap-8 pt-4">
              <div className="flex flex-col gap-1 w-full items-center">
                <p className="text-2xl font-medium">$0.00</p>
                <p className="text-dark-muted dark:text-gray text-sm">
                  Lifetime
                </p>
              </div>

              <div className="flex flex-col gap-1 w-full items-center">
                <p className="text-2xl font-medium">$0.00</p>
                <p className="text-dark-muted dark:text-gray text-sm">
                  This month
                </p>
              </div>

              <div className="flex flex-col gap-1 w-full items-center">
                <p className="text-2xl font-medium">$0.00</p>
                <p className="text-dark-muted dark:text-gray text-sm">
                  This year
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardContent className="flex-flex-col gap-4">
            <div className="flex justify-between items-center gap-4">
              <p className="text-2xl font-medium">Payment Methods</p>
              <Button variant="outline">
                <Plus size={20} /> Add
              </Button>
            </div>

            <div className="flex flex-col divide-y">
              <div className="flex items-center justify-between p-4">
                <div className="flex gap-4 items-center">
                  <BuildingOffice2Icon className="w-6 h-6" />

                  <div className="flex flex-col">
                    <p className="text-sm font-medium">
                      Bank account ending in 4532
                    </p>
                    <p className="text-sm font-medium text-dark-muted dark:text-gray">
                      Stanbic Bank
                    </p>
                  </div>
                </div>

                <Button variant="outline">Edit</Button>
              </div>

              <div className="flex items-center justify-between p-4">
                <div className="flex gap-4 items-center">
                  <DevicePhoneMobileIcon className="w-6 h-6" />

                  <div className="flex flex-col">
                    <p className="text-sm font-medium">
                      MoMo account ending in 280
                    </p>
                    <p className="text-sm font-medium text-dark-muted dark:text-gray">
                      MTN
                    </p>
                  </div>
                </div>

                <Button variant="outline">Edit</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionsTable />
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancePage;
