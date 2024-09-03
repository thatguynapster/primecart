import InfoBar from "@/components/info-bar";
import Sidebar from "@/components/sidebar";
import useStore from "@/hooks/useStore";
import { classNames } from "@/lib/helpers";
import { getBusinessDetails } from "@/lib/queries";
import { routes } from "@/routes";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React, { ReactNode } from "react";

type Props = { children: ReactNode; params: { business_id: string } };

const Layout = async ({ children, params: { business_id } }: Props) => {
  const business = await getBusinessDetails(business_id);

  const user = await currentUser();

  if (!user) return redirect("/");

  if (!business) return redirect(routes.setup);

  return (
    <div
      className={classNames(
        "h-screen overflow-hidden",
        "bg-light text-dark",
        "dark:bg-dark dark:text-light"
      )}
    >
      <Sidebar id={business_id} />

      <InfoBar />
      <div className="md:pl-[280px] h-full min-h-[calc(100vh-64px)] overflow-y-auto">
        <div className="relative mt-16 p-6">{children}</div>
      </div>
    </div>
  );
};

export default Layout;
