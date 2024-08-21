"use client";

import ClerkAuth from "@/components/global/clerk-auth";
import React, { ReactNode } from "react";

const Layout = ({ children }: { children: ReactNode }) => {
  return <ClerkAuth>{children}</ClerkAuth>;
};

export default Layout;
