"use client";

import ClerkAuth from "@/components/global/clerk-auth";
import StoreProvider from "@/contexts/store";
import clsx from "clsx";
import React, { ReactNode } from "react";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <ClerkAuth>
      <StoreProvider>
        <div
          className={clsx("bg-light text-dark", "dark:bg-dark dark:text-light")}
        >
          {children}
        </div>
      </StoreProvider>
    </ClerkAuth>
  );
};

export default Layout;
