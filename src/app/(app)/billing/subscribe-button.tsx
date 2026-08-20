"use client";

import { useState } from "react";

import { startSubscriptionCheckout } from "./actions";

export function SubscribeButton({ label }: { label: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);

    const result = await startSubscriptionCheckout();
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }

    // A method call, not a property assignment — the React Compiler's
    // immutability check flags `window.location.href = …` (established in
    // the storefront checkout, cart-view.tsx).
    window.location.assign(result.redirectUrl);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="w-full rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {pending ? "Starting checkout…" : label}
      </button>
      {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
    </div>
  );
}
