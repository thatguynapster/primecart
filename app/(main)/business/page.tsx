import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Inter } from "next/font/google";
import React from "react";

import BusinessDetails from "@/components/forms/business-details";
import { getAuthUserDetails } from "@/lib/queries";
import { classNames } from "@/lib/helpers";
// import { User } from "@/lib/types";
import { routes } from "@/routes";
import { Users } from "@prisma/client";

type Props = {};

const font = Inter({ subsets: ["latin"] });

const Page = async (props: Props) => {
  const authUser = await currentUser();
  if (!authUser) return redirect("/business/sign-in");

  const user: Partial<Users> = {
    avatar: authUser.imageUrl,
    email: authUser.emailAddresses[0].emailAddress,
    first_name: authUser.firstName!,
    last_name: authUser.lastName!,
  };

  const authUserDetails = await getAuthUserDetails();

  if (!authUserDetails?.business)
    return (
      <div
        className={classNames(
          font.className,
          "flex items-center justify-center min-h-screen",
          "bg-light dark:bg-dark"
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
