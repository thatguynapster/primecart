import { IconProps, Template } from "@/components/global/icons/template";

export function AlignRightIcon({ size = 20, className, ...props }: IconProps) {
  return (
    <Template {...{ size, className, props }}>
      <path
        d="M21 10H8M21 6H4M21 14H4M21 18H8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Template>
  );
}
