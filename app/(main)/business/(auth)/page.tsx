import BusinessDetails from "@/components/forms/business-details";
import SingleFileUpload from "@/components/global/single-file-upload";
import { getAuthUserDetails } from "@/lib/queries";
import { User } from "@/lib/types";
import { routes } from "@/routes";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";

type Props = {};

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
  console.log("auth user details:", authUserDetails);
  if (!authUserDetails?.business) return <BusinessDetails {...{ user }} />;

  redirect(
    routes.launchpad.replace(":business_id", authUserDetails.business?.$id)
  );
};

export default Page;
