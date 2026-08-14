"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";

export type FramePhoto = {
  src: string;
  /** Shown under the image — a filename, or "Main photo". */
  caption?: string;
};

/**
 * Full-size preview for product photos.
 *
 * Takes plain `src` strings, so the same frame serves photos already uploaded
 * to R2 and `blob:` URLs for files the merchant has only just picked — the
 * point being that they can check a photo *before* committing to it.
 *
 * `next/image` cannot run its optimiser over a `blob:` URL, so those are passed
 * through unoptimised. Remote R2 URLs are optimised as normal.
 */
export function PhotoFrame({
  photos,
  index,
  onClose,
  onIndexChange,
}: {
  photos: FramePhoto[];
  /** null when closed. */
  index: number | null;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = index !== null && index >= 0 && index < photos.length;

  const step = useCallback(
    (delta: number) => {
      if (index === null) return;
      const next = (index + delta + photos.length) % photos.length;
      onIndexChange(next);
    },
    [index, photos.length, onIndexChange]
  );

  // Escape to close, arrows to move. Registered only while open so the page
  // behaves normally the rest of the time.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, step]);

  // Stop the page scrolling behind the overlay.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Move focus to the close button so keyboard and screen-reader users land
  // inside the dialog rather than behind it.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const photo = photos[index];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950/85 p-4 backdrop-blur-sm sm:p-8"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute top-4 right-4 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-white/20 sm:top-6 sm:right-6"
      >
        Close
      </button>

      {/* Clicks inside the frame must not fall through to the backdrop. */}
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-full w-full max-w-3xl flex-col items-center gap-4"
      >
        <div className="relative h-[60vh] w-full sm:h-[70vh]">
          <Image
            key={photo.src}
            src={photo.src}
            alt={photo.caption ?? ""}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            unoptimized={photo.src.startsWith("blob:")}
            className="object-contain"
          />
        </div>

        <div className="flex items-center gap-4">
          {photos.length > 1 && (
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-white/20"
            >
              ←
            </button>
          )}

          <p className="text-center text-[13px] text-neutral-300">
            {photo.caption}
            {photos.length > 1 && (
              <span className="ml-2 text-neutral-500">
                {index + 1} of {photos.length}
              </span>
            )}
          </p>

          {photos.length > 1 && (
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-white/20"
            >
              →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
