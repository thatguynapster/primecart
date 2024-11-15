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
  order: { id: string, status: OrderStatus },
  payment: {
    id: string
    reference: string
    status: PaymentStatus,
    link: string
  }
};

const ChangeStatusButton = ({ children, order: { id: order_id, status: order_status }, payment }: Props) => {
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
            (status) => status.toLowerCase() !== order_status.toLowerCase()
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
              _verifyPayment({ payment_id: payment.id!, reference: payment.reference! });
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
