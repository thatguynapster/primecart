/**
 * Who PrimeCart is, as the Terms and Privacy Policy state it. Ghana's
 * Electronic Transactions Act 2008 (s.47) requires an online supplier to show
 * its name, legal status, address, phone and email. Add the registration
 * number to `status` once the registration is issued.
 */
export const BUSINESS = {
  name: "PrimeCart",
  status: "a business based in Ghana. Its business registration is in progress; we'll add the registration number here once it's issued",
  address: "No. 3 Nickel Cl, Ofankor, Accra, Ghana",
  phone: "+233 55 836 0280",
  phoneHref: "tel:+233558360280",
} as const;

/**
 * The Terms' version: the date they last changed (ISO, so it sorts). Stored
 * with each merchant's acceptance. Change it, and the date on /terms with it,
 * whenever the Terms change.
 */
export const TERMS_VERSION = "2026-11-26";

/** "26 November 2026", for the page. */
export function formatLegalDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
