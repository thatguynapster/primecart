"use client";

import React, { ReactNode, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { useParams, useRouter } from "next/navigation";
import { updateOrderStatus } from "@/lib/queries";
import { _verifyPayment } from "@/lib/helpers";
import Spinner from "../global/icons/spinner";
import { orderStatuses } from "@/lib/types";

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

const ChangeStatusButton = ({ children, order: { id: order_id, status }, payment }: Props) => {
  const router = useRouter();
  const { business_id } = useParams();
  const [isLoading, setIsLoading] = useState(false)
  const [orderStatus, setOrderStatus] = useState(status)

  const _updateOrderStatus = async (id: string, status: OrderStatus) => {
    let newStatus = await updateOrderStatus(business_id as string, id, status);
    setOrderStatus(newStatus?.orderStatus!)
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="px-4 py-2 border-2 rounded-lg flex gap-2 items-center"
        aria-label="Order Actions"
        disabled={isLoading}
      >
        {isLoading ? <Spinner /> : children}
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
              onClick={async (ev) => {
                ev.stopPropagation();
                setIsLoading(true)
                await _updateOrderStatus(order_id, status);
                setIsLoading(false)
              }}
            >
              Set to {status.toLowerCase()}
            </DropdownMenuItem>
          ))}

        {['PROCESSING', 'FAILED', 'ABANDONED'].includes(payment?.status) &&
          <DropdownMenuItem
            className="capitalize cursor-pointer"
            onClick={async (ev) => {
              ev.stopPropagation();
              setIsLoading(true)
              await _verifyPayment({ payment_id: payment.id!, reference: payment.reference! });
              setIsLoading(false)
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
