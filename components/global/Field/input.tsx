"use client";

import { Field, FieldAttributes } from "formik";
import { forwardRef } from "react";

import { classNames } from "@/lib/utils";

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
          "border-2 border-dark dark:border-light",
          "caret-dark dark:caret-light",
          "w-full px-3.5 py-2.5 text-sm",
          "disabled:cursor-not-allowed",
          "bg-light dark:bg-dark",
          "placeholder:text-gray",
          props.as !== "textarea"
            ? "border-x-0 border-t-0"
            : "border-x border-t rounded-lg"
        )}
        {...props}
      />
    );
  }
);
