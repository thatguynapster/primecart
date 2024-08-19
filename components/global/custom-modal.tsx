"use client";

import React, { ReactNode, useEffect } from "react";

import { useModal } from "@/providers/modal-provider";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import * as Restart from "@restart/ui";
import { classNames } from "@/lib";
import { Button } from "@/components/button";

interface Props extends Restart.ModalProps {
  title: string;
  subHeading: string;
  defaultOpen?: boolean;
  size?: "sm" | "lg" | "xl" | "full";
}

const CustomModal = ({
  children,
  subHeading,
  title,
  defaultOpen,
  size,
  className,
  ...props
}: Props) => {
  const { isOpen, setClose } = useModal();

  const renderedSize = (() => {
    switch (size) {
      case "sm":
        return "max-w-[400px]";
      case "lg":
        return "max-w-[720px]";
      case "xl":
        return "max-w-[1000px]";
      case "full":
        return "max-w-full h-screen overflow-y-auto";
      default:
        return "max-w-[500px]";
    }
  })();

  return (
    <Restart.Modal
      show={isOpen}
      aria-labelledby="modal"
      renderBackdrop={(props) => (
        <motion.div
          {...props}
          initial="hidden"
          //   style={{ zIndex }}
          animate={isOpen ? "visible" : "hidden"}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1 },
          }}
          className={classNames(
            "w-full h-full",
            `fixed top-0 left-0`,
            "bg-black/50"
          )}
        />
      )}
      //   style={{ zIndex: zIndex + 5 }}
      style={{ zIndex: 5 }}
      className={classNames(
        "w-full h-full",
        `fixed left-0 top-0`,
        "pointer-events-none",
        "overflow-x-hidden overflow-y-auto"
      )}
      {...props}
    >
      <motion.div
        initial="hidden"
        animate={isOpen ? "visible" : "hidden"}
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
        className={classNames(
          renderedSize,
          "mx-auto w-full",
          "flex items-center",
          "min-h-[calc(100%-3rem)]",
          "relative pointer-events-none",
          size !== "full" && "my-6"
        )}
      >
        <div
          className={classNames(
            "w-full rounded-lg",
            "shadow-3xl bg-white pointer-events-auto relative",
            className || "p-6"
          )}
        >
          <div className="flex justify-end">
            <Button
              className="!p-1.5 !border-0 rounded-md bg-dark text-white"
              onClick={setClose}
            >
              <XMarkIcon className="w-4 h-4 stroke-[2.85px]" />
            </Button>
          </div>
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              {title && <h5 className="mb-0 text-3xl font-medium">{title}</h5>}
              <p className="text-sm text-muted">{subHeading}</p>
            </div>

            {children}
          </div>
        </div>
      </motion.div>
    </Restart.Modal>
  );
};

export default CustomModal;
