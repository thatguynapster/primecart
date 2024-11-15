"use client";

import React, { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { orderStatuses } from "@/lib/types";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { updateOrderStatus } from "@/lib/queries";
import { useParams, useRouter } from "next/navigation";
import { useModal } from "@/providers/modal-provider";
import { _verifyPayment } from "@/lib/helpers";

type Props = {
  children: ReactNode;
  order_id: string;
  orderStatus: OrderStatus;
  payment: {
    status: PaymentStatus,
    link: string
  }
  onVerifyPayment: () => void
};

const ChangeStatusButton = ({ children, order_id, orderStatus, payment, onVerifyPayment }: Props) => {
  const router = useRouter();
  const { business_id } = useParams();
  const { setOpen } = useModal();

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

        {['FAILED', 'ABANDONED'].includes(payment?.status) &&
          <DropdownMenuItem
            className="capitalize cursor-pointer"
            onClick={async (ev) => {
              ev.stopPropagation();
              onVerifyPayment()
            }}
          >
            Check Payment
          </DropdownMenuItem>
        }

        {/* {['ABANDONED'].includes(payment?.status) &&
          <DropdownMenuItem
            className="capitalize cursor-pointer"
            onClick={async (ev) => {
              ev.stopPropagation();
              // setGetPaymentLink(true);
            }}
          >
            Send Payment Link
          </DropdownMenuItem>
        } */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ChangeStatusButton;
