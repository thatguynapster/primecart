"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Chooses which of the product's photos belong to one option.
 *
 * These are references, not uploads — the photos are owned by the product, so
 * the same shot can back several options without being uploaded twice.
 *
 * Selecting none is a deliberate, meaningful state: the option falls back to
 * showing all of the product's photos, which is the right behaviour when the
 * options are sizes rather than colours.
 */
export function VariantImageSelect({
  productImages,
  selected,
  name = "imageUrls",
}: {
  productImages: string[];
  selected: string[];
  name?: string;
}) {
  const [chosen, setChosen] = useState<string[]>(selected);

  if (productImages.length === 0) {
    return (
      <p className="text-sm text-nk-neutral-500">
        Add photos to this product first, then you can pick which ones belong to
        each option.
      </p>
    );
  }

  function toggle(url: string) {
    setChosen((current) =>
      current.includes(url)
        ? current.filter((item) => item !== url)
        : [...current, url]
    );
  }

  return (
    <div>
      {/* The action reads these; unchecked photos simply are not submitted. */}
      {chosen.map((url) => (
        <input key={url} type="hidden" name={name} value={url} />
      ))}

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {productImages.map((url) => {
          const isChosen = chosen.includes(url);
          return (
            <button
              key={url}
              type="button"
              onClick={() => toggle(url)}
              aria-pressed={isChosen}
              className={
                isChosen
                  ? "relative aspect-square overflow-hidden rounded-sm ring-2 ring-nk-accent"
                  : "relative aspect-square overflow-hidden rounded-sm opacity-60 ring-1 ring-nk-neutral-800 transition-opacity hover:opacity-100"
              }
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
              {isChosen && (
                <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-md border border-nk-accent bg-transparent text-xs leading-none text-nk-accent">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-sm text-nk-neutral-500">
        {chosen.length === 0
          ? "None picked — this option shows all the product's photos."
          : `${chosen.length} of ${productImages.length} picked.`}
      </p>
    </div>
  );
}
