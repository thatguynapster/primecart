import { IconProps, Template } from "@/components/global/icons/template";

export function UndoIcon({ size = 20, className, ...props }: IconProps) {
  return (
    <Template {...{ size, className, props }}>
      <path
        d="M4 7H14C17.3137 7 20 9.68629 20 13C20 16.3137 17.3137 19 14 19H4M4 7L8 3M4 7L8 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Template>
  );
}
