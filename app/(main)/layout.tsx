"use client";

import ClerkAuth from "@/components/global/clerk-auth";
import StoreProvider from "@/contexts/store";
import React, { ReactNode } from "react";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <ClerkAuth>
      <StoreProvider>{children}</StoreProvider>
    </ClerkAuth>
  );
};

export default Layout;
