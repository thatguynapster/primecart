"use client";

import Link from "next/link";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { useState, useTransition } from "react";

import {
  ButtonSecondary,
  Card,
  CardHeading,
  btnPrimary,
  btnSecondary,
} from "@/components/dashboard/nocturne/ui";
import type { ChecklistStep, ChecklistStepId } from "@/lib/onboarding/checklist";
import { hideSetupChecklist, markShopShared } from "./setup-actions";

const COPY: Record<ChecklistStepId, { title: string; body: string }> = {
  product: {
    title: "Add your first product",
    body: "It appears on your shop straight away.",
  },
  photo: {
    title: "Add a photo",
    body: "A clear photo is the first thing shoppers look at.",
  },
  whatsapp: {
    title: "Add your WhatsApp number",
    body: "So shoppers can message you about an order.",
  },
  delivery: {
    title: "Set your delivery areas",
    body: "Shoppers see the fee before they order. Or offer pickup.",
  },
  share: {
    title: "Share your shop",
    body: "Post the link on your WhatsApp status and in your groups.",
  },
};

/** What to do on day one, until it's done or hidden. */
export function SetupChecklist({
  steps,
  current,
  shopUrl,
  shopName,
  firstProductId,
}: {
  steps: ChecklistStep[];
  current: ChecklistStepId;
  shopUrl: string;
  shopName: string;
  firstProductId: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [hiding, startHiding] = useTransition();

  const done = steps.filter((step) => step.done).length;
  const links: Partial<Record<ChecklistStepId, { href: string; label: string }>> = {
    product: { href: "/dashboard/products/new", label: "Add product" },
    photo: {
      href: firstProductId ? `/dashboard/products/${firstProductId}` : "/dashboard/products/new",
      label: "Add photo",
    },
    whatsapp: { href: "/dashboard/settings#socials", label: "Add number" },
    delivery: { href: "/dashboard/settings#delivery", label: "Set areas" },
  };
  const shareHref = `https://wa.me/?text=${encodeURIComponent(
    `Shop ${shopName} online: ${shopUrl}`
  )}`;

  // Recording the share must never get in the way of sharing.
  const recordShare = () => void markShopShared().catch(() => {});

  async function copy() {
    try {
      await navigator.clipboard.writeText(shopUrl);
    } catch {
      return; // the link is on screen to copy by hand
    }
    setCopied(true);
    recordShare();
  }

  return (
    <Card className="px-5 py-4.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <CardHeading>Get your shop ready</CardHeading>
        <span className="text-xs text-nk-neutral-500">
          {done} of {steps.length} done
        </span>
      </div>

      <ul className="mt-3">
        {steps.map((step) => {
          const { title, body } = COPY[step.id];
          const link = links[step.id];
          const button = step.id === current ? btnPrimary("flex-none") : btnSecondary("flex-none");
          return (
            <li
              key={step.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-nk-neutral-800 py-3"
            >
              <span
                aria-hidden
                className={`grid size-5 flex-none place-items-center rounded-full border ${
                  step.done
                    ? "border-nk-accent-700 bg-nk-accent-800 text-nk-accent-100"
                    : "border-nk-neutral-700"
                }`}
              >
                {step.done && <Check size={11} weight="bold" />}
              </span>
              <div className="min-w-0 flex-1 basis-40">
                <p
                  className={`text-sm ${step.done ? "text-nk-neutral-500 line-through" : "font-medium"}`}
                >
                  {title}
                  {step.done && <span className="sr-only"> (done)</span>}
                </p>
                {!step.done && (
                  <p className="text-xs text-nk-neutral-500">
                    {body}
                    {step.id === "share" && (
                      <span className="block break-all text-nk-neutral-300">{shopUrl}</span>
                    )}
                  </p>
                )}
              </div>
              {!step.done && link && (
                <Link href={link.href} className={button}>
                  {link.label}
                </Link>
              )}
              {!step.done && step.id === "share" && (
                <div className="flex gap-2">
                  <a
                    href={shareHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={recordShare}
                    className={button}
                  >
                    Share on WhatsApp
                  </a>
                  <ButtonSecondary onClick={() => void copy()}>
                    {copied ? "Copied" : "Copy link"}
                  </ButtonSecondary>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        disabled={hiding}
        onClick={() => startHiding(() => hideSetupChecklist())}
        className="mt-1 py-1 text-xs text-nk-neutral-500 underline underline-offset-4 hover:text-nk-text disabled:opacity-50"
      >
        {hiding ? "Hiding…" : "Hide this list"}
      </button>
    </Card>
  );
}
