import { ComponentType } from "react";
import { Nav, Tabs, TabsProps } from "@restart/ui";

import { Tab } from "./Components/Tab";
import { classNames } from "@/lib";

export interface LocalTabsProps extends TabsProps {
  tabs: { name: any; slug: string; component: ComponentType }[];
  childProps?: { [x: string]: unknown };
  navClassName?: string;
  componentClassName?: string;
}

export default function ({
  tabs,
  onSelect,
  activeKey,
  childProps,
  navClassName,
  componentClassName,
  ...props
}: LocalTabsProps) {
  /**
   * variables
   */
  const tab = tabs.find((i) => i.slug === activeKey);

  return (
    <Tabs
      {...{ activeKey, ...props }}
      onSelect={(key, e) => key && onSelect?.(String(key), e)}
    >
      <Nav
        className={classNames(
          "w-max overflow-x-auto",
          // "border-b border-neutral-200",
          "flex flex-nowrap whitespace-nowrap"
        )}
      >
        {tabs.map((tab, key) => (
          <Tab eventKey={tab.slug} key={key}>
            {tab.name}
          </Tab>
        ))}
      </Nav>
      <div className={classNames(componentClassName || "py-6")}>
        {tab && <tab.component {...childProps} />}
      </div>
    </Tabs>
  );
}
