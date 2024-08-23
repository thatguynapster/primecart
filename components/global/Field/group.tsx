"use client";

import { classNames } from "@/lib/helpers";
import React, { HtmlHTMLAttributes } from "react";
import { Error } from "./";

export interface GroupProps
  extends Omit<HtmlHTMLAttributes<HTMLDivElement>, "prefix"> {
  name: string;
  error?: string;
  label?: string;
  children?: any;
  disabled?: boolean;
  withFormik?: boolean;
  errorClassName?: string;
  required?: boolean;
}

export function Group({
  name,
  error,
  label,
  children,
  disabled,
  withFormik,
  errorClassName,
  required,
  ...props
}: GroupProps) {
  return (
    <div className={"flex flex-col gap-2"} {...props}>
      {label && (
        <label htmlFor={name} className={classNames("text-sm font-semibold")}>
          {label} {required && <span className="text-error">*</span>}
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
