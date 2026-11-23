"use client";

import { ErrorMessage } from "@/components/site/error-message";

/** Inside the dashboard shell, so the navigation stays usable. */
export default function DashboardError({
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
      body="Something went wrong on our side. Check whether your last change was saved before trying it again."
      homeHref="/dashboard"
      homeLabel="Go to overview"
    />
  );
}
