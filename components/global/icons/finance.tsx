import React from "react";
import { IconProps, Template } from "./template";

const Finance = (props: IconProps) => {
  return (
    <Template {...props}>
      <path
        d="M19 4H5C3.34315 4 2 5.34315 2 7V17C2 18.6569 3.34315 20 5 20H19C20.6569 20 22 18.6569 22 17V7C22 5.34315 20.6569 4 19 4Z"
        fill="#A5A6A5"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M22 10H2V8H22V10Z"
        fill="#5E5E5E"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 15C4 14.4477 4.44772 14 5 14H11C11.5523 14 12 14.4477 12 15C12 15.5523 11.5523 16 11 16H5C4.44772 16 4 15.5523 4 15Z"
        fill="#5E5E5E"
      />
    </Template>
  );
};

export default Finance;
