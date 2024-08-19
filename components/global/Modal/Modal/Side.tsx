import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import * as Restart from "@restart/ui";
import { classNames } from "@/lib";

export interface SideProps {
  show: boolean;
  title?: string;
  onHide?: () => void;
  direction?: "left" | "right";
  children: any;
}

export function Side({
  show,
  title,
  onHide,
  children,
  direction = "right",
}: SideProps) {
  /**
   * variables
   */
  const val = direction === "left" ? -1 : 1;

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
      enforceFocus={false}
      aria-labelledby="modal"
    >
      <>
        <motion.div
          exit="closed"
          animate={show ? "open" : "closed"}
          initial="closed"
          variants={{
            closed: { x: 480 * val },
            open: { x: 0 },
          }}
          transition={{ type: "tween" }}
          className={classNames(
            "bg-white",
            "h-full w-full max-w-[480px]",
            "fixed top-0 overflow-y-auto z-[1050]",
            direction === "left" ? "left-0" : "right-0"
          )}
        >
          {title && (
            <div className="flex items-start justify-between py-3 px-6">
              <h2 className="leading-7 tracking-tight text-gray-900 text-lg font-medium">
                {title}
              </h2>
              <div className="ml-3 flex h-7 items-center">
                <button
                  type="button"
                  className="w-5 h-5 hover:text-gray-500 focus:outline-none text-gray-900 text-lg font-medium"
                  onClick={onHide}
                >
                  <span className="sr-only">Close panel</span>
                  <XMarkIcon className="h-6 w-6 " aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {children}
        </motion.div>

        <motion.div
          exit="closed"
          initial="closed"
          onClick={() => onHide?.()}
          animate={show ? "open" : "closed"}
          variants={{ closed: { opacity: 0 }, open: { opacity: 1 } }}
          className={classNames(
            "h-full w-full",
            "bg-black/[0.15]",
            "fixed top-0 left-0 z-[1040]"
          )}
        />
      </>
    </Restart.Modal>
  );
}

export default Side;
