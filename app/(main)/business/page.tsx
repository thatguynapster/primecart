import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Inter } from "next/font/google";
import React from "react";

import BusinessDetails from "@/components/forms/business-details";
import { getAuthUserDetails, initUser } from "@/lib/queries";
import { classNames } from "@/lib/utils";
import { routes } from "@/routes";

const font = Inter({ subsets: ["latin"] });

const Page = async () => {
  const authUser = await currentUser();
  if (!authUser) return redirect("/business/sign-in");

  // initialize user details
  await initUser();

  const authUserDetails = await getAuthUserDetails();

  if (!authUserDetails?.business)
    return (
      <div
        className={classNames(
          font.className,
          "flex items-center justify-center min-h-screen p-8"
        )}
      >
        <BusinessDetails />
      </div>
    );

  redirect(
    routes.launchpad.replace(":business_id", authUserDetails.business?.id)
  );
};

export default Page;
