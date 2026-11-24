"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { checkout } from "@/app/store/[subdomain]/cart/actions";
import { getDashboardOrigin } from "@/lib/domain";
import { formatGhs } from "@/lib/format";
import { addGhs, deliveryAmountText, type DeliveryOption } from "@/lib/orders/delivery";
import { cartTotal, useCartStore } from "@/lib/storefront/cart";
import { useIsClient } from "@/lib/use-is-client";

type StockMap = Record<string, { price: number; stock: number }>;

const inputClass =
  "w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-[15px] outline-none focus:border-neutral-900";

/**
 * Cart and guest checkout.
 *
 * Customers check out as guests — there are no shopper accounts at MVP.
 *
 * Cart lines are localStorage and can be days old, so on mount the current
 * catalogue is fetched and every line reconciled against it. A shopper should
 * find out that something sold out here, not after paying. That reconciliation
 * is purely informational, though — the `checkout` action re-derives price and
 * stock from the database again regardless, so nothing here is trusted.
 *
 * The settings passed in come from a cached page, so they are
 * refreshed when the cart opens and again at "Proceed to checkout".
 *
 * `paymentsEnabled` (D-18a) only picks the labels: "Pay now" through
 * Paystack, or "Place order" with payment arranged on WhatsApp. The server
 * action decides the real path from the database, and either way returns a
 * URL to go to next (Paystack, or the order page).
 */
export function CartView({
  subdomain,
  storeName,
  paymentsEnabled: initialPaymentsEnabled,
  deliveryOptions,
  returnsPolicy: initialReturnsPolicy,
  closed: initialClosed,
}: {
  subdomain: string;
  storeName: string;
  paymentsEnabled: boolean;
  deliveryOptions: DeliveryOption[];
  returnsPolicy: string | null;
  closed: boolean;
}) {
  const useStore = useCartStore(subdomain);
  const lines = useStore((state) => state.lines);
  const setQuantity = useStore((state) => state.setQuantity);
  const remove = useStore((state) => state.remove);
  const clear = useStore((state) => state.clear);
  const closeCart = useStore((state) => state.closeCart);

  const isClient = useIsClient();
  const [live, setLive] = useState<StockMap | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // The checkout form only appears once the shopper deliberately confirms
  // they want to proceed, rather than sitting there the moment the cart
  // opens — a cart with items in it isn't necessarily a decision to check out.
  const [checkingOut, setCheckingOut] = useState(false);

  // All replaced by the server's current values, here and by checkout.
  const [paymentsEnabled, setPaymentsEnabled] = useState(initialPaymentsEnabled);
  const [options, setOptions] = useState(deliveryOptions);
  const [returnsPolicy, setReturnsPolicy] = useState(initialReturnsPolicy);
  const [closed, setClosed] = useState(initialClosed);
  const [chosenId, setChosenId] = useState("");
  const delivery =
    options.length === 1
      ? options[0]
      : (options.find((option) => option.id === chosenId) ?? null);
  const isPickup = delivery?.kind === "PICKUP";

  const ids = {
    delivery: useId(),
    name: useId(),
    phone: useId(),
    email: useId(),
    address: useId(),
    city: useId(),
    region: useId(),
    notes: useId(),
  };

  // Reconcile against what the shop currently says.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/products");
        if (!response.ok) return;
        const data = await response.json();

        const map: StockMap = {};
        for (const product of data.products) {
          for (const variant of product.variants) {
            map[variant.id] = { price: variant.price, stock: variant.stock };
          }
        }
        if (!cancelled) setLive(map);
      } catch {
        // Offline or the shop is unreachable — the cart still renders from
        // what it knows, and the server revalidates at order time anyway.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/checkout-settings", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        setPaymentsEnabled(data.paymentsEnabled);
        setOptions(data.deliveryOptions);
        setReturnsPolicy(data.returnsPolicy);
        setClosed(data.closed);
      } catch {
        // Checkout compares against the live settings anyway.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [checkingOut]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const data = new FormData(event.currentTarget);

    try {
      const result = await checkout(subdomain, {
        lines: lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          customization: line.customization,
        })),
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        phone: String(data.get("phone") ?? ""),
        address: String(data.get("address") ?? ""),
        city: String(data.get("city") ?? ""),
        region: String(data.get("region") ?? "") || undefined,
        notes: String(data.get("notes") ?? "") || undefined,
        deliveryOptionId: delivery?.id,
        shownDeliveryFee: delivery?.fee,
        shownPaymentsEnabled: paymentsEnabled,
      });

      if (!result.ok) {
        setFormError(result.error);
        if (result.deliveryOptions) setOptions(result.deliveryOptions);
        if (result.paymentsEnabled !== undefined) {
          setPaymentsEnabled(result.paymentsEnabled);
        }
        if (result.closed) setClosed(true);
        setSubmitting(false);
        return;
      }

      // The cart is now a real order. Clearing it stops a shopper who
      // abandons Paystack, or reloads the order page, from submitting the
      // same items again as a second order.
      clear();
      // A method call, not a property assignment: the React Compiler's
      // immutability check flags `window.location.href = …` as mutating a
      // value defined outside the component. `assign()` navigates identically
      // (and, like a normal link click, adds a history entry — appropriate
      // here since the shopper may use Back from Paystack).
      window.location.assign(result.redirectUrl);
    } catch {
      setFormError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (!isClient) {
    return <p className="text-[14px] text-neutral-500">Loading your cart…</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center">
        <p className="text-[15px] font-medium">Your cart is empty.</p>
        <Link
          href="/"
          onClick={closeCart}
          className="mt-4 inline-block rounded-full px-5 py-2.5 text-[13.5px] font-medium"
          style={{ background: "var(--brand)", color: "var(--on-brand)" }}
        >
          Start shopping
        </Link>
      </div>
    );
  }

  const itemsTotal = cartTotal(lines);
  const total = addGhs(itemsTotal, delivery?.fee ?? 0);
  const problems = lines.filter((line) => {
    const current = live?.[line.variantId];
    if (!current) return live !== null; // vanished from the catalogue
    return current.stock < line.quantity || current.price !== line.price;
  });
  const canSubmit = problems.length === 0 && !submitting;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200">
          {lines.map((line) => {
            const current = live?.[line.variantId];
            const gone = live !== null && !current;
            const short = current ? current.stock < line.quantity : false;
            const repriced = current ? current.price !== line.price : false;

            return (
              <div key={line.lineKey} className="flex gap-4 p-4">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                  {line.imageUrl ? (
                    <Image
                      src={line.imageUrl}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">{line.productName}</p>
                  <p className="text-[12.5px] text-neutral-500">
                    {line.variantName}
                  </p>
                  {line.customization && (
                    <p className="mt-0.5 text-[12.5px] text-neutral-600">
                      {line.customizationLabel ?? "Personalisation"}:{" "}
                      &ldquo;{line.customization}&rdquo;
                    </p>
                  )}

                  <p className="mt-1 text-[13.5px]">
                    {formatGhs(
                      (current?.price ?? line.price) +
                        (line.customizationFee ?? 0)
                    )}
                    {repriced && (
                      <span className="ml-2 text-[12px] text-neutral-500">
                        price changed from {formatGhs(line.price)}
                      </span>
                    )}
                  </p>

                  {gone && (
                    <p className="mt-1 text-[12.5px] text-red-600">
                      No longer available — remove it to continue.
                    </p>
                  )}
                  {short && current && (
                    <p className="mt-1 text-[12.5px] text-red-600">
                      Only {current.stock} left. Reduce the quantity to
                      continue.
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center rounded-lg border border-neutral-300">
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(line.lineKey, line.quantity - 1)
                        }
                        aria-label="Less"
                        className="px-2.5 py-1 text-[14px]"
                      >
                        −
                      </button>
                      <span className="min-w-7 text-center font-mono text-[13px] tabular-nums">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(line.lineKey, line.quantity + 1)
                        }
                        aria-label="More"
                        disabled={current ? line.quantity >= current.stock : false}
                        className="px-2.5 py-1 text-[14px] disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(line.lineKey)}
                      className="text-[12.5px] text-neutral-500 underline underline-offset-4 hover:text-neutral-900"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <p className="text-[14px] font-medium tabular-nums">
                  {formatGhs(
                    ((current?.price ?? line.price) +
                      (line.customizationFee ?? 0)) *
                      line.quantity
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* checkout */}
      <div>
        <div className="rounded-2xl border border-neutral-200 p-6">
          {checkingOut && delivery && (
            <div className="mb-3 space-y-1.5 border-b border-neutral-200 pb-3 text-[13.5px] text-neutral-600">
              <div className="flex justify-between gap-3">
                <span>Items</span>
                <span className="tabular-nums">{formatGhs(itemsTotal)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>{isPickup ? "Pickup" : "Delivery"}</span>
                <span className="tabular-nums">
                  {deliveryAmountText(
                    delivery.kind === "QUOTE" ? null : delivery.fee,
                    formatGhs
                  )}
                </span>
              </div>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-[14px] text-neutral-600">Total</span>
            <span className="text-xl font-semibold tabular-nums">
              {formatGhs(total)}
            </span>
          </div>

          {closed ? (
            <p className="mt-6 rounded-xl bg-neutral-50 px-4 py-3 text-[13px] leading-relaxed text-neutral-700">
              {storeName} isn&rsquo;t taking new orders right now. Please check
              back later.
            </p>
          ) : !checkingOut ? (
            <>
              <button
                type="button"
                disabled={problems.length > 0}
                onClick={() => setCheckingOut(true)}
                className="mt-6 w-full rounded-xl px-6 py-3 text-[14px] font-medium disabled:opacity-60"
                style={{ background: "var(--brand)", color: "var(--on-brand)" }}
              >
                Proceed to checkout
              </button>

              {problems.length > 0 && (
                <p className="mt-3 text-[12.5px] text-red-600">
                  Fix the items flagged above before checking out.
                </p>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setCheckingOut(false)}
                className="mt-6 text-[13px] text-neutral-500 hover:text-neutral-900"
              >
                ← Back to cart
              </button>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor={ids.name} className="text-[13px] font-medium">
                Your name
              </label>
              <input id={ids.name} name="name" required className={`mt-1.5 ${inputClass}`} />
            </div>

            <div>
              <label htmlFor={ids.phone} className="text-[13px] font-medium">
                WhatsApp number
              </label>
              <input
                id={ids.phone}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="024 400 0000"
                className={`mt-1.5 ${inputClass}`}
              />
              <p className="mt-1 text-[12px] text-neutral-500">
                {storeName} will contact you here about your order.
              </p>
            </div>

            <div>
              <label htmlFor={ids.email} className="text-[13px] font-medium">
                Email
              </label>
              <input
                id={ids.email}
                name="email"
                type="email"
                required
                className={`mt-1.5 ${inputClass}`}
              />
              <p className="mt-1 text-[12px] text-neutral-500">
                {paymentsEnabled
                  ? "Your receipt goes here."
                  : "We'll send your order details here."}
              </p>
            </div>

            {options.length > 0 && (
              <div>
                <label htmlFor={ids.delivery} className="text-[13px] font-medium">
                  Delivery or pickup
                </label>
                <select
                  id={ids.delivery}
                  required
                  value={delivery?.id ?? ""}
                  onChange={(event) => setChosenId(event.target.value)}
                  className={`mt-1.5 bg-white ${inputClass}`}
                >
                  {options.length > 1 && (
                    <option value="" disabled>
                      Choose one
                    </option>
                  )}
                  {options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.kind === "QUOTE"
                        ? "Somewhere else: fee agreed on WhatsApp"
                        : `${option.name}: ${deliveryAmountText(option.fee, formatGhs)}`}
                    </option>
                  ))}
                </select>
                {isPickup && delivery.note && (
                  <p className="mt-1 text-[12px] text-neutral-500">{delivery.note}</p>
                )}
                {delivery?.kind === "QUOTE" && (
                  <p className="mt-1 text-[12px] text-neutral-500">
                    {storeName} will agree the delivery fee with you on WhatsApp.
                    It isn&rsquo;t included in this total.
                  </p>
                )}
              </div>
            )}

            {!isPickup && (
              <>
            <div>
              <label htmlFor={ids.address} className="text-[13px] font-medium">
                Delivery address
              </label>
              <input
                id={ids.address}
                name="address"
                required
                className={`mt-1.5 ${inputClass}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={ids.city} className="text-[13px] font-medium">
                  City
                </label>
                <input id={ids.city} name="city" required className={`mt-1.5 ${inputClass}`} />
              </div>
              <div>
                <label htmlFor={ids.region} className="text-[13px] font-medium">
                  Region
                </label>
                <input id={ids.region} name="region" className={`mt-1.5 ${inputClass}`} />
              </div>
            </div>
              </>
            )}

            <div>
              <label htmlFor={ids.notes} className="text-[13px] font-medium">
                Notes <span className="font-normal text-neutral-400">Optional</span>
              </label>
              <textarea
                id={ids.notes}
                name="notes"
                rows={2}
                placeholder="Landmark, delivery instructions"
                className={`mt-1.5 ${inputClass}`}
              />
            </div>

            {formError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
                {formError}
              </p>
            )}

            {/* Read here rather than on its own page, so the form isn't lost. */}
            {returnsPolicy && (
              <details className="rounded-xl border border-neutral-200 px-4 py-3 text-[13px] text-neutral-700">
                <summary className="cursor-pointer font-medium">
                  Returns and refunds policy
                </summary>
                <p className="mt-2 max-h-60 overflow-y-auto leading-relaxed wrap-anywhere whitespace-pre-line">
                  {returnsPolicy}
                </p>
              </details>
            )}

            {!paymentsEnabled && (
              <p className="rounded-xl bg-neutral-50 px-4 py-3 text-[13px] leading-relaxed text-neutral-700">
                You won&rsquo;t pay now. {storeName} will contact you on
                WhatsApp to confirm your order and arrange payment.
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl px-6 py-3 text-[14px] font-medium disabled:opacity-60"
              style={{ background: "var(--brand)", color: "var(--on-brand)" }}
            >
              {paymentsEnabled
                ? submitting
                  ? "Starting payment…"
                  : `Pay now · ${formatGhs(total)}`
                : submitting
                  ? "Placing order…"
                  : "Place order"}
            </button>

            {problems.length > 0 && (
              <p className="text-[12.5px] text-red-600">
                Fix the items flagged above before continuing.
              </p>
            )}

            {paymentsEnabled && (
              <p className="text-center text-[12px] text-neutral-500">
                You will pay securely on Paystack. Nothing is charged until you
                confirm there.
              </p>
            )}

            <p className="text-center text-[12px] leading-relaxed text-neutral-500">
              {storeName} is the seller and handles delivery, returns and
              refunds. By placing this order, you agree that they may contact
              you on WhatsApp about it.{" "}
              <a
                href={`${getDashboardOrigin()}/terms`}
                target="_blank"
                rel="noopener"
                className="underline underline-offset-2 hover:text-neutral-900"
              >
                Terms
              </a>{" "}
              ·{" "}
              <a
                href={`${getDashboardOrigin()}/privacy`}
                target="_blank"
                rel="noopener"
                className="underline underline-offset-2 hover:text-neutral-900"
              >
                Privacy
              </a>
            </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
