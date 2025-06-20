import React from "react";
import MenuOptions from "./menu-options";
import { routes } from "@/routes";
import { getAuthUserDetails, getBusinessDetails } from "@/lib/queries";
import useStore from "@/hooks/useStore";
import { Business } from "@prisma/client";

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
      link: routes.launchpad.replace(":business_id", user.business.id),
    },
    {
      name: "Dashboard",
      icon: "dashboard",
      link: routes.dashboard.replace(":business_id", user.business.id),
    },
    {
      name: "Orders",
      icon: "cart",
      link: routes.orders.index.replace(":business_id", user.business.id),
    },
    {
      name: "Inventory",
      icon: "inventory",
      link: routes.inventory.index.replace(":business_id", user.business.id),
    },
    {
      name: "Customers",
      icon: "customer",
      link: routes.customers.index.replace(":business_id", user.business.id),
    },
    {
      name: "Finance",
      icon: "finance",
      subOptions: [
        {
          name: "Overview",
          icon: "subNavStart",
          link: routes.finance.overview.replace(
            ":business_id",
            user.business.id
          ),
        },
        {
          name: "Payouts",
          icon: "subNavEnd",
          link: routes.finance.payout.replace(":business_id", user.business.id),
        },
      ],
    },
    {
      name: "Settings",
      icon: "settings",
      link: routes.settings.replace(":business_id", user.business.id),
    },
  ];

  const extraOptions = [
    {
      name: "Storefront",
      icon: "storefront",
      link: routes.storefront.replace(":business_id", user.business.id),
    }
  ]

  return (
    <>
      <MenuOptions defaultOpen={true} {...{ id, user, sidebarOptions, extraOptions }} />

      {/* mobile nav */}
      <MenuOptions {...{ id, user, sidebarOptions, extraOptions }} />
    </>
  );
};

export default Sidebar;
