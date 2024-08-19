import { classNames } from "@/lib";
import { useNavItem, NavItemProps } from "@restart/ui/NavItem";

// eslint-disable-next-line
export interface TabProps extends NavItemProps {}

export function Tab({ eventKey, as: Component = "a", ...props }: TabProps) {
  const [navItemProps, meta] = useNavItem({
    key: eventKey as string,
  });

  return (
    <Component
      {...props}
      {...navItemProps}
      className={classNames(
        "text-sm",
        "flex items-center justify-center",
        "h-14 px-6 cursor-pointer",
        meta.isActive
          ? "border-b-[3px] border-secondary font-medium text-dark text-secondary-main"
          : "border-b border-neutral-200 text-muted"
      )}
    />
  );
}

export default Tab;
