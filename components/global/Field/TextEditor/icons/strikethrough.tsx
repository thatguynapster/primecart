import { IconProps, Template } from "@/components/global/icons/template";

export function StrikeThroughIcon({
  size = 20,
  className,
  ...props
}: IconProps) {
  return (
    <Template {...{ size, className, props }}>
      <path
        d="M4 7V6C4 5.45879 4.21497 4.96778 4.56419 4.60772M9 20H15M12 12V20M3 3L21 21M9.5 4H17C17.9319 4 18.3978 4 18.7654 4.15224C19.2554 4.35523 19.6448 4.74458 19.8478 5.23463C20 5.60218 20 6.06812 20 7M12 4V6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Template>
  );
}
