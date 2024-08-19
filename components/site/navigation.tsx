"use client";

import React from "react";

import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Popover,
  PopoverBackdrop,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import { Bars3Icon, BellIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { classNames } from "@/lib/helpers";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../global/button";
import { ModeToggle } from "../global/mode-toggle";
import Logo from "./logo";

type Props = {};

const user = {
  name: "Tom Cook",
  email: "tom@example.com",
  imageUrl:
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
};
const navigation = [
  { name: "Features", href: "#features", current: false },
  { name: "Pricing", href: "#pricing", current: false },
  { name: "About Us", href: "#about-us", current: false },
];

const Navigation = (props: Props) => {
  const pathname = usePathname();

  // const _handleActive = (link: string) => {
  //   if (pathname.split("/")[1] === link.split("/")[1]) {
  //     return true;
  //   }
  //   return false;
  // };

  return (
    <div className="min-h-full sticky top-0 z-10 glass">
      <Popover as="header" className={classNames("", "")}>
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
          <div className="relative flex items-center py-5 justify-between">
            <div className="flex items-center">
              {/* Menu button */}
              <div className="flex-shrink-0 lg:hidden">
                {/* Mobile menu button */}
                <PopoverButton className="group relative inline-flex items-center justify-center rounded-md bg-transparent p-2 focus:outline-none">
                  <span className="absolute -inset-0.5" />
                  <span className="sr-only">Open main menu</span>
                  <Bars3Icon
                    aria-hidden="true"
                    className="block h-6 w-6 group-data-[open]:hidden"
                  />
                  <XMarkIcon
                    aria-hidden="true"
                    className="hidden h-6 w-6 group-data-[open]:block"
                  />
                </PopoverButton>
              </div>

              {/* Logo */}
              <Logo />
            </div>

            {/* Right section on desktop */}
            <div className="flex gap-4 items-center">
              <nav className="hidden lg:flex space-x-4">
                {navigation.map(({ current, href, name }) => (
                  <a
                    key={name}
                    href={href}
                    className={classNames(
                      "rounded-md  bg-opacity-0 px-3 py-2 text-sm font-medium hover:bg-opacity-10"
                    )}
                  >
                    {name}
                  </a>
                ))}
              </nav>

              <Button className={classNames("!rounded-full !btn-outline")}>
                Login
              </Button>

              <ModeToggle />
            </div>
          </div>
        </div>

        {/* mobile view */}
        <div className="lg:hidden">
          <PopoverBackdrop
            transition
            className="fixed inset-0 z-20 duration-150 data-[closed]:opacity-0 data-[enter]:ease-out data-[leave]:ease-in"
          />

          <PopoverPanel
            focus
            transition
            className="absolute inset-x-0 top-0 z-30 mx-auto w-full max-w-3xl origin-top transform p-2 transition duration-150 data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:ease-out data-[leave]:ease-in"
          >
            <div
              className={classNames(
                "divide-y divide-gray-200 rounded-lg border-2",
                "bg-light border-dark",
                "dark:bg-dark dark:border-light"
              )}
            >
              <div className="pb-2 pt-3">
                <div className="flex items-center justify-between px-4">
                  <Logo />

                  <div className="-mr-2">
                    <PopoverButton className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none">
                      <span className="absolute -inset-0.5" />
                      <span className="sr-only">Close menu</span>
                      <XMarkIcon aria-hidden="true" className="h-6 w-6" />
                    </PopoverButton>
                  </div>
                </div>
                <div className="mt-3 space-y-1 px-2">
                  {navigation.map(({ current, href, name }, i) => (
                    <Link
                      className={classNames(
                        "block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-gray-100 hover:text-gray-800"
                      )}
                      {...{ href }}
                    >
                      {name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </PopoverPanel>
        </div>
      </Popover>
    </div>
  );
};

export default Navigation;
