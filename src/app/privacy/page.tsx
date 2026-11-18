import { LegalPage, supportEmail } from "@/components/site/legal-page";

export const metadata = {
  title: "Privacy Policy — PrimeCart",
  description: "What PrimeCart collects from merchants and their customers, and why.",
};

/**
 * T14 — DRAFT. Needs review by someone qualified before it's relied on
 * (docs/TASKS.md 18.14). No pricing or founding terms here, by design.
 */
export default function PrivacyPage() {
  const email = supportEmail();

  return (
    <LegalPage title="Privacy Policy" updated="18 November 2026">
      <p>
        PrimeCart is software for shops in Ghana: an online storefront plus
        tools for stock, orders, profit and customer records. This policy
        explains what personal data we handle, why, and what you can ask us
        to do about it. It covers two groups of people: <strong>merchants</strong>{" "}
        who run a shop on PrimeCart, and <strong>shoppers</strong> who order
        from those shops.
      </p>

      <h2>What we collect from merchants</h2>
      <ul>
        <li>Your name, email address and sign-in details (handled by our login provider, Clerk).</li>
        <li>Your shop details: business name, shop address, logo, images, description and social links.</li>
        <li>
          If you switch on online checkout: your payout bank or mobile money
          account, which we pass to Paystack to create your payout account.
          We don&rsquo;t keep your full account details ourselves.
        </li>
        <li>Your products, stock, prices, costs, orders and customer records you enter.</li>
        <li>Your subscription payments (amount, date, period covered). Card and MoMo details are handled by Paystack, never by us.</li>
      </ul>

      <h2>What we collect from shoppers</h2>
      <p>When you order from a shop on PrimeCart, we collect on the shop&rsquo;s behalf:</p>
      <ul>
        <li>Your name, email address, WhatsApp number and delivery address.</li>
        <li>What you ordered, any personalisation you asked for, and any notes.</li>
        <li>Whether and how you paid. If you pay online, Paystack processes the payment; we never see your card or MoMo PIN.</li>
      </ul>
      <p>
        The shop you ordered from is responsible for your order. They see
        your details so they can fulfil it, and{" "}
        <strong>may contact you on WhatsApp</strong> to confirm your order and
        arrange payment and delivery. You agree to this when you place an
        order.
      </p>

      <h2>Why we use it</h2>
      <ul>
        <li>To run each merchant&rsquo;s shop and process their orders.</li>
        <li>To send order emails: new-order alerts to merchants, and payment reminders to shoppers.</li>
        <li>To take subscription payments and pay out online checkout sales to merchants.</li>
        <li>To keep the service secure, fix problems and prevent fraud.</li>
      </ul>
      <p>We don&rsquo;t sell personal data, and we don&rsquo;t use shoppers&rsquo; details for our own marketing.</p>

      <h2>Who processes it for us</h2>
      <ul>
        <li><strong>Clerk</strong>: merchant sign-in.</li>
        <li><strong>Paystack</strong>: payments and merchant payouts.</li>
        <li><strong>MongoDB Atlas</strong>: our database.</li>
        <li><strong>Cloudflare R2</strong>: shop images, and encrypted-at-rest database backups.</li>
        <li><strong>Resend</strong>: sending emails.</li>
        <li><strong>Vercel</strong>: hosting the website.</li>
      </ul>
      <p>Some of these providers store data outside Ghana. We use them under their standard data-processing terms.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Merchant accounts and their shop data: while the account exists, and for a reasonable period after it closes so records like orders and tax figures stay available.</li>
        <li>Order and customer records: as long as the merchant keeps them, since they&rsquo;re the merchant&rsquo;s business records.</li>
        <li>Database backups: deleted automatically after 60 days.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        Under Ghana&rsquo;s Data Protection Act, 2012 (Act 843), you can ask
        to see the personal data held about you, have it corrected, or have
        it deleted. Shoppers can also ask the shop they ordered from directly.
        To make a request, email <a href={`mailto:${email}`}>{email}</a>. We
        may need to confirm who you are first, and we may keep records the
        law requires us to keep.
      </p>

      <h2>Changes</h2>
      <p>If we change this policy in a way that matters, we&rsquo;ll update the date above and tell merchants by email.</p>

      <h2>Contact</h2>
      <p>
        PrimeCart, Accra, Ghana. <a href={`mailto:${email}`}>{email}</a>
      </p>
    </LegalPage>
  );
}
