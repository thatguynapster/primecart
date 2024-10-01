import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg p-2 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        PENDING: "bg-gray text-dark",
        CANCELLED: "bg-warning text-dark",
        DELIVERED: "bg-success text-light",
        SHIPPING: "bg-dark dark:bg-light text-light dark:text-dark",
      },
    },
    defaultVariants: {
      variant: "PENDING",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
