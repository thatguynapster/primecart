"use client";

import { Dropdown, DropdownProps } from "@restart/ui";
import { HtmlHTMLAttributes } from "react";

import Toggle from "./Components/Toggle";
import Menu from "./Components/Menu";
import Item from "./Components/Item";
import { classNames } from "@/lib/helpers";

export interface DropProps
  extends DropdownProps,
    Pick<HtmlHTMLAttributes<HTMLDivElement>, "onClick"> {
  className?: string;
}

export function Drop({ children, className, ...props }: DropProps) {
  return (
    <Dropdown {...props}>
      <div className={classNames("relative", className)}>{children}</div>
    </Dropdown>
  );
}

export default Object.assign(Drop, { Toggle, Menu, Item });
