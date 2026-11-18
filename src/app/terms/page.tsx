import Link from "next/link";

import { LegalPage, supportEmail } from "@/components/site/legal-page";

export const metadata = {
  title: "Terms of Service — PrimeCart",
  description: "The terms for running a shop on PrimeCart.",
};

/**
 * T14 — DRAFT. Needs review by someone qualified before it's relied on
 * (docs/TASKS.md 18.14). No founding terms here, by design: those are
 * agreed privately with each founding merchant.
 */
export default function TermsPage() {
  const email = supportEmail();

  return (
    <LegalPage title="Terms of Service" updated="18 November 2026">
      <p>
        These terms apply when you create a shop on PrimeCart
        (&ldquo;you&rdquo;, the merchant). By creating a shop you agree to
        them and to our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>1. Free trial</h2>
      <p>
        Every new shop gets one 14-day free trial with everything included.
        We don&rsquo;t ask for payment details to start it, and nothing is
        charged when it ends.
      </p>

      <h2>2. Subscription</h2>
      <ul>
        <li>After the trial, PrimeCart is a prepaid subscription, paid monthly, quarterly or yearly at the prices shown in your dashboard when you pay.</li>
        <li>Payments are one-off, by mobile money or card through Paystack. <strong>Nothing renews automatically.</strong> You choose when to pay for more time.</li>
        <li>Paying before your trial or current period ends adds the new time after it, so you don&rsquo;t lose any days.</li>
        <li>We don&rsquo;t refund partly used periods.</li>
        <li>We may change prices for future periods. Time you&rsquo;ve already paid for keeps the price you paid.</li>
      </ul>

      <h2>3. If your subscription lapses</h2>
      <p>
        If your trial or paid time runs out, your dashboard becomes read-only
        until you pay again, apart from billing and handling existing orders
        (confirming, marking paid, cancelling). Your storefront stays online
        and keeps taking orders and payments. We don&rsquo;t take shops down
        automatically.
      </p>

      <h2>4. Online checkout (optional)</h2>
      <ul>
        <li>Online checkout is off unless you switch it on. While it&rsquo;s off, shoppers place orders without paying and you arrange payment with them directly. PrimeCart charges no fee on those orders.</li>
        <li>When it&rsquo;s on, shoppers pay by mobile money or card through Paystack. PrimeCart keeps <strong>3% of each order paid online</strong>, and that includes Paystack&rsquo;s payment fees. The rest is paid out to the account you gave us, normally the next working day, on Paystack&rsquo;s schedule.</li>
        <li>Switching on requires a payout account that Paystack accepts. You must give accurate payout details.</li>
      </ul>

      <h2>5. Your responsibilities</h2>
      <ul>
        <li>You are the seller. You&rsquo;re responsible for your products, their descriptions and prices, delivery, and any returns or refunds to your shoppers.</li>
        <li>You&rsquo;re responsible for handling your shoppers&rsquo; personal data properly, including only contacting them on WhatsApp about their orders.</li>
        <li>You&rsquo;re responsible for your own taxes.</li>
        <li>Keep your sign-in details secure. You&rsquo;re responsible for what happens under your account.</li>
      </ul>

      <h2>6. Acceptable use</h2>
      <p>You must not use PrimeCart to:</p>
      <ul>
        <li>sell anything illegal in Ghana, counterfeit, stolen or dangerous;</li>
        <li>mislead or defraud shoppers;</li>
        <li>send spam or contact people who haven&rsquo;t ordered from you;</li>
        <li>interfere with the service or other merchants&rsquo; shops.</li>
      </ul>
      <p>
        If you do, we may suspend online checkout or your account. Where we
        reasonably can, we&rsquo;ll tell you first and give you a chance to
        fix it.
      </p>

      <h2>7. The service</h2>
      <p>
        We work to keep PrimeCart running and your data safe, including
        regular backups, but we can&rsquo;t promise it will never be
        interrupted. To the extent the law allows, we aren&rsquo;t liable for
        indirect losses such as lost sales or profits, and our total
        liability to you is limited to what you paid us in the 12 months
        before the claim.
      </p>

      <h2>8. Closing your account</h2>
      <p>
        You can stop using PrimeCart at any time by not renewing. To have
        your account and data deleted, email us. We may close accounts that
        break these terms.
      </p>

      <h2>9. Changes and law</h2>
      <p>
        We may update these terms. If a change matters, we&rsquo;ll email you
        before it applies. These terms are governed by the laws of Ghana.
      </p>

      <h2>Contact</h2>
      <p>
        PrimeCart, Accra, Ghana. <a href={`mailto:${email}`}>{email}</a>
      </p>
    </LegalPage>
  );
}
