import ClerkAuth from "@/components/global/clerk-auth";
import Footer from "@/components/site/footer";
import Navigation from "@/components/site/navigation";
import { classNames } from "@/lib/helpers";
import React, { ReactNode } from "react";

type Props = { children: ReactNode };

const SiteLayout = ({ children }: Props) => {
  return (
    <ClerkAuth>
      <main
        className={classNames(
          "h-full",
          "bg-light text-dark",
          "dark:bg-dark dark:text-light"
        )}
      >
        <Navigation />
        {children}
        <Footer />
      </main>
    </ClerkAuth>
  );
};

export default SiteLayout;
