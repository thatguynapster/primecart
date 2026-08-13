import { headers } from "next/headers";

/**
 * PLACEHOLDER — replaced in Phase 8 (Storefront).
 *
 * Exists so the proxy's subdomain rewrite has a target and can be verified.
 * It reads the headers the proxy sets, which is how storefront pages will
 * identify their merchant: never from the URL, and never from client input.
 */
export default async function StorefrontPlaceholder({
  params,
}: PageProps<"/store/[subdomain]">) {
  const { subdomain } = await params;
  const headerList = await headers();

  return (
    <main className="mx-auto max-w-lg p-8 font-mono text-sm">
      <h1 className="mb-4 text-lg font-semibold">Storefront placeholder</h1>
      <dl className="space-y-1">
        <div>
          <dt className="inline text-neutral-500">route subdomain: </dt>
          <dd className="inline">{subdomain}</dd>
        </div>
        <div>
          <dt className="inline text-neutral-500">x-merchant-id: </dt>
          <dd className="inline">{headerList.get("x-merchant-id") ?? "—"}</dd>
        </div>
        <div>
          <dt className="inline text-neutral-500">x-merchant-slug: </dt>
          <dd className="inline">{headerList.get("x-merchant-slug") ?? "—"}</dd>
        </div>
      </dl>
      <p className="mt-6 text-neutral-500">Phase 8 replaces this page.</p>
    </main>
  );
}
