import { ClerkProvider } from "@clerk/nextjs";

/**
 * Wraps only the authenticated surface (dashboard, billing, onboarding,
 * sign-in/up) — not the storefront or landing page, which are public and
 * never touch Clerk client-side. Splitting this out of the root layout
 * stopped Clerk's ~194KB JS bundle from loading (and going entirely unused)
 * on every storefront request; Lighthouse's production audit caught it as
 * unused JavaScript. A route group, so none of these URLs change.
 */
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      {children}
    </ClerkProvider>
  );
}
