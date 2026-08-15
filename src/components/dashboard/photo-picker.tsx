"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { PhotoFrame } from "@/components/dashboard/photo-frame";

type Picked = { file: File; url: string };

/**
 * File input that shows what was chosen, before anything is uploaded, and lets
 * individual photos be dropped from the selection.
 *
 * A `FileList` cannot be edited, so removing one photo means rebuilding the
 * list through `DataTransfer` and assigning it back to the input. Without that
 * the form would still submit the removed file — the preview would lie.
 *
 * Selections accumulate rather than replace, which is the natural pairing with
 * per-photo removal: pick two, add a third, drop the first.
 *
 * Previews are `blob:` object URLs. Each holds its file in memory until
 * revoked, so they are revoked on removal, on replacement, and on unmount.
 */
export function PhotoPicker({
  name = "images",
  label = "Choose photos",
  /** How many more photos may be added, counting any already uploaded. */
  maxSelectable,
}: {
  name?: string;
  label?: string;
  maxSelectable: number;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [frameIndex, setFrameIndex] = useState<number | null>(null);

  // Mirrored into a ref so the unmount cleanup sees the latest selection
  // without depending on it — an effect keyed on `picked` would revoke URLs
  // still on screen. Refs must not be written during render.
  const pickedRef = useRef<Picked[]>([]);

  useEffect(() => {
    pickedRef.current = picked;
  }, [picked]);

  useEffect(() => {
    return () => {
      pickedRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, []);

  const full = picked.length >= maxSelectable;

  /** Pushes the selection back onto the input so the form submits exactly it. */
  function syncInput(next: Picked[]) {
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    next.forEach((item) => transfer.items.add(item.file));
    inputRef.current.files = transfer.files;
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? []);
    const next = [...picked];
    let skipped = 0;

    for (const file of incoming) {
      if (next.length >= maxSelectable) {
        skipped += 1;
        continue;
      }
      // Same name and size twice is a re-pick, not a second photo.
      const duplicate = next.some(
        (item) => item.file.name === file.name && item.file.size === file.size
      );
      if (duplicate) continue;

      next.push({ file, url: URL.createObjectURL(file) });
    }

    setPicked(next);
    syncInput(next);
    setNotice(
      skipped > 0
        ? `Only ${maxSelectable} more ${maxSelectable === 1 ? "photo" : "photos"} can be added.`
        : null
    );
  }

  function remove(index: number) {
    URL.revokeObjectURL(picked[index].url);
    const next = picked.filter((_, position) => position !== index);
    setPicked(next);
    syncInput(next);
    setNotice(null);
    setFrameIndex(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={inputId}
          className={
            full
              ? "cursor-not-allowed rounded-md border border-nk-neutral-800 bg-nk-neutral-800 px-4 py-2.5 text-sm font-medium text-nk-neutral-600"
              : "cursor-pointer rounded-md border border-nk-neutral-800 bg-transparent px-4 py-2.5 text-sm font-medium transition-colors hover:bg-nk-text/7"
          }
        >
          {label}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={full}
          onChange={handleChange}
          className="text-sm text-nk-neutral-500 file:hidden"
        />
        {picked.length > 0 && (
          <span className="text-sm text-nk-neutral-500">
            {picked.length} selected
          </span>
        )}
      </div>

      {notice && <p className="mt-2 text-sm text-nk-accent-300">{notice}</p>}

      {picked.length > 0 && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {picked.map((item, index) => (
              <div
                key={item.url}
                className="relative aspect-square overflow-hidden rounded-md border border-dashed border-nk-neutral-800 bg-nk-neutral-900"
              >
                <button
                  type="button"
                  onClick={() => setFrameIndex(index)}
                  aria-label={`Preview ${item.file.name}`}
                  className="absolute inset-0"
                >
                  <Image
                    src={item.url}
                    alt={item.file.name}
                    fill
                    sizes="(max-width: 640px) 33vw, 160px"
                    unoptimized
                    className="object-cover"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove ${item.file.name}`}
                  className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-nk-surface/95 text-sm leading-none text-nk-neutral-300 shadow-sm transition-colors hover:text-nk-text"
                >
                  ×
                </button>

                <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-nk-bg/90 px-2 py-1 text-left text-xs text-nk-text">
                  {item.file.name}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-2 text-sm text-nk-neutral-500">
            Not uploaded yet — tap a photo to see it full size.
          </p>
        </>
      )}

      <PhotoFrame
        photos={picked.map((item) => ({
          src: item.url,
          caption: item.file.name,
        }))}
        index={frameIndex}
        onClose={() => setFrameIndex(null)}
        onIndexChange={setFrameIndex}
      />
    </div>
  );
}
