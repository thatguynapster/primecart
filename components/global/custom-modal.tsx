"use client";
import { useModal } from "@/providers/modal-provider";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
} from "../ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import { classNames } from "@/lib/helpers";

type Props = {
  title: string;
  subheading?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

const CustomModal = ({
  children,
  className,
  defaultOpen,
  subheading,
  title,
}: Props) => {
  const { isOpen, setClose } = useModal();
  return (
    <Dialog open={isOpen || defaultOpen} onOpenChange={setClose}>
      <DialogContent className={classNames("md:max-h-[700px]", className)}>
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl text-center font-bold">
            {title}
          </DialogTitle>
          {subheading && <DialogDescription>{subheading}</DialogDescription>}
          {children}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default CustomModal;
