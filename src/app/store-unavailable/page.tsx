/**
 * Shown when a storefront exists but `storefront.isActive` is false — the
 * merchant's subscription has lapsed (D-9, task 8.8).
 *
 * Deliberately distinct from the 404 returned for an unknown subdomain: this
 * store is real, it is just switched off. The copy says nothing about billing —
 * a customer does not need to know the merchant stopped paying.
 *
 * PLACEHOLDER styling — Phase 8 gives this the storefront's look.
 */
export default function StoreUnavailablePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-xl font-semibold">This store is unavailable</h1>
      <p className="max-w-sm text-sm text-neutral-500">
        It is temporarily not accepting orders. Please check back soon.
      </p>
    </main>
  );
}
