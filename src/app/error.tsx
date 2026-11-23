"use client";

import { ErrorMessage } from "@/components/site/error-message";

/** Catches what the closer boundaries can't, such as a shop's own layout. */
export default function RootError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <ErrorMessage
      error={error}
      retry={retry}
      body="This page couldn't be loaded. Please try again in a moment."
      homeHref="/"
      homeLabel="Go to the home page"
    />
  );
}
