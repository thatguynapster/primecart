"use client";

import { useState } from "react";
import {
  ArrowSquareOut,
  Check,
  Copy,
  Storefront,
} from "@phosphor-icons/react/dist/ssr";

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
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="hidden items-center gap-0.5 rounded-md border border-nk-neutral-800 bg-nk-surface pr-1 pl-2 md:flex">
      <a
        href={shopUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 py-1.5 text-xs text-nk-neutral-300 hover:text-nk-text"
        title="Open your shop in a new tab"
      >
        <Storefront size={14} className="flex-none opacity-60" />
        <span className="max-w-32.5 truncate">{label}</span>
        <ArrowSquareOut size={12} className="flex-none opacity-50" />
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
