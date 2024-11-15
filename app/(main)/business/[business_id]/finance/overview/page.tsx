import TransactionsTable from "@/components/finance/transactions-table";
import { Button } from "@/components/global/button";
import PaymentDetailsButton from "@/components/payment-details-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPayments, getTransactions, getWalletBalance } from "@/lib/queries";
import { parseCurrency } from "@/lib/utils";
import {
  BuildingOffice2Icon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";
import { Pencil, Plus, Wallet } from "lucide-react";
import React from "react";

type Props = { params: { business_id: string } };

const FinancePage = async ({ params: { business_id } }: Props) => {

  const payments = await getPayments({ business_id })
  const transactions = await getTransactions({ business_id })

  const wallet_balance = await getWalletBalance({ business_id })

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col lg:flex-row gap-4">
        <Card className="w-full">
          <CardContent className="flex-flex-col divide-y">
            <div className="flex justify-between items-center gap-4 pb-4">
              <div className="flex gap-4 items-center">
                <Card className="!border px-2.5 py-2">
                  <Wallet size={24} />
                </Card>

                <p className="text-2xl font-medium">{parseCurrency(wallet_balance?.total ?? 0)}</p>
                {/* <p className="text-xs font-medium text-success">+23%</p> */}
              </div>

              <Button variant="outline">Withdraw</Button>
            </div>

            <div className="flex flex-col gap-8">
              <div className="flex flex-wrap md:flex-row justify-center items-center gap-8 pt-4">
                <div className="flex flex-col gap-1 items-center">
                  <p className="text-2xl font-medium">{parseCurrency(wallet_balance?.lifetime ?? 0)}</p>
                  <p className="text-dark-muted dark:text-gray text-sm">
                    Lifetime
                  </p>
                </div>

                <div className="flex flex-col gap-1 items-center">
                  <p className="text-2xl font-medium">{parseCurrency(0)}</p>
                  <p className="text-dark-muted dark:text-gray text-sm">
                    This month
                  </p>
                </div>

                <div className="flex flex-col gap-1 items-center">
                  <p className="text-2xl font-medium">{parseCurrency(0)}</p>
                  <p className="text-dark-muted dark:text-gray text-sm">
                    This year
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardContent className="flex-flex-col gap-4">
            <div className="flex justify-between items-center gap-4">
              <p className="text-2xl font-medium">Payment Methods</p>

              <PaymentDetailsButton >
                {(payments?.bank ?? payments?.momo) ?
                  <>
                    <Pencil size={20} /> Edit
                  </> :
                  <>
                    <Plus size={20} /> Add
                  </>}
              </PaymentDetailsButton>
            </div>

            <div className="flex flex-col divide-y">
              {payments?.bank &&
                <div className="flex items-center justify-between p-4">
                  <div className="flex gap-4 items-center">
                    <BuildingOffice2Icon className="w-6 h-6" />

                    <div className="flex flex-col">
                      <p className="text-sm font-medium">
                        Bank account ending in {payments.bank.account_number.slice(-4)}
                      </p>
                      <p className="text-sm font-medium text-dark-muted dark:text-gray">
                        {payments.bank.bank_name}
                      </p>
                    </div>
                  </div>

                  {/* <Button variant="outline">Edit</Button> */}
                </div>
              }

              {payments?.momo &&
                <div className="flex items-center justify-between p-4">
                  <div className="flex gap-4 items-center">
                    <DevicePhoneMobileIcon className="w-6 h-6" />

                    <div className="flex flex-col">
                      <p className="text-sm font-medium">
                        MoMo account ending in {payments.momo.account_number.slice(-3)}
                      </p>
                      <p className="text-sm font-medium text-dark-muted dark:text-gray">
                        {payments.momo.provider}
                      </p>
                    </div>
                  </div>

                  {/* <Button variant="outline">Edit</Button> */}
                </div>
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionsTable {...{ transactions }} />
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancePage;
