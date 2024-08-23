import React from "react";
import { IconProps, Template } from "./template";

const Dashboard = (props: IconProps) => {
  return (
    <Template {...props}>
      <path
        d="M8 3H6C4.34315 3 3 4.34315 3 6V8C3 9.65685 4.34315 11 6 11H8C9.65685 11 11 9.65685 11 8V6C11 4.34315 9.65685 3 8 3Z"
        fill="#5E5E5E"
      />
      <path
        d="M8 13H6C4.34315 13 3 14.3431 3 16V18C3 19.6569 4.34315 21 6 21H8C9.65685 21 11 19.6569 11 18V16C11 14.3431 9.65685 13 8 13Z"
        fill="#CDCDCD"
      />
      <path
        d="M18 3H16C14.3431 3 13 4.34315 13 6V8C13 9.65685 14.3431 11 16 11H18C19.6569 11 21 9.65685 21 8V6C21 4.34315 19.6569 3 18 3Z"
        fill="#A5A6A5"
      />
      <path
        d="M18 13H16C14.3431 13 13 14.3431 13 16V18C13 19.6569 14.3431 21 16 21H18C19.6569 21 21 19.6569 21 18V16C21 14.3431 19.6569 13 18 13Z"
        fill="#ECECEC"
      />
    </Template>
  );
};

export default Dashboard;
