"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ArrowUp, Ellipsis, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Products } from "@prisma/client";
import Image from "next/image";
import React from "react";

import { useModal } from "@/providers/modal-provider";
import CustomModal from "../global/custom-modal";
import { classNames } from "@/lib/helpers";
import { routes } from "@/routes";

type Props = { business: string; data: Products };

const ProductCard = ({ business, data }: Props) => {
  const router = useRouter();
  const { setOpen, setClose } = useModal();

  return (
    <div
      className={classNames(
        "rounded-2xl border-2",
        "flex flex-col w-full",
        "gap-4 p-4"
      )}
    >
      <div className="flex gap-4 w-full">
        <div
          className={classNames(
            "max-w-[84px] h-max",
            "border rounded-lg",
            "bg-light dark:bg-dark"
          )}
        >
          <Image
            src={"/img/logo.png"}
            alt={"PrimeCart"}
            width={84}
            height={84}
            sizes="(max-width: 1200px) 100vw, (max-width: 768px) 50vw, 33vw"
          />
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="flex justify-between">
            <div className="flex flex-col">
              <h1 className="font-semibold line-clamp-2">Adidas Ultra Boost</h1>
              <p className="font-semibold text-sm text-dark-muted dark:text-gray">
                Sneaker
              </p>
            </div>

            <Menu as="div" className="relative">
              <MenuButton className="relative flex items-center justify-center rounded-md border-2 w-8 h-8 text-sm focus:outline-none">
                <Ellipsis className="h-5 w-5 rotate-0 scale-100 transition-all" />

                <span className="sr-only">Toggle theme</span>
              </MenuButton>

              <MenuItems
                transition
                className={classNames(
                  "absolute -right-2 z-10 mt-3 w-max origin-top-right rounded-md py-1 border-2 focus:outline-none data-[closed]:data-[leave]:scale-95 data-[closed]:data-[leave]:transform data-[closed]:data-[leave]:opacity-0 data-[leave]:transition data-[leave]:duration-75 data-[leave]:ease-in",
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
                      "hover:dark:bg-light hover:dark:text-dark",
                      "flex items-center gap-2"
                    )}
                    onClick={() => {
                      router.push(
                        routes.inventory.details
                          .replace(":business_id", business)
                          .replace(":product_id", data.id)
                      );
                    }}
                  >
                    <Pencil size={16} />
                    Edit
                  </div>
                </MenuItem>
                <MenuItem>
                  <div
                    className={classNames(
                      "px-4 py-2 cursor-pointer",
                      "hover:bg-error hover:text-light",

                      "flex items-center gap-2"
                    )}
                    onClick={() => {
                      setOpen(
                        <CustomModal
                          title="Delete Product?"
                          className="max-w-96"
                        >
                          <></>
                        </CustomModal>
                      );
                    }}
                  >
                    <Trash2 size={16} />
                    Delete
                  </div>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
          <div className="flex justify-between">
            <p className="text-sm font-semibold">$110.40</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-dark-muted dark:text-gray">
        Long distance running requires a lot from athletes.
      </p>

      <div className="rounded-lg border px-4 py-2 flex flex-col divide-y divide-muted">
        <div className="flex justify-between py-2">
          <p className="text-sm font-semibold">Sales</p>
          <div className="flex gap-2 items-center">
            <ArrowUp size={16} className="text-success" />
            <p className="text-sm text-dark-muted dark:text-gray">1269</p>
          </div>
        </div>
        <div className="flex justify-between py-2">
          <p className="text-sm font-semibold">Remaining Products</p>
          <p className="text-sm text-dark-muted dark:text-gray">1269</p>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
