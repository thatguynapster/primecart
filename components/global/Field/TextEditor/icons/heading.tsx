import { IconProps, Template } from "@/components/global/icons/template";

export function HeadingIcon({ size = 20, className, ...props }: IconProps) {
  return (
    <Template {...{ size, className, props }}>
      <path
        d="M6 4V20M18 4V20M8 4H4M18 12L6 12M8 20H4M20 20H16M20 4H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Template>
  );
}
