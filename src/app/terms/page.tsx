import Link from "next/link";

import { BusinessDetails, LegalPage } from "@/components/site/legal-page";
import { BUSINESS, TERMS_VERSION, formatLegalDate } from "@/lib/legal";

export const metadata = {
  title: "Terms of Service — PrimeCart",
  description: "The terms for running a shop on PrimeCart, and for ordering from one.",
};

/**
 * DRAFT. Needs review by someone qualified before it's relied on
 * (docs/TASKS.md 18.14). Refunds and disputes are between
 * merchant and shopper only; PrimeCart takes no part (D-23). No
 * founding terms here, by design: those are agreed privately.
 */
export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={formatLegalDate(TERMS_VERSION)}>
      <p>
        These terms are an agreement between you and {BUSINESS.name}, of{" "}
        {BUSINESS.address} (&ldquo;we&rdquo;). Our full details are at the end. Sections 1 to 12 and 14 to 17 are for{" "}
        <strong>merchants</strong>. Section 13 is for <strong>shoppers</strong>.
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
        PrimeCart gives you tools to manage your inventory, orders, profit and
        customer records, plus an online storefront. <strong>You
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
        <li>By paying, you ask us to start the time you&rsquo;ve paid for straight away, and you agree it starts as soon as your payment is confirmed. If your trial or a paid period is still running, it starts when that ends.</li>
        <li>You can cancel at any time by not paying for another period. You keep full use of PrimeCart until the period you&rsquo;ve paid for ends, then section 5 applies.</li>
        <li><strong>Subscription payments aren&rsquo;t refunded</strong>, in full or in part, including when you cancel or stop using PrimeCart before your period ends. The only exceptions are in section 16, and any refund the law gives you a right to.</li>
        <li>We may change prices for future periods. Time you&rsquo;ve already paid for isn&rsquo;t affected.</li>
      </ul>

      <h2>5. If your subscription lapses</h2>
      <p>For 7 days after your trial or paid time runs out:</p>
      <ul>
        <li>Your storefront stays online and keeps taking orders, so you must still fulfil them.</li>
        <li>Your dashboard opens on the billing page first and is read-only. You can view it, handle existing orders, switch online checkout off and update your payout details.</li>
      </ul>
      <p>After those 7 days, until you pay again:</p>
      <ul>
        <li>Your storefront doesn&rsquo;t take new orders. Shoppers can still view it until <strong>10 days</strong> after your trial or paid time ran out.</li>
        <li>From then, your storefront is switched off and shows a message that it is no longer active. Shoppers who already ordered can still open their order page.</li>
        <li>You can&rsquo;t use your dashboard beyond the billing page. You&rsquo;re still responsible for orders already placed, including any payment a shopper completes for one, so handle them directly with the shopper.</li>
      </ul>

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
        <li><strong>Your returns and refunds policy is your own.</strong> It must follow the law, and you must tell shoppers about it clearly and honour it. You can publish it in Shop settings.</li>
        <li><strong>You handle every complaint, return, refund and dispute with the shopper yourself, from start to finish</strong>, and pay any refund straight to the shopper. This applies however they paid, including through online checkout.</li>
        <li><strong>PrimeCart takes no part in it.</strong> We don&rsquo;t join the conversation, mediate, decide who is right, hold money or pay refunds. We only give the shopper a way to reach you about their order.</li>
        <li>A shopper&rsquo;s bank, mobile money provider or Paystack may reverse a payment under its own rules. That is their decision, not ours. A reversed payment is your cost, and so is any charge for it: if Paystack takes either from us, you must pay us back.</li>
        <li>Payment charges aren&rsquo;t returned. You bear the 3% fee even if you refund the shopper or the payment is reversed.</li>
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
        <li>Your purchase is from <strong>the shop</strong>, not PrimeCart. The shop is responsible for the goods, delivery, returns and refunds. Read its returns policy before you order, or ask for it if the shop hasn&rsquo;t published one.</li>
        <li>An order without online payment isn&rsquo;t final until the shop confirms it.</li>
        <li>An order waiting for online payment is held for 24 hours. After that, the items go back on sale.</li>
        <li>Give correct contact and delivery details. You agree that the shop may contact you on WhatsApp about your order.</li>
        <li><strong>If something is wrong, take it up with the shop.</strong> Your order page lets you message the shop when it has given a WhatsApp number. The shop settles it with you directly. PrimeCart isn&rsquo;t part of that conversation, doesn&rsquo;t decide the outcome and doesn&rsquo;t pay refunds.</li>
        <li>Your legal rights as a consumer, and your rights with your bank or mobile money provider, aren&rsquo;t affected.</li>
      </ul>

      <h2>14. The service</h2>
      <ul>
        <li>We work to keep PrimeCart running and your data safe, with regular backups, but we can&rsquo;t promise it will never be interrupted or free of errors. Keep your own copy of records you can&rsquo;t afford to lose.</li>
        <li>We may improve, change or remove features.</li>
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
        You can cancel at any time, as section 4 explains. To close your shop and
        have your data deleted, email us. Closing it early ends your access
        and isn&rsquo;t refunded. If we close your account and you haven&rsquo;t
        broken these terms, we&rsquo;ll refund the part of your paid time you
        haven&rsquo;t used. We may keep records the law requires.
        You must still settle what you owe us, and your open orders and refunds with shoppers.
        Sections 9, 12, 15 and 17 continue to apply.
      </p>

      <h2>17. Changes, law and disagreements with us</h2>
      <ul>
        <li>If we change these terms in a way that matters, we&rsquo;ll email merchants at least 14 days before. If you don&rsquo;t agree, you can stop using PrimeCart before then.</li>
        <li>If you and PrimeCart disagree about something, we&rsquo;ll both try to settle it by talking first. These terms are governed by the laws of Ghana, and its courts can decide disputes.</li>
        <li>If one section can&rsquo;t be enforced, the rest still applies.</li>
        <li>Nothing in these terms takes away a right the law gives you that can&rsquo;t be excluded.</li>
      </ul>

      <h2>Who we are</h2>
      <BusinessDetails />
    </LegalPage>
  );
}
