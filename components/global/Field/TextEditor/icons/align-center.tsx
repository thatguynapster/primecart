import { IconProps, Template } from "@/components/global/icons/template";

export function AlignCenterIcon({ size = 20, className, ...props }: IconProps) {
  return (
    <Template {...{ size, className, props }}>
      <path
        d="M18 10H6M21 6H3M21 14H3M18 18H6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Template>
  );
}
