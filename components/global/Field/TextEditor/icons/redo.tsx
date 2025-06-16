import { IconProps, Template } from "@/components/global/icons/template";

export function RedoIcon({ size = 20, className, ...props }: IconProps) {
  return (
    <Template {...{ size, className, props }}>
      <path
        d="M20 7H10C6.68629 7 4 9.68629 4 13C4 16.3137 6.68629 19 10 19H20M20 7L16 3M20 7L16 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Template>
  );
}
