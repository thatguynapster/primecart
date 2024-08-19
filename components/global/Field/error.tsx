"use client";

import { classNames } from "@/lib";
import { ErrorMessage, ErrorMessageProps } from "formik";
import styled from "styled-components";

export interface ErrorMessageInterface extends ErrorMessageProps {
  error?: string;
  withFormik?: boolean;
}

export function Error({
  error,
  className,
  withFormik = true,
  ...props
}: ErrorMessageInterface) {
  if (withFormik) {
    return (
      <ErrorMessage {...props}>
        {(error) => (
          <small
            className={classNames(
              "text-red-600 block ml-3.5 mt-1 text-xs",
              className
            )}
          >
            {error}
          </small>
        )}
      </ErrorMessage>
    );
  }

  if (!withFormik) {
    return error ? (
      <small
        className={classNames(
          "text-red-600 block ml-3.5 mt-1 text-xs",
          className
        )}
      >
        {error}
      </small>
    ) : (
      <></>
    );
  }

  return <></>;
}
