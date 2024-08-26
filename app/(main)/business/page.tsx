import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Inter } from "next/font/google";
import React from "react";

import BusinessDetails from "@/components/forms/business-details";
import { getAuthUserDetails } from "@/lib/queries";
import { classNames } from "@/lib/helpers";
import { User } from "@/lib/types";
import { routes } from "@/routes";

type Props = {};

const font = Inter({ subsets: ["latin"] });

const Page = async (props: Props) => {
  const authUser = await currentUser();
  if (!authUser) return redirect("/business/sign-in");

  const user: Partial<User> = {
    username:
      authUser.username ??
      `${authUser.firstName?.toLowerCase()}_${authUser.lastName?.toLowerCase()}`,
    password: null,
    avatar: authUser.imageUrl,
    first_name: authUser.firstName!,
    last_name: authUser.lastName!,
    phone: authUser.phoneNumbers[0]?.phoneNumber,
    email: authUser.emailAddresses[0].emailAddress,
  };

  const authUserDetails = await getAuthUserDetails();
  if (!authUserDetails?.business)
    return (
      <div
        className={classNames(
          font.className,
          "flex items-center justify-center min-h-screen"
        )}
      >
        <BusinessDetails {...{ user }} />;
      </div>
    );

  redirect(
    routes.launchpad.replace(":business_id", authUserDetails.business?.$id)
  );
};

export default Page;
