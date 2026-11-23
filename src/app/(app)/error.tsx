"use client";

import { ErrorMessage } from "@/components/site/error-message";

export default function AppError({
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
      homeLabel="Go to your dashboard"
    />
  );
}
