import React from "react";
import MenuOptions from "./menu-options";
import { routes } from "@/routes";
import { getAuthUserDetails } from "@/lib/queries";
import useStore from "@/hooks/useStore";

type Props = {
  id: string;
};
const Sidebar = async ({ id }: Props) => {
  const user = await getAuthUserDetails();

  if (!user) return null;
  if (!user.business) return;

  const sidebarOptions = [
    {
      name: "Launchpad",
      icon: "clipboard",
      link: routes.launchpad.replace(":business_id", user.business.$id),
    },
    {
      name: "Dashboard",
      icon: "dashboard",
      link: routes.dashboard.replace(":business_id", user.business.$id),
    },
    {
      name: "Orders",
      icon: "cart",
      link: routes.inventory.index.replace(":business_id", user.business.$id),
    },
    {
      name: "Inventory",
      icon: "inventory",
      link: routes.inventory.index.replace(":business_id", user.business.$id),
    },
    {
      name: "Customers",
      icon: "customer",
      link: routes.customers.index.replace(":business_id", user.business.$id),
    },
    {
      name: "Finances",
      icon: "finance",
      subOptions: [
        {
          name: "Overview",
          icon: "subNavStart",
          link: routes.finances.overview.replace(
            ":business_id",
            user.business.$id
          ),
        },
        {
          name: "Payouts",
          icon: "subNavEnd",
          link: routes.finances.payout.replace(
            ":business_id",
            user.business.$id
          ),
        },
        {
          name: "Payouts",
          icon: "subNavEnd",
          link: routes.finances.payout.replace(
            ":business_id",
            user.business.$id
          ),
        },
      ],
    },
    {
      name: "Settings",
      icon: "settings",
      link: routes.settings.replace(":business_id", user.business.$id),
    },
  ];

  return (
    <>
      <MenuOptions defaultOpen={true} {...{ id, user, sidebarOptions }} />

      {/* mobile nav */}
      <MenuOptions {...{ id, user, sidebarOptions }} />
    </>
  );
};

export default Sidebar;
