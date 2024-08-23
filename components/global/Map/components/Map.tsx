"use client";

import { HtmlHTMLAttributes, forwardRef } from "react";

export const Map = forwardRef<
  HTMLDivElement,
  HtmlHTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={className || ``} {...props} />;
});

Map.displayName = "Map";
