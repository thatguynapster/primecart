"use client";

import React, { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { orderStatuses } from "@/lib/types";
import { ChevronDown } from "lucide-react";
import { OrderStatus } from "@prisma/client";
import { updateOrderStatus } from "@/lib/queries";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";

type Props = {
  children: ReactNode;
  order_id: string;
  orderStatus: OrderStatus;
};

const ChangeStatusButton = ({ children, order_id, orderStatus }: Props) => {
  const router = useRouter();
  const { business_id } = useParams();

  const _updateOrderStatus = async (id: string, status: OrderStatus) => {
    await updateOrderStatus(business_id as string, id, status);

    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="px-4 py-2 border-2 rounded-lg flex gap-2 items-center"
        aria-label="Order Actions"
      >
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="!mb-2">
        {orderStatuses
          .filter(
            (status) => status.toLowerCase() !== orderStatus.toLowerCase()
          )
          .map((status, i) => (
            <DropdownMenuItem
              key={i}
              className="capitalize cursor-pointer"
              onClick={(ev) => {
                ev.stopPropagation();
                _updateOrderStatus(order_id, status);
              }}
            >
              Set to {status.toLowerCase()}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ChangeStatusButton;
