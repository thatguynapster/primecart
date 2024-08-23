import { classNames } from "@/lib/helpers";
import { Inter } from "next/font/google";
import React, { ReactNode } from "react";

const font = Inter({ subsets: ["latin"] });

const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div
      className={classNames(
        font.className,
        "flex items-center justify-center min-h-screen"
      )}
    >
      {children}
    </div>
  );
};

export default AuthLayout;
