"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";

/**
 * Single-image file input with a live preview of what's been chosen, before
 * anything is uploaded — the same "see it before you submit" pattern
 * `PhotoPicker` already gives the product-photo picker, generalised for the
 * dashboard's other single-image slots (shop logo, hero, mid-page banner).
 *
 * This component only ever picks a file into the named form field — where
 * that field's containing `<form>` submits to (and which R2 folder the
 * server action behind it uploads into: `logos/`, `hero/`, `banner/`, …) is
 * entirely up to the caller. It has no opinion about upload destinations.
 */
export function ImagePicker({
  name,
  currentUrl,
  shape = "square",
  accept = "image/jpeg,image/png,image/webp",
}: {
  name: string;
  currentUrl: string | null;
  /** "square" for a logo-style thumbnail; "wide" for a hero/banner-style frame. */
  shape?: "square" | "wide";
  accept?: string;
}) {
  const inputId = useId();
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);

  // The blob: URL holds its file in memory until revoked.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(file ? { file, url: URL.createObjectURL(file) } : null);
  }

  const frameClass =
    shape === "square"
      ? "size-16 flex-none rounded-md"
      : "h-17 w-30 flex-none rounded-md";

  const displayUrl = preview?.url ?? currentUrl;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        className={`overflow-hidden border border-nk-neutral-800 bg-nk-neutral-900 ${frameClass}`}
      >
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt=""
            width={shape === "square" ? 64 : 120}
            height={shape === "square" ? 64 : 68}
            // Local picks are blob: URLs — Next's image loader can't optimize
            // those, only render them as-is.
            unoptimized={Boolean(preview)}
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center text-xs text-nk-neutral-600">
            None yet
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="w-fit cursor-pointer rounded-md border border-nk-neutral-800 bg-transparent px-4 py-2.5 text-sm font-medium transition-colors hover:bg-nk-text/7"
        >
          {currentUrl || preview ? "Choose a different image" : "Choose image"}
        </label>
        <input
          id={inputId}
          name={name}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
        {preview && (
          <p className="text-sm text-nk-neutral-500">
            {preview.file.name} — not uploaded yet.
          </p>
        )}
      </div>
    </div>
  );
}
