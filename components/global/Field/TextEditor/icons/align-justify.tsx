import { IconProps, Template } from "@/components/global/icons/template";

export function AlignJustifyIcon({
  size = 20,
  className,
  ...props
}: IconProps) {
  return (
    <Template {...{ size, className, props }}>
      <path
        d="M21 10H3M21 18H3M21 6H3M21 14H3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Template>
  );
}
