import React from "react";
import MenuOptions from "./menu-options";
import { routes } from "@/routes";
import { getAuthUserDetails } from "@/lib/queries";

type Props = {
  id: string;
};
const Sidebar = async ({ id }: Props) => {
  const user = await getAuthUserDetails();

  if (!user) return null;
  if (!user.business) return;

  let sidebarLogo = user.business.logo || "/plura-logo.svg";

  const sidebarOptions = [
    {
      name: "Launchpad",
      icon: "clipboard",
      link: routes.launchpad.replace(":business_id", user.business.$id),
    },
    {
      name: "Dashboard",
      icon: "dashboard",
      link: routes.dashboard,
    },
    {
      name: "Orders",
      icon: "cart",
      link: routes.inventory.index,
    },
    {
      name: "Inventory",
      icon: "inventory",
      link: routes.inventory.index,
    },
    {
      name: "Customers",
      icon: "customer",
      link: routes.customers.index,
    },
    {
      name: "Finances",
      icon: "finance",
      subOptions: [
        {
          name: "Overview",
          link: routes.finances.overview,
        },
        {
          name: "Payouts",
          link: routes.finances.payout,
        },
      ],
    },
    {
      name: "Settings",
      icon: "settings",
      link: routes.settings,
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
