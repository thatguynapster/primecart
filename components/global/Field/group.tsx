"use client";

import { classNames } from "@/lib";
import React, { HtmlHTMLAttributes } from "react";
import styled from "styled-components";
import { Field } from "..";

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
      {/* <div
        className={classNames(
          "bg-white dark:bg-neutral-gray",
          "border border-dark",
          "h-max"
          // as !== "textarea" && "border-x-0 border-t-0"
        )}
      > */}
      {children && (
        <>
          {React.Children.map(
            children,
            (child) =>
              child && React.cloneElement(child, { ...child.props, disabled })
          )}
        </>
      )}
      {/* </div> */}
      <Field.Error
        className={classNames(`field-error`, errorClassName)}
        {...{ name, error, withFormik }}
      />
    </div>
  );
}

/**
 * styles
 */
