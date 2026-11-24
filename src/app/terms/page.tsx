import Link from "next/link";

import { LegalPage, supportEmail } from "@/components/site/legal-page";

export const metadata = {
  title: "Terms of Service — PrimeCart",
  description: "The terms for running a shop on PrimeCart, and for ordering from one.",
};

/**
 * DRAFT. Needs review by someone qualified before it's relied on
 * (docs/TASKS.md 18.14). Refunds to shoppers are the merchant's (D-23). No
 * founding terms here, by design: those are agreed privately.
 */
export default function TermsPage() {
  const email = supportEmail();

  return (
    <LegalPage title="Terms of Service" updated="24 November 2026">
      <p>
        These terms are an agreement between you and PrimeCart, Accra, Ghana
        (&ldquo;we&rdquo;). Parts 1 to 12 and 14 to 17 are for{" "}
        <strong>merchants</strong>. Part 13 is for <strong>shoppers</strong>.
        By creating a shop you agree to them and to our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>1. Your account</h2>
      <ul>
        <li>You must be at least 18 and able to enter a contract. If you act for a business, you confirm you&rsquo;re allowed to.</li>
        <li>Give accurate details, including a WhatsApp number your shoppers can reach.</li>
        <li>Keep your sign-in secure. You&rsquo;re responsible for what happens under your account. Tell us quickly if someone else gets in.</li>
      </ul>

      <h2>2. What PrimeCart is</h2>
      <p>
        PrimeCart gives you a storefront and tools to manage it. <strong>You
        are the seller.</strong> We aren&rsquo;t a party to the sale between
        you and a shopper, and we don&rsquo;t own, hold, check or deliver your
        goods.
      </p>

      <h2>3. Free trial</h2>
      <p>
        Each new shop gets one 14-day free trial with everything included. We
        don&rsquo;t ask for payment details to start it, and nothing is
        charged when it ends. One trial per business.
      </p>

      <h2>4. Subscription</h2>
      <ul>
        <li>After the trial, PrimeCart is a prepaid subscription, paid monthly, quarterly or yearly at the prices shown in your dashboard when you pay.</li>
        <li>Payments are one-off, by mobile money or card through Paystack. <strong>Nothing renews automatically.</strong></li>
        <li>Paying before your trial or current period ends adds the new time after it, so you don&rsquo;t lose any days.</li>
        <li>We don&rsquo;t refund partly used periods, unless the law requires it or we close your account without you having broken these terms.</li>
        <li>We may change prices for future periods. Time you&rsquo;ve already paid for isn&rsquo;t affected.</li>
      </ul>

      <h2>5. If your subscription lapses</h2>
      <p>
        If your trial or paid time runs out, your dashboard becomes read-only
        until you pay again. You can still use billing, handle existing orders,
        switch online checkout off and update your payout details. Your
        storefront stays online and keeps taking orders, so you must still
        fulfil them.
      </p>

      <h2>6. Orders without online checkout</h2>
      <p>
        Online checkout is off unless you switch it on. While it&rsquo;s off,
        shoppers place orders without paying, and you arrange payment with
        them directly. We charge no fee on those orders and take no part in
        those payments.
      </p>

      <h2>7. Online checkout (optional)</h2>
      <ul>
        <li>Shoppers pay by mobile money or card through Paystack. Paystack&rsquo;s own terms also apply.</li>
        <li>PrimeCart keeps <strong>3% of each payment</strong>, including any delivery fee in it. That covers Paystack&rsquo;s payment fees. The rest is paid to your payout account, normally the next working day, on Paystack&rsquo;s schedule.</li>
        <li>You need a payout account that Paystack accepts, and its details must be correct and yours to use. We can&rsquo;t recover money paid to wrong details you gave us.</li>
        <li>We may change the fee with at least 30 days&rsquo; notice by email. You can switch checkout off at any time.</li>
        <li>We or Paystack may delay or stop online payments for a shop where we reasonably suspect fraud, illegal sales or unusual risk.</li>
      </ul>

      <h2>8. Delivery</h2>
      <p>
        You set your own delivery areas and fees and make or arrange
        deliveries. Your fees must be what you really charge. A fee agreed on
        WhatsApp is between you and the shopper.
      </p>

      <h2>9. Returns, refunds and disputes</h2>
      <ul>
        <li><strong>Your returns and refunds policy is your own.</strong> It must follow the law, and you must tell shoppers about it clearly and honour it.</li>
        <li>You deal with shoppers&rsquo; complaints and pay any refund you owe.</li>
        <li>If an order was paid online, ask us to send the refund through Paystack. You must cover the amount refunded. Fees on the original payment may not be returned.</li>
        <li>If a shopper disputes an online payment with their bank or provider, you must send us proof of the order and delivery when we ask. If the dispute is lost, you owe us the disputed amount and any charge for it. We may take it from your future payouts where Paystack allows, or ask you to pay it.</li>
      </ul>

      <h2>10. Your responsibilities</h2>
      <ul>
        <li>Describe products, prices and stock honestly, and only sell what you&rsquo;re allowed to sell.</li>
        <li>Confirm and fulfil orders, or cancel them promptly.</li>
        <li>Handle shoppers&rsquo; personal data lawfully. Use it only for their orders, unless they agreed to more, and keep it safe.</li>
        <li>Get any licence or registration your business needs, and handle your own taxes. Reports in PrimeCart are a help, not tax or accounting advice.</li>
      </ul>

      <h2>11. Acceptable use</h2>
      <p>You must not use PrimeCart to:</p>
      <ul>
        <li>sell anything illegal in Ghana, counterfeit, stolen, unsafe, or that Paystack doesn&rsquo;t allow;</li>
        <li>mislead or defraud anyone, place fake orders or launder money;</li>
        <li>use words, photos or brands you have no right to use;</li>
        <li>send spam, or contact people who haven&rsquo;t ordered from you or agreed to hear from you;</li>
        <li>harm, overload, copy or break into the service or other shops.</li>
      </ul>
      <p>
        If you do, we may remove content, switch off online checkout, or
        suspend or close your account. Where we reasonably can, we&rsquo;ll
        tell you first and give you a chance to fix it.
      </p>

      <h2>12. Your content and ours</h2>
      <ul>
        <li>Your products, photos, records and customer lists stay yours. You let us store, resize, show and share them only to run and promote your own shop, for example in link previews.</li>
        <li>PrimeCart&rsquo;s software, name and design stay ours. You may use them only to run your shop.</li>
      </ul>

      <h2>13. If you order from a shop</h2>
      <ul>
        <li>Your purchase is from <strong>the shop</strong>, not PrimeCart. The shop is responsible for the goods, delivery, returns and refunds. Ask about its returns policy before you order.</li>
        <li>An order without online payment isn&rsquo;t final until the shop confirms it.</li>
        <li>An order waiting for online payment is held for 24 hours. After that, the items go back on sale.</li>
        <li>Give correct contact and delivery details. You agree that the shop may contact you on WhatsApp about your order.</li>
        <li>If a shop won&rsquo;t help, or you think it is acting unlawfully, email us. We can&rsquo;t decide every dispute, but we look into reports and can act under part 11. Your legal rights as a consumer aren&rsquo;t affected.</li>
      </ul>

      <h2>14. The service</h2>
      <ul>
        <li>We work to keep PrimeCart running and your data safe, with regular backups, but we can&rsquo;t promise it will never be interrupted or free of errors. Keep your own copy of records you can&rsquo;t afford to lose.</li>
        <li>We may improve, change or remove features. If we plan to stop PrimeCart altogether, we&rsquo;ll give you reasonable notice and a way to get your data.</li>
        <li>We rely on other companies, such as Paystack and our hosting provider. We aren&rsquo;t responsible for their failures beyond what the law requires.</li>
      </ul>

      <h2>15. Liability</h2>
      <ul>
        <li>To the extent the law allows, we aren&rsquo;t liable for indirect losses such as lost sales, profits or goodwill, or for what happens between you and a shopper.</li>
        <li>Our total liability to a merchant is limited to what you paid us in the 12 months before the claim.</li>
        <li>If someone makes a claim against us because of your goods, content or breach of these terms, you agree to cover our reasonable losses.</li>
        <li>Nothing here limits liability that the law doesn&rsquo;t allow to be limited, including for fraud.</li>
      </ul>

      <h2>16. Closing your account</h2>
      <p>
        You can stop at any time by not renewing. To close your shop and have
        your data deleted, email us. We may keep records the law requires.
        Money already owed, open orders and refunds still have to be settled.
        Parts 9, 12, 15 and 17 continue to apply.
      </p>

      <h2>17. Changes, law and disputes</h2>
      <ul>
        <li>If we change these terms in a way that matters, we&rsquo;ll email merchants at least 14 days before. If you don&rsquo;t agree, you can stop using PrimeCart before then.</li>
        <li>If we disagree about something, we&rsquo;ll both try to settle it by talking first. These terms are governed by the laws of Ghana, and its courts can decide disputes.</li>
        <li>If one part can&rsquo;t be enforced, the rest still applies.</li>
      </ul>

      <h2>Contact</h2>
      <p>
        PrimeCart, Accra, Ghana. <a href={`mailto:${email}`}>{email}</a>
      </p>
    </LegalPage>
  );
}
