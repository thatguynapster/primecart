import BusinessDetails from "@/components/forms/business-details";
import UserDetails from "@/components/forms/user-details";
import { getBusinessDetails, getUser } from "@/lib/queries";
import React from "react";

type Props = { params: { business_id: string } };

const SettingsPage = async ({ params: { business_id } }: Props) => {
  const business = await getBusinessDetails(business_id);

  const user = await getUser(business_id);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <BusinessDetails data={business} />

      <UserDetails {...{ user }} />
    </div>
  );
};

export default SettingsPage;
