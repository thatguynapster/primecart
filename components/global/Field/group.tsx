"use client";

import { classNames } from "@/lib/helpers";
import React, { HtmlHTMLAttributes } from "react";
import { Error } from "./";

export interface GroupProps
  extends Omit<HtmlHTMLAttributes<HTMLDivElement>, "prefix"> {
  name: string;
  error?: string;
  label?: string;
  disabled?: boolean;
  children?: any;
  withFormik?: boolean;
  errorClassName?: string;
  labelClassName?: string;
  wrapperClassName?: string;
  containerClassName?: string;
  containerPlacementClass?: string;
  required?: boolean;
  as?: string;
}

export function Group({
  name,
  error,
  label,
  children,
  disabled,
  withFormik,
  errorClassName,
  labelClassName,
  wrapperClassName,
  containerClassName,
  containerPlacementClass,
  required,
  as,
  ...props
}: GroupProps) {
  return (
    <div className={classNames(`min-h-6 ${wrapperClassName}`)} {...props}>
      {label && (
        <label
          htmlFor={name}
          className={classNames(
            "text-sm mb-1 font-medium block text-neutral-40 dark:text-neutral-30",
            labelClassName
          )}
        >
          {label}{" "}
          {required && <span className="text-danger-main text-error">*</span>}
        </label>
      )}
      {children && (
        <>
          {React.Children.map(
            children,
            (child) =>
              child && React.cloneElement(child, { ...child.props, disabled })
          )}
        </>
      )}
      <Error
        className={classNames(`field-error`, errorClassName)}
        {...{ name, error, withFormik }}
      />
    </div>
  );
}
