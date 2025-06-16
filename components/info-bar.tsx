"use client";

import { UserButton } from "@clerk/nextjs";
import React from "react";
import { classNames } from "@/lib/utils";
import { ModeToggle } from "./global/mode-toggle";

type Props = {
  className?: string;
};

const InfoBar = ({ className }: Props) => {
  return (
    <div
      className={classNames(
        "fixed z-[20] md:left-[280px] left-0 right-0 top-0 p-4 bg-light dark:bg-dark flex gap-4 items-center border-b-2",
        className
      )}
    >
      <div className="flex items-center gap-2 ml-auto">
        <UserButton afterSignOutUrl="/" />

        <ModeToggle />
      </div>
    </div>
  );
};

export default InfoBar;
