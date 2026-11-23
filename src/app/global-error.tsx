"use client";

import { ErrorMessage } from "@/components/site/error-message";
import "./globals.css";

/** Replaces the whole document when the root layout itself fails. */
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <title>Something went wrong</title>
        <ErrorMessage
          error={error}
          retry={retry}
          body="This page couldn't be loaded. Please try again in a moment."
          homeHref="/"
          homeLabel="Go to the home page"
        />
      </body>
    </html>
  );
}
