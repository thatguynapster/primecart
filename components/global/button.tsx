"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { Spinner } from "./icons";
import { classNames } from "@/lib/helpers";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isSubmitting?: boolean;
  variant?: "outline";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, disabled, isSubmitting = false, variant, ...props }, ref) => {
    /**
     * variables
     */
    disabled = (() => {
      if (isSubmitting) {
        return true;
      }
      return disabled;
    })();

    const variantClass = () => {
      switch (variant) {
        case "outline":
          return "bg-light text-dark border-dark dark:bg-dark dark:text-light dark:border-light";
        default:
          return "bg-dark text-light dark:bg-light dark:text-dark";
      }
    };

    return (
      <button
        ref={ref}
        {...{ disabled, ...props }}
        className={classNames(
          "flex gap-2 items-center justify-center",
          "whitespace-nowrap",
          "disabled:pointer-events-none",
          "outline-0 select-none",
          "rounded-lg border-2",
          "py-2 px-4",
          variantClass(),
          props.className
        )}
      >
        {isSubmitting && <Spinner />}
        {children}
      </button>
    );
  }
);
