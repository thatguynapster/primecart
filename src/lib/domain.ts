/**
 * Subdomain resolution for multi-tenant storefronts.
 *
 * Merchants are served at `<subdomain>.primecart.app`; the bare root domain is
 * the marketing site. `NEXT_PUBLIC_ROOT_DOMAIN` is `localhost:3000` in
 * development, which makes `<subdomain>.localhost:3000` work locally without
 * any hosts-file changes.
 */

const DEFAULT_ROOT_DOMAIN = "primecart.app";

/** Root domain with any port stripped, lowercased. */
export function getRootDomain(): string {
  return (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? DEFAULT_ROOT_DOMAIN)
    .split(":")[0]
    .toLowerCase();
}

/**
 * Extracts the merchant subdomain from a Host header.
 *
 * Returns null for the root domain, for `www`, and for any host that is not a
 * subdomain of the configured root — including Vercel preview URLs, which
 * therefore behave like the root domain rather than a broken store.
 */
export function getSubdomain(host: string | null | undefined): string | null {
  if (!host) return null;

  const hostname = host.split(":")[0].toLowerCase();
  const root = getRootDomain();

  if (hostname === root) return null;
  if (!hostname.endsWith(`.${root}`)) return null;

  const subdomain = hostname.slice(0, hostname.length - root.length - 1);

  // Reject empty, `www`, and any nested subdomain (a.b.primecart.app).
  if (!subdomain || subdomain === "www" || subdomain.includes(".")) return null;

  return subdomain;
}
