import { IconProps, Template } from "./template";

const ShieldIcon = (props: IconProps) => {
  return (
    <Template {...props}>
      <path
        d="M9 13.6581L11.25 15.9081L15 10.6581M12 3.62207C9.73574 5.7723 6.72026 6.95165 3.598 6.90807C3.20084 8.11805 2.99898 9.38358 3 10.6571C3 16.2491 6.824 20.9471 12 22.2801C17.176 20.9481 21 16.2501 21 10.6581C21 9.34807 20.79 8.08707 20.402 6.90707H20.25C17.054 6.90707 14.15 5.65907 12 3.62207Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Template>
  );
};

export default ShieldIcon;
