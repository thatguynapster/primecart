"use client";

import React, { Fragment, useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { Menu } from "lucide-react";

import clsx from "clsx";

import Link from "next/link";
import { icons } from "@/lib/constants";
import { Button } from "../global/button";
import { sidebarOption } from "@/lib/types";
import ThemedImage from "../site/logo";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import SubNavStart from "@/components/global/icons/sub-nav-start";
import SubNavMid from "@/components/global/icons/sub-nav-mid";
import SubNavEnd from "@/components/global/icons/sub-nav-end";
import { getBusinessDetails } from "@/lib/queries";

type Props = {
  defaultOpen?: boolean;
  sidebarOptions: sidebarOption[];
  extraOptions: sidebarOption[] | null;
  id: string;
};

const MenuOptions = ({ id, sidebarOptions, extraOptions, defaultOpen }: Props) => {
  const pathname = usePathname();

  const openState = useMemo(
    () => (defaultOpen ? { open: true } : {}),
    [defaultOpen]
  );

  return (
    <Sheet modal={false} {...openState}>
      <SheetTrigger
        asChild
        className="absolute left-4 top-4 z-40 md:hidden flex"
      >
        <Button variant="outline">
          <Menu />
        </Button>
      </SheetTrigger>

      <SheetContent
        showX={!defaultOpen}
        side="left"
        className={clsx(
          "backdrop-blur-xl fixed top-0 border-r-2",
          { "hidden md:inline-block z-0 w-[280px]": defaultOpen },
          { "inline-block md:hidden z-[100]": !defaultOpen }
        )}
      >
        <SheetDescription></SheetDescription>
        <div className="flex flex-col gap-8">
          <SheetTitle className="flex flex-col items-center gap-2">
            <Link href={"/site"}>
              <ThemedImage size={48} />
            </Link>
            <p className="uppercase">primecart</p>
          </SheetTitle>

          <div className="divide-y flex flex-col">
            <div className="pb-4">
              <nav className="w-full relative flex flex-col gap-3">
                {sidebarOptions.map((option) => {
                  let icon;
                  const result = icons.find((ico) => ico.value === option.icon);

                  if (result) icon = <result.path />;

                  const active = pathname.includes(option.name.toLowerCase());

                  return (
                    <Fragment key={option.name}>
                      {!option.subOptions ? (
                        <Link
                          key={option.name}
                          href={option.link ?? "#"}
                          className={clsx(
                            "flex items-center gap-2",
                            "px-3 py-2 font-medium",
                            "hover:bg-transparent rounded-lg transition-all",
                            {
                              "border-2 border-dark dark:border-light text-dark dark:text-light font-semibold":
                                active,
                            },
                            { "text-gray": !active }
                          )}
                        >
                          {icon}
                          <span>{option.name}</span>
                        </Link>
                      ) : (
                        <Accordion
                          type="single"
                          collapsible
                          className="w-full"
                          defaultValue={
                            pathname.includes(option.name.toLowerCase())
                              ? option.name
                              : ""
                          }
                        >
                          <AccordionItem
                            value={option.name}
                            className="border-none flex flex-col gap-3"
                          >
                            <AccordionTrigger
                              className={clsx(
                                "!px-3 !py-2 rounded-lg",
                                {
                                  "border-2 border-dark dark:border-light text-dark dark:text-light":
                                    active,
                                },
                                { "text-gray": !active }
                              )}
                            >
                              {icon}
                              <span>{option.name}</span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="flex flex-col mx-3 gap-[-1px]">
                                {option.subOptions.map((sub, ind) => {
                                  const subIcon =
                                    ind === 0 ? (
                                      <SubNavStart />
                                    ) : ind === option.subOptions?.length! - 1 ? (
                                      <SubNavEnd />
                                    ) : (
                                      <SubNavMid />
                                    );

                                  const active = pathname.includes(
                                    sub.name.toLowerCase()
                                  );
                                  return (
                                    <Link
                                      key={sub.name}
                                      href={sub.link ?? "#"}
                                      className={clsx(
                                        "flex items-center gap-2",
                                        "px-3 font-medium",
                                        "border",
                                        "hover:bg-transparent rounded-lg transition-all",
                                        {
                                          "border-dark dark:border-light text-dark dark:text-light":
                                            active,
                                        },
                                        { "text-gray border-transparent": !active }
                                      )}
                                    >
                                      {subIcon}
                                      <span>{sub.name}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </Fragment>
                  );
                })}
              </nav>
            </div>

            {extraOptions &&
              <div className="pt-4">
                <nav className="w-full relative flex flex-col gap-3">
                  {extraOptions.map(option => {
                    let icon;
                    const result = icons.find((ico) => ico.value === option.icon);

                    if (result) icon = <result.path />;

                    const active = pathname.includes(option.name.toLowerCase());

                    return <Link
                      key={option.name}
                      href={option.link ?? "#"}
                      className={clsx(
                        "flex items-center gap-2",
                        "px-3 py-2 font-medium",
                        "hover:bg-transparent rounded-lg transition-all",
                        {
                          "border-2 border-dark dark:border-light text-dark dark:text-light font-semibold":
                            active,
                        },
                        { "text-gray": !active }
                      )}
                    >
                      {icon}
                      <span>{option.name}</span>
                    </Link>
                  })}
                </nav>
              </div>
            }
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MenuOptions;
