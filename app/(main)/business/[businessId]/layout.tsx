import InfoBar from "@/components/info-bar";
import Sidebar from "@/components/sidebar";
import { classNames } from "@/lib/helpers";
import { getBusinessDetails } from "@/lib/queries";
import { routes } from "@/routes";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React, { ReactNode } from "react";

type Props = { children: ReactNode; params: { businessId: string } };

const Layout = async ({ children, params: { businessId } }: Props) => {
  const business = await getBusinessDetails(businessId);

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
      <Sidebar id={businessId} />

      <div className="md:pl-[280px]">
        <InfoBar />
        <div className="relative mt-16 p-6 min-h-[calc(100vh-64px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
