"use client";

import { useState } from "react";
import {
  ArrowSquareOut,
  Check,
  Copy,
  Storefront,
} from "@phosphor-icons/react/dist/ssr";

import { markShopShared } from "@/app/(app)/dashboard/setup-actions";

/**
 * Top-bar shortcut to the merchant's live storefront: opens it in a new tab,
 * and copies the link so it can be dropped straight into WhatsApp/Instagram
 * without retyping the address.
 */
export function ShopLink({ shopUrl, label }: { shopUrl: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(shopUrl);
    setCopied(true);
    // Ticks "Share your shop" on the first-day checklist.
    void markShopShared().catch(() => {});
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex flex-none items-center gap-0.5 rounded-md border border-nk-neutral-800 bg-nk-surface px-1 md:pl-2">
      <a
        href={shopUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open your shop in a new tab"
        className="flex items-center gap-1.5 p-1.5 text-xs md:px-0 text-nk-neutral-300 hover:text-nk-text"
        title="Open your shop in a new tab"
      >
        <Storefront size={14} className="flex-none opacity-60" />
        <span className="hidden max-w-32.5 truncate md:inline">{label}</span>
        <ArrowSquareOut size={12} className="hidden flex-none opacity-50 md:inline" />
      </a>

      <button
        type="button"
        onClick={copy}
        className="flex-none rounded p-1.5 text-nk-neutral-500 transition-colors hover:bg-nk-text/7 hover:text-nk-text"
        title="Copy shop link"
      >
        {copied ? (
          <Check size={13} className="text-nk-accent-300" />
        ) : (
          <Copy size={13} />
        )}
        <span className="sr-only">{copied ? "Copied" : "Copy shop link"}</span>
      </button>
    </div>
  );
}
