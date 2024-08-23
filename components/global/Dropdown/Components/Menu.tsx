"use client";

import { UseDropdownMenuOptions, useDropdownMenu } from "@restart/ui";
import { motion } from "framer-motion";
import useIsomorphicEffect from "@restart/hooks/useIsomorphicEffect";
import styled from "styled-components";
import { classNames } from "@/lib/helpers";

export interface MenuProps extends UseDropdownMenuOptions {
  className?: string;
  role?: string;
  children?: any;
}

export const Menu = ({ role, className, children, ...rest }: MenuProps) => {
  const [props, { toggle, show, popper }] = useDropdownMenu({
    flip: true,
    fixed: true,
    offset: [0, 8],
    placement: "bottom-end",
    ...rest,
  });

  useIsomorphicEffect(() => {
    if (show) popper?.update();
  }, [show]);

  return (
    <motion.div
      {...props}
      role={role}
      initial="hidden"
      animate={show ? "opened" : "hidden"}
      variants={{
        hidden: { opacity: 0, pointerEvents: "none" },
        opened: { opacity: 1, pointerEvents: "inherit" },
      }}
      className={classNames(
        "bg-light dark:bg-dark border-2 border-dark dark:border-light",
        "z-10 flex flex-col overflow-auto",
        "max-h-[25rem] min-w-60",
        "shadow-3xl rounded-lg",
        className
      )}
    >
      {children}
    </motion.div>
  );
};
export default Menu;
