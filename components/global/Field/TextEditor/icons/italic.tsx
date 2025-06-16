import { IconProps, Template } from "@/components/global/icons/template";

export function ItalicIcon({ size = 20, className, ...props }: IconProps) {
  return (
    <Template {...{ size, className, props }}>
      <path
        d="M19 4H10M14 20H5M15 4L9 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Template>
  );
}
