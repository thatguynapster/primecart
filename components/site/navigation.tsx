import React from "react";
import {
  Popover,
  PopoverBackdrop,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { ModeToggle } from "../global/mode-toggle";
import { classNames } from "@/lib/utils";
import ThemedImage from "./logo";
import { routes } from "@/routes";

type Props = {};

const navigation = [
  { name: "Features", href: "#features", current: false },
  { name: "Pricing", href: "#pricing", current: false },
  { name: "About Us", href: "#about-us", current: false },
];

const Navigation = async ({}: Props) => {
  const authUser = await currentUser();

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
              <div className="flex gap-4 items-center">
                <Link href={"/site"}>
                  <ThemedImage size={32} />
                </Link>
                <p className="text-uppercase"></p>
              </div>
            </div>

            {/* Right section on desktop */}
            <div className="flex gap-4 items-center">
              <nav className="hidden lg:flex space-x-4">
                {navigation.map(({ href, name }) => (
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
              <Link
                href={routes.setup}
                className={classNames(
                  "!rounded-full !btn-outline",
                  "bg-light text-dark border-dark",
                  "dark:bg-dark dark:text-light dark:border-light",
                  "rounded-lg border-2",
                  "py-2 px-4"
                )}
              >
                {authUser ? "Dashboard" : "Login"}
              </Link>

              {authUser && (
                <div className="w-7 h-7 rounded-full bg-dark dark:bg-light">
                  <UserButton />
                </div>
              )}

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
                  <Link href={"/site"}>
                    <ThemedImage size={32} />
                  </Link>

                  <div className="-mr-2">
                    <PopoverButton className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none">
                      <span className="absolute -inset-0.5" />
                      <span className="sr-only">Close menu</span>
                      <XMarkIcon aria-hidden="true" className="h-6 w-6" />
                    </PopoverButton>
                  </div>
                </div>
                <div className="mt-3 space-y-1 px-2">
                  {navigation.map(({ href, name }, i) => (
                    <Link
                      key={name}
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
