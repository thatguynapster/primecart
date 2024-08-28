"use client";

import React, { useEffect, useState } from "react";
import { FormikHelpers } from "formik";
import toast from "react-hot-toast";

import { getPaymentDetails, upsertPaymentDetails } from "@/lib/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useModal } from "@/providers/modal-provider";
import CustomModal from "./global/custom-modal";
import MoMo, { MomoData } from "./forms/payment-details/momo";
import Bank, { BankData } from "./forms/payment-details/bank";
import { PaymentData } from "@/lib/types";
import { Button } from "./global/button";
import { Payment } from "@prisma/client";
import { useRouter } from "next/navigation";

type Props = { business: string };

const PaymentDetailsButton = ({ business }: Props) => {
  const { setOpen, setClose } = useModal();
  const router = useRouter();
  const [payment, setPayment] = useState<{
    bank: BankData | null;
    momo: MomoData | null;
  }>();

  const fetchPaymentDetails = async () => {
    try {
      let payment = await getPaymentDetails(business);

      setPayment({
        bank: payment.bank,
        momo: payment.momo,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const savePayment = async ({
    data,
    actions: { setSubmitting },
  }: {
    data: Omit<Payment, "id">;
    actions: Pick<FormikHelpers<Payment>, "setSubmitting">;
  }) => {
    try {
      await upsertPaymentDetails(business, data);
      toast.success("Updated payment details");
      setClose();
      fetchPaymentDetails();
    } catch (error) {
      console.log(error);
      toast.error("Failed to add payment details");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchPaymentDetails();
  }, []);

  return (
    <Button
      className="px-4 py-2"
      onClick={() => {
        setOpen(
          <CustomModal title="Payment Method Details" className="max-w-96">
            {/* <PaymentDetails /> */}
            <div className="flex flex-col gap-4">
              <Tabs defaultValue="account">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="momo">MoMo</TabsTrigger>
                  <TabsTrigger value="bank">Bank/Swift</TabsTrigger>
                </TabsList>

                <TabsContent value="momo">
                  <MoMo
                    data={payment?.momo}
                    onSave={(values, { setSubmitting }) => {
                      savePayment({
                        data: {
                          business_id: business,
                          payment_type: "momo",
                          momo: { ...values },
                          bank: payment?.bank ?? null,
                        },
                        actions: { setSubmitting },
                      });
                    }}
                  />
                </TabsContent>

                <TabsContent value="bank">
                  <Bank
                    data={payment?.bank}
                    onSave={(values, { setSubmitting }) => {
                      savePayment({
                        data: {
                          business_id: business,
                          payment_type: "bank",
                          bank: { ...values },
                          momo: payment?.momo ?? null,
                        },
                        actions: { setSubmitting },
                      });
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </CustomModal>
        );
      }}
    >
      <p className="leading-none">Start</p>
    </Button>
  );
};

export default PaymentDetailsButton;
