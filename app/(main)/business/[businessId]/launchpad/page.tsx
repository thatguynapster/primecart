import { Button } from "@/components/global/button";
import PaymentDetailsButton from "@/components/payment-details-button";
import ThemedImage from "@/components/site/logo";
import { classNames } from "@/lib/helpers";
import { getBusinessDetails } from "@/lib/queries";
import { routes } from "@/routes";
import { CheckCircleIcon } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";
import React from "react";

type Props = { params: { businessId: string } };

const LaunchpadPage = async ({ params: { businessId } }: Props) => {
  const business = await getBusinessDetails(businessId);

  if (!business) return;

  const allDetailsExist: boolean =
    business?.name &&
    business?.email &&
    business?.logo &&
    business?.phone &&
    business?.location &&
    business?.country &&
    business?.city &&
    business?.state &&
    business?.state &&
    business?.zip_code;

  return (
    <div
      className={classNames(
        "border-2 rounded-lg p-6",
        "flex flex-col gap-4",
        "max-w-3xl mx-auto"
      )}
    >
      <div className="flex flex-col">
        <h1 className="text-xl font-bold">Let's get started!</h1>
        <p className="text-sm font-medium">
          Follow the steps below to complete your account set up
        </p>
      </div>

      <div className="flex p-2.5 justify-between items-center">
        <div className="flex gap-4 items-center">
          <div className="w-32 h-16">
            <ThemedImage
              imgSrc={{
                light: "/img/wallet.png",
                dark: "/img/wallet-white.png",
              }}
              size={64}
              className="mx-auto"
            />
          </div>
          <p className="font-medium">
            Add your payment details to receive payments
          </p>
        </div>

        <PaymentDetailsButton business={business.$id} />
      </div>

      <div className="flex p-2.5 justify-between items-center">
        <div className="flex gap-4 items-center">
          <div className="w-32 h-16">
            <ThemedImage size={64} className="mx-auto" />
          </div>
          <p className="font-medium">Fill in your business details</p>
        </div>

        {allDetailsExist ? (
          <CheckCircleIcon
            size={50}
            className="text-dark dark:text-light p-2 flex-shrink-0"
          />
        ) : (
          <Button
            className="px-4 py-2"
            onClick={() => {
              redirect(routes.settings);
            }}
          >
            <p className="leading-none">Start</p>
          </Button>
        )}
      </div>
    </div>
  );
};

export default LaunchpadPage;
