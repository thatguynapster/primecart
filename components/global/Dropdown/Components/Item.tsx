"use client";

import { forwardRef } from "react";
import DropdownItem, { DropdownItemProps } from "@restart/ui/DropdownItem";
import { classNames } from "@/lib/utils";

export const Item = forwardRef<HTMLElement, DropdownItemProps>(
  ({ active, children, className, ...props }, ref) => {
    return (
      <DropdownItem
        ref={ref}
        className={classNames(
          "text-sm",
          "text-left",
          "px-4 py-3",
          "flex items-center",
          "hover:bg-dark hover:text-light transition",
          active && "bg-dark text-light",
          className
        )}
        {...props}
      >
        {children}
      </DropdownItem>
    );
  }
);

export default Item;
