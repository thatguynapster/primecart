import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BusinessDetails from "@/components/forms/business-details";
import UserDetails from "@/components/forms/user-details";
import { getBusinessDetails, getUser } from "@/lib/queries";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ExperimentalFeatures from "@/components/forms/experimental-features";

type Props = { params: { business_id: string } };

const SettingsPage = async ({ params: { business_id } }: Props) => {
  const business = await getBusinessDetails(business_id);

  const user = await getUser(business_id);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <BusinessDetails data={business} />

      <div className="flex flex-col gap-4">
        <UserDetails {...{ user }} />

        <ExperimentalFeatures enabled={business?.experimental_features ?? false} />
      </div>

    </div>
  );
};

export default SettingsPage;
