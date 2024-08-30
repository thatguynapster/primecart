"use client";

import { ReactNode, TableHTMLAttributes } from "react";
import { classNames } from "@/lib/helpers";

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  containerClassName?: string;
}

function Table({ children, containerClassName, ...props }: TableProps) {
  return (
    <div className="flow-root">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y-2">{children}</table>
        </div>
      </div>
    </div>
  );
}

function TH({
  tooltip,
  className,
  children,
  ...props
}: {
  tooltip?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <th scope="col" className="py-4 px-3 text-sm text-nowrap font-semibold">
      <div
        className={classNames(
          "flex items-center gap-1",
          "text-sm font-medium capitalize",
          className
        )}
      >
        {children}
      </div>
    </th>
  );
}

function TD({
  children,
  className,
  ...props
}: TableHTMLAttributes<HTMLTableCellElement> & { rowSpan?: number }) {
  return (
    <td className={classNames("px-3 py-3.5 text-sm sm:table-cell")} {...props}>
      <div className={classNames("flex w-full", className)}>{children}</div>
    </td>
  );
}

Table.TH = TH;
Table.TD = TD;

export { Table };
