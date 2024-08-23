import React from "react";
import { IconProps, Template } from "./template";

const Clipboard = (props: IconProps) => {
  return (
    <Template {...props}>
      <path
        d="M18 3H6C4.34315 3 3 4.34315 3 6V19C3 20.6569 4.34315 22 6 22H18C19.6569 22 21 20.6569 21 19V6C21 4.34315 19.6569 3 18 3Z"
        fill="#A5A6A5"
      />
      <path
        d="M14 3C14 1.89543 13.1046 1 12 1C10.8954 1 10 1.89543 10 3H8V5C8 5.55228 8.44772 6 9 6H15C15.5523 6 16 5.55228 16 5V3H14Z"
        fill="#5E5E5E"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 11C7 10.4477 7.44772 10 8 10H16C16.5523 10 17 10.4477 17 11C17 11.5523 16.5523 12 16 12H8C7.44772 12 7 11.5523 7 11Z"
        fill="#5E5E5E"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 15C7 14.4477 7.44772 14 8 14H12C12.5523 14 13 14.4477 13 15C13 15.5523 12.5523 16 12 16H8C7.44772 16 7 15.5523 7 15Z"
        fill="#5E5E5E"
      />
    </Template>
  );
};

export default Clipboard;
