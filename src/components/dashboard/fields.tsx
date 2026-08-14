import type { ReactNode } from "react";

/** Shared form primitives for the dashboard, so every form looks the same. */

export const inputClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[15px] outline-none focus:border-neutral-900";

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
      <label
        htmlFor={htmlFor}
        className="block text-[14px] font-medium text-neutral-900"
      >
        {label}
        {hint && (
          <span className="ml-1.5 font-normal text-neutral-400">{hint}</span>
        )}
      </label>
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1.5 text-[13px] text-red-600">{error}</p>}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
      {message}
    </p>
  );
}
