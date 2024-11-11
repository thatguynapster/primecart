"use client";
import { ReactNode, TableHTMLAttributes } from "react";
import { FileX } from "lucide-react";

import { classNames } from "@/lib/utils";
import { Pagination } from "./pagination";
import { Button } from "../button";

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

function Empty({
  title,
  className,
  action,
}: {
  title: string;
  className?: string;
  action?: { text: string | ReactNode; onClick: () => void };
}) {
  return (
    <tr>
      <td colSpan={20}>
        <div
          className={`flex flex-col gap-8 px-4 py-4 w-full max-w-[370px] mx-auto ${className}`}
        >
          <div className="text-center flex flex-col gap-2">
            <FileX size={48} className=" text-gray mx-auto" />

            <p className="text-sm font-semibold">
              {title ? title : "Nothing to see here"}
            </p>
          </div>
          {action && (
            <Button
              type="button"
              className="btn btn-primary py-2 px-3"
              onClick={action.onClick}
            >
              {action.text}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

Table.TH = TH;
Table.TD = TD;
Table.Empty = Empty;
Table.Pagination = Pagination;

export { Table };
