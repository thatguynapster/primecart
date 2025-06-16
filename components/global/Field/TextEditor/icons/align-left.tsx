import { IconProps, Template } from "@/components/global/icons/template";

export function AlignLeftIcon({ size = 20, className, ...props }: IconProps) {
  return (
    <Template {...{ size, className, props }}>
      <path
        d="M16 10H3M20 6H3M20 14H3M16 18H3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Template>
  );
}
