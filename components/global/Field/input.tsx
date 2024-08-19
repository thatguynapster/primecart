"use client";

import { forwardRef } from "react";
import { Field, FieldAttributes } from "formik";
import { classNames } from "@/lib";

export interface InputProps extends FieldAttributes<any> {
  withFormik?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, withFormik = true, ...props }, ref) => {
    /**
     * variables
     */
    const Component = withFormik ? Field : "input";

    return (
      <Component
        ref={ref}
        className={classNames(
          className,
          "text-sm h-max w-full px-4 py-3",
          "disabled:bg-neutral-30 disabled:text-neutral-400",
          "placeholder:text-neutral-400",
          "caret-primary",
          "bg-white",

          "bg-white dark:bg-neutral-gray",
          "border border-dark",
          "h-max",

          props.as !== "textarea" && "border-x-0 border-t-0"
        )}
        {...props}
      />
    );
  }
);
