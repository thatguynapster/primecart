"use client";

import { ClerkProvider } from "@clerk/nextjs";
import React, { ReactNode } from "react";
import { useTheme } from "next-themes";
import { dark } from "@clerk/themes";

type Props = { children: ReactNode };

const ClerkAuth = ({ children }: Props) => {
  const { theme } = useTheme();

  const userTheme = () => {
    switch (theme) {
      case "dark":
        return dark;

      default:
        return;
    }
  };

  return (
    <ClerkProvider appearance={{ baseTheme: userTheme() }}>
      {children}
    </ClerkProvider>
  );
};

export default ClerkAuth;
