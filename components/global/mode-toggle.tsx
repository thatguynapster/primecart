"use client";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { classNames } from "@/lib/utils";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <Menu as="div" className="relative">
      <MenuButton className="relative flex items-center justify-center rounded-full border-2 w-8 h-8 text-sm focus:outline-none">
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />

        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />

        <span className="sr-only">Toggle theme</span>
      </MenuButton>

      <MenuItems
        transition
        className={classNames(
          "absolute -right-2 z-10 mt-3 w-48 origin-top-right rounded-md py-1 border-2 focus:outline-none data-[closed]:data-[leave]:scale-95 data-[closed]:data-[leave]:transform data-[closed]:data-[leave]:opacity-0 data-[leave]:transition data-[leave]:duration-75 data-[leave]:ease-in",
          "bg-light text-dark border-dark",
          "dark:bg-dark dark:text-light dark:border-light",
          "group"
        )}
      >
        <MenuItem>
          <div
            className={classNames(
              "px-4 py-2 cursor-pointer",
              "hover:bg-dark hover:text-light",
              "hover:dark:bg-light hover:dark:text-dark"
            )}
            onClick={() => setTheme("light")}
          >
            Light
          </div>
        </MenuItem>
        <MenuItem>
          <div
            className={classNames(
              "px-4 py-2 cursor-pointer",
              "hover:bg-dark hover:text-light",
              "hover:dark:bg-light hover:dark:text-dark"
            )}
            onClick={() => setTheme("dark")}
          >
            Dark
          </div>
        </MenuItem>
        <MenuItem>
          <div
            className={classNames(
              "px-4 py-2 cursor-pointer",
              "hover:bg-dark hover:text-light",
              "hover:dark:bg-light hover:dark:text-dark"
            )}
            onClick={() => setTheme("system")}
          >
            System
          </div>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
