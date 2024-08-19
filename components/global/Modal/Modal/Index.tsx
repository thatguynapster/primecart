import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import * as Restart from "@restart/ui";
import { classNames } from "@/lib";
import { Button } from "@/components/button";

/* eslint-disable-next-line */
export interface ModalProps extends Restart.ModalProps {
  index?: number;
  show: boolean;
  header?: string;
  onHide?: () => void;
  size?: "sm" | "lg" | "xl" | "full";
}

export function Modal({
  show,
  size,
  header,
  children,
  index = 0,
  className,
  ...props
}: ModalProps) {
  /**
   * variables
   */
  const sizeClassName = (() => {
    switch (size) {
      case "sm":
        return "max-w-[400px] rounded-lg";
      case "lg":
        return "max-w-[720px] rounded-lg";
      case "xl":
        return "max-w-[1000px] rounded-lg";
      case "full":
        return "max-w-full h-screen overflow-y-auto";
      default:
        return "max-w-[500px] rounded-lg";
    }
  })();

  const zIndex = 1050 + index * 5;

  /**
   * state
   */
  const [showModal, setShowModal] = useState(false);

  /**
   * effect
   */
  useEffect(() => {
    if (show) {
      setShowModal(true);
    }

    if (!show) {
      setTimeout(() => setShowModal(false), 300);
    }
  }, [show]);

  return (
    <Restart.Modal
      show={showModal}
      aria-labelledby="modal"
      renderBackdrop={(props) => (
        <motion.div
          {...props}
          initial="hidden"
          style={{ zIndex }}
          animate={show ? "visible" : "hidden"}
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
      style={{ zIndex: zIndex + 5 }}
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
        animate={show ? "visible" : "hidden"}
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
        className={classNames(
          sizeClassName,
          "mx-auto w-full",
          "flex items-center",
          "min-h-[calc(100%-3rem)]",
          "relative pointer-events-none",
          size !== "full" && "my-6"
        )}
      >
        <div
          className={classNames(
            "w-full rounded-3xl",
            "shadow-3xl bg-white pointer-events-auto relative",
            className || "p-8"
          )}
        >
          {header && (
            <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_1.5rem] items-center">
              <span />
              <div className="text-center">
                <h5 className="mb-0 text-xl font-medium">{header}</h5>
              </div>
              <Button
                className="ml-auto !px-0 !h-6 !w-6 !border-0 text-muted active:shadow-none"
                onClick={() => props.onHide && props.onHide()}
              >
                <XMarkIcon className="w-5 h-5 stroke-[2.85px]" />
              </Button>
            </div>
          )}
          {children}
        </div>
      </motion.div>
    </Restart.Modal>
  );
}

export default Modal;
