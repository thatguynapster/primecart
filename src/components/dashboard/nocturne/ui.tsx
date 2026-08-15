import type { ComponentProps, ReactNode } from "react";

/**
 * Nocturne primitives.
 *
 * The token sheet ships these as CSS classes (`.btn`, `.tag`, `.card`); here
 * they are Tailwind utility bundles so the app keeps a single styling
 * mechanism. Values match the sheet exactly — radii are written as arbitrary
 * pixel values rather than Tailwind's `rounded-*` scale, which shadcn has
 * already retuned to a different set of sizes.
 */

// --- buttons ---------------------------------------------------------------

const BTN_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.25 text-sm leading-tight font-medium cursor-pointer transition-colors disabled:opacity-45 disabled:cursor-not-allowed";

export function btnPrimary(extra = "") {
  return `${BTN_BASE} border-nk-accent text-nk-accent bg-transparent hover:bg-nk-accent/12 active:bg-nk-accent/20 ${extra}`;
}

export function btnSecondary(extra = "") {
  return `${BTN_BASE} border-nk-neutral-800 text-nk-text bg-transparent hover:bg-nk-text/7 active:bg-nk-text/12 ${extra}`;
}

export function ButtonPrimary({
  className = "",
  ...props
}: ComponentProps<"button">) {
  return <button {...props} className={btnPrimary(className)} />;
}

export function ButtonSecondary({
  className = "",
  ...props
}: ComponentProps<"button">) {
  return <button {...props} className={btnSecondary(className)} />;
}

// --- tags ------------------------------------------------------------------

export function Tag({
  tone = "accent",
  children,
}: {
  tone?: "accent" | "neutral" | "outline";
  children: ReactNode;
}) {
  const tones = {
    accent: "bg-nk-accent-800 text-nk-accent-100",
    neutral: "bg-nk-neutral-800 text-nk-neutral-100",
    outline: "border border-nk-accent text-nk-accent",
  };

  return (
    <span
      className={`inline-flex items-center rounded-sm px-2.5 py-0.75 text-xs tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

// --- surfaces --------------------------------------------------------------

/** The standard card: surface fill, 1px border, never a shadow. */
export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-md border border-nk-neutral-800 bg-nk-surface ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-base leading-tight font-medium tracking-tight">
      {children}
    </h2>
  );
}

/** 10.5px uppercase kicker used on KPI cards and table headers. */
export function Kicker({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`text-xs font-medium tracking-widest uppercase ${className}`}
    >
      {children}
    </span>
  );
}

// --- skeletons -------------------------------------------------------------

/**
 * Shimmer block. The gradient is wider than the element and slides across it,
 * which is why the background-size is fixed at 320px.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-nk-shimmer rounded-md bg-linear-to-r from-nk-surface from-0% via-nk-neutral-800 via-45% to-nk-surface to-85% bg-[size:320px_100%] ${className}`}
    />
  );
}

// --- empty state -----------------------------------------------------------

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-nk-neutral-800 px-6 py-12 text-center">
      <p className="text-sm font-medium text-nk-text">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-nk-neutral-500">
        {body}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

// --- misc ------------------------------------------------------------------

/** Circular initials avatar. Rings are neutral-700; accent rings mark activity. */
export function Avatar({
  initials,
  size = 28,
  tone = "neutral",
}: {
  initials: string;
  size?: number;
  tone?: "neutral" | "accent";
}) {
  return (
    <span
      style={{ width: size, height: size }}
      className={`grid flex-none place-items-center rounded-full border text-xs ${
        tone === "accent"
          ? "border-nk-accent-700 text-nk-accent-300"
          : "border-nk-neutral-700 text-nk-neutral-300"
      }`}
    >
      {initials}
    </span>
  );
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Progress track used by best sellers, channel split and product stock bars. */
export function Bar({
  value,
  fill = "bg-nk-accent-500",
  height = 6,
}: {
  /** 0–1 */
  value: number;
  fill?: string;
  height?: number;
}) {
  return (
    <div
      style={{ height }}
      className="flex-1 overflow-hidden rounded-full bg-nk-neutral-800"
    >
      <div
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        className={`h-full rounded-full ${fill}`}
      />
    </div>
  );
}
