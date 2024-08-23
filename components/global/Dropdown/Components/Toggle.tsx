"use client";

import { ButtonHTMLAttributes } from "react";
import { Dropdown } from "@restart/ui";

export interface ToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  as?: any;
}

export const Toggle = ({
  children,
  as: Component = "button",
  ...rest
}: ToggleProps) => {
  return (
    <Dropdown.Toggle>
      {(props) => {
        return (
          <Component {...rest} {...props}>
            {children}
          </Component>
        );
      }}
    </Dropdown.Toggle>
  );
};

export default Toggle;
