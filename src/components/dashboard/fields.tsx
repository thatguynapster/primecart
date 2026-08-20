import type { ReactNode } from "react";

/**
 * Shared form primitives for the dashboard, on the Nocturne palette.
 *
 * Nocturne is a mono scheme — it defines no error or success colour. The
 * handoff's convention for "needs attention" is `accent-300` (low stock,
 * unpaid), so validation messages use that rather than importing a red that
 * belongs to no ramp.
 */

export const inputClass =
  "w-full rounded-md border border-nk-neutral-800 bg-nk-surface px-3 py-2 text-sm text-nk-text outline-none transition-colors placeholder:text-nk-neutral-600 hover:border-nk-neutral-700 focus-visible:border-nk-accent";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs text-nk-neutral-400">
        {label}
        {hint && <span className="ml-1.5 text-nk-neutral-600">{hint}</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {error && (
        <p className="mt-1.5 text-xs text-nk-accent-300">{error}</p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-nk-accent-700 bg-nk-accent-900 px-3.5 py-2.5 text-sm text-nk-accent-200">
      {message}
    </p>
  );
}

/** Section heading inside a card — 16px/500, never bolder. */
export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-base font-medium tracking-tight text-nk-text">
      {children}
    </h2>
  );
}
