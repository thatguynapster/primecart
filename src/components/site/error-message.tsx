"use client";

import { useEffect } from "react";

/**
 * Shared body for every error page. Colours are inherited, so it fits the dark
 * dashboard and the light storefront. Plain `<a>` for home: a full page load
 * is the safer way out of a broken state.
 */
export function ErrorMessage({
  error,
  retry,
  body,
  homeHref,
  homeLabel,
}: {
  error: unknown;
  retry: () => void;
  body: string;
  homeHref: string;
  homeLabel: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String(error.digest)
      : null;

  return (
    <div
      role="alert"
      className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 py-16 text-center"
    >
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm leading-relaxed opacity-70">{body}</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-sm">
        <button
          type="button"
          onClick={() => retry()}
          className="cursor-pointer rounded-md border border-current px-4 py-2 font-medium"
        >
          Try again
        </button>
        <a href={homeHref} className="underline underline-offset-4">
          {homeLabel}
        </a>
      </div>
      {digest && <p className="mt-2 text-xs opacity-50">Reference: {digest}</p>}
    </div>
  );
}
