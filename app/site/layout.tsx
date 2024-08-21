import Footer from "@/components/site/footer";
import Navigation from "@/components/site/navigation";
import { classNames } from "@/lib/helpers";
import React, { ReactNode } from "react";

type Props = { children: ReactNode };

const SiteLayout = ({ children }: Props) => {
  return (
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
  );
};

export default SiteLayout;
