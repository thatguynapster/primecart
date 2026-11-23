"use client";

import { ErrorMessage } from "@/components/site/error-message";

/** Inside the shop's own header and footer. */
export default function StoreError({
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
      body="This page couldn't be loaded. If you were placing an order, check your email before ordering again."
      homeHref="/"
      homeLabel="Back to the shop"
    />
  );
}
