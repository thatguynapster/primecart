import Link from "next/link";

import { LegalPage, supportEmail } from "@/components/site/legal-page";

export const metadata = {
  title: "Privacy Policy — PrimeCart",
  description: "What PrimeCart collects from merchants and shoppers, why, and your choices.",
};

/**
 * DRAFT. Needs review by someone qualified before it's relied on
 * (docs/TASKS.md 18.14). Every statement describes what the code does today:
 * update this page when that changes. No pricing or founding terms here.
 */
export default function PrivacyPage() {
  const email = supportEmail();

  return (
    <LegalPage title="Privacy Policy" updated="24 November 2026">
      <p>
        PrimeCart is software for shops in Ghana: an online storefront, plus
        tools for stock, orders, profit and customer records. This policy
        explains what personal data we handle, why, and what you can ask us to
        do about it. It follows Ghana&rsquo;s Data Protection Act, 2012 (Act
        843).
      </p>

      <h2>1. Who this covers</h2>
      <ul>
        <li><strong>Merchants</strong>: people who create or run a shop on PrimeCart.</li>
        <li><strong>Shoppers</strong>: people who visit or order from a shop on PrimeCart.</li>
        <li><strong>Visitors</strong> to our own website.</li>
      </ul>

      <h2>2. Who is responsible for your data</h2>
      <ul>
        <li>For <strong>merchant accounts</strong>, our website and keeping the service secure, PrimeCart decides how data is used and is responsible for it.</li>
        <li>For <strong>orders and customer records</strong>, the shop you ordered from decides how they&rsquo;re used. PrimeCart stores and processes them for that shop.</li>
      </ul>

      <h2>3. What we collect from merchants</h2>
      <ul>
        <li>Your name, email address and sign-in details. Sign-in is handled by Clerk: we never see your password.</li>
        <li>Your shop: name, web address, description, logo, photos, colours, social links, WhatsApp number, delivery areas and fees.</li>
        <li>Your business records: products, stock, prices, costs, orders, and the customers you add.</li>
        <li>If you switch on online checkout: your bank or mobile money account, which we pass to Paystack. We keep Paystack&rsquo;s reference for it, and show you the account by asking Paystack.</li>
        <li>Your subscription payments: amount, date, period and payment method. Paystack handles your card or mobile money details.</li>
      </ul>
      <p>
        Your shop name, description, photos, WhatsApp number, social links and
        delivery fees are <strong>public</strong>, because shoppers need them.
        Photos you upload are resized in your browser, which also removes
        location and camera details from them.
      </p>

      <h2>4. What we collect from shoppers</h2>
      <p>When you place an order, we collect this on the shop&rsquo;s behalf:</p>
      <ul>
        <li>Your name, email address, WhatsApp number, and delivery address unless you&rsquo;re collecting the order.</li>
        <li>What you ordered, any personalisation and notes, and the delivery option you chose.</li>
        <li>Whether and how you paid. If you pay online, Paystack takes the payment: we never see your card number or mobile money PIN.</li>
      </ul>
      <p>
        You don&rsquo;t need an account. Your order page can be opened by
        anyone who has its link, so share that link with care.
      </p>
      <p>
        <strong>The shop may contact you on WhatsApp</strong> about your order,
        to confirm it and to arrange payment and delivery. You agree to this
        when you place an order.
      </p>

      <h2>5. What we collect automatically</h2>
      <ul>
        <li><strong>To stop fake orders:</strong> a scrambled form of your phone number and IP address, kept for up to about a day.</li>
        <li><strong>Server logs:</strong> our hosting provider records requests, such as IP address, browser type and the page asked for, to run and protect the service.</li>
        <li><strong>In your browser:</strong> your cart is kept on your own device until you order or clear it.</li>
        <li><strong>Cookies:</strong> only those needed for merchants to sign in and stay secure. We don&rsquo;t use advertising or analytics cookies.</li>
      </ul>

      <h2>6. Why we use it</h2>
      <ul>
        <li><strong>To provide the service you or the shop asked for:</strong> running shops, taking and showing orders, payments and payouts, and sending order and billing emails.</li>
        <li><strong>To keep it safe and working:</strong> preventing fraud and abuse, fixing faults and keeping backups.</li>
        <li><strong>To support merchants:</strong> answering questions and contacting shops that may be stuck or inactive.</li>
        <li><strong>To meet legal duties:</strong> such as tax and accounting records, or a lawful request.</li>
      </ul>
      <p>
        We don&rsquo;t sell personal data. We don&rsquo;t use shoppers&rsquo;
        details for our own marketing, and we don&rsquo;t make decisions about
        you by automated means alone, other than limiting how quickly orders
        can be placed.
      </p>

      <h2>7. Who we share it with</h2>
      <p>The shop you order from sees your order. These companies process data for us:</p>
      <ul>
        <li><strong>Clerk</strong>: merchant sign-in.</li>
        <li><strong>Paystack</strong>: payments, receipts and merchant payouts.</li>
        <li><strong>MongoDB Atlas</strong>: our database.</li>
        <li><strong>Cloudflare</strong>: shop images, and private database backups.</li>
        <li><strong>GitHub</strong>: runs our daily backup. The backup itself isn&rsquo;t stored there.</li>
        <li><strong>Resend</strong>: sending emails.</li>
        <li><strong>Vercel</strong>: hosting.</li>
      </ul>
      <p>
        WhatsApp buttons open WhatsApp with a message already written. If you
        send it, WhatsApp&rsquo;s own privacy policy applies. We may also share
        data where the law requires it, to protect people from harm or fraud,
        or with a buyer if PrimeCart is sold, under this same policy.
      </p>

      <h2>8. Data outside Ghana</h2>
      <p>
        Some of these companies store data in other countries. We use
        established providers and their data-protection terms, and share only
        what each one needs.
      </p>

      <h2>9. How long we keep it</h2>
      <ul>
        <li><strong>Merchant accounts and shops:</strong> while the account is open, then until it is deleted at your request or no longer needed, apart from records the law requires us to keep.</li>
        <li><strong>Orders and customers:</strong> for as long as the shop needs them as business records.</li>
        <li><strong>Scrambled phone numbers and IP addresses:</strong> up to about a day.</li>
        <li><strong>Emails that fail to send:</strong> up to about a day while we retry, then removed from our database.</li>
        <li><strong>Database backups:</strong> deleted after 60 days. Deleted data can remain in a backup until then.</li>
      </ul>

      <h2>10. How we protect it</h2>
      <p>
        Connections are encrypted, access to our systems is limited, each
        shop&rsquo;s data is kept separate from other shops&rsquo;, and backups
        are private. No service is perfectly secure. If a breach puts your
        data at risk, we&rsquo;ll tell the Data Protection Commission and the
        people affected as soon as we reasonably can.
      </p>

      <h2>11. Your rights</h2>
      <p>You can ask to:</p>
      <ul>
        <li>know what personal data we hold about you and get a copy;</li>
        <li>have it corrected or deleted;</li>
        <li>stop or limit how it&rsquo;s used, or withdraw a consent you gave.</li>
      </ul>
      <p>
        Email <a href={`mailto:${email}`}>{email}</a>. We may need to confirm
        who you are, and may keep what the law requires. If your request is
        about an order, we may pass it to the shop, and you can also ask the
        shop directly. If you&rsquo;re not happy with our answer, you can
        complain to Ghana&rsquo;s Data Protection Commission.
      </p>

      <h2>12. Children</h2>
      <p>
        PrimeCart accounts are for people aged 18 and over. We don&rsquo;t
        knowingly collect children&rsquo;s data. If you think we have, email
        us.
      </p>

      <h2>13. Changes</h2>
      <p>
        If we change this policy in a way that matters, we&rsquo;ll update the
        date above and email merchants before it applies.
      </p>

      <h2>Contact</h2>
      <p>
        PrimeCart, Accra, Ghana. <a href={`mailto:${email}`}>{email}</a>. See
        also our <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}
