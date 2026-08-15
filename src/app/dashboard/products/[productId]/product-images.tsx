"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { FormError } from "@/components/dashboard/fields";
import { PhotoFrame } from "@/components/dashboard/photo-frame";
import { PhotoPicker } from "@/components/dashboard/photo-picker";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/products/limits";
import {
  removeProductImage,
  uploadProductImages,
  type FormState,
} from "../actions";

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-nk-accent bg-transparent px-5 py-2.5 text-sm font-medium text-nk-accent transition-colors hover:bg-nk-accent/12 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {pending ? "Uploading…" : "Upload"}
    </button>
  );
}

function ImageTile({
  productId,
  url,
  isFirst,
  usedBy,
  onPreview,
}: {
  productId: string;
  url: string;
  isFirst: boolean;
  /** Names of the options that have picked this photo. */
  usedBy: string[];
  onPreview: () => void;
}) {
  const [removing, setRemoving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    setRemoving(true);
    try {
      await removeProductImage(productId, url);
    } finally {
      setRemoving(false);
      setConfirming(false);
    }
  }

  return (
    <div className="relative aspect-square overflow-hidden rounded-md border border-nk-neutral-800 bg-nk-neutral-900">
      {/* The tile itself is the preview control; Remove sits above it. */}
      <button
        type="button"
        onClick={onPreview}
        aria-label="Preview photo"
        className="absolute inset-0"
      >
        <Image
          src={url}
          alt=""
          fill
          sizes="(max-width: 640px) 33vw, 160px"
          className="object-cover"
        />
      </button>

      {isFirst && (
        <span className="pointer-events-none absolute top-2 left-2 rounded-md border border-nk-accent bg-transparent/85 px-2 py-0.5 text-xs font-medium text-nk-accent">
          Main
        </span>
      )}

      {usedBy.length > 0 && !confirming && (
        <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-nk-surface/95 px-2 py-0.5 text-xs font-medium text-nk-neutral-400 shadow-sm">
          {usedBy.length === 1 ? usedBy[0] : `${usedBy.length} options`}
        </span>
      )}

      {confirming ? (
        // Deleting the object is irreversible, so the consequence is spelled
        // out on the tile rather than in a dialog that interrupts the page.
        <div className="absolute inset-0 flex flex-col justify-between bg-nk-bg/90 p-2.5 text-nk-text">
          <p className="text-xs leading-snug">
            Used by{" "}
            <span className="font-medium">{usedBy.join(", ")}</span>. Removing
            it leaves {usedBy.length === 1 ? "that option" : "those options"}{" "}
            without a preview photo.
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => void remove()}
              disabled={removing}
              className="flex-1 rounded-full bg-nk-surface px-2 py-1 text-xs font-medium text-nk-text disabled:opacity-60"
            >
              {removing ? "…" : "Remove"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={removing}
              className="rounded-full bg-nk-surface/15 px-2.5 py-1 text-xs font-medium"
            >
              Keep
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={removing}
          onClick={() => (usedBy.length > 0 ? setConfirming(true) : remove())}
          className="absolute right-2 bottom-2 rounded-full bg-nk-surface/95 px-2.5 py-1 text-xs font-medium text-nk-neutral-300 shadow-sm transition-colors hover:text-nk-text disabled:opacity-50"
        >
          {removing ? "…" : "Remove"}
        </button>
      )}
    </div>
  );
}

export function ProductImages({
  productId,
  images,
  usage,
  configured,
}: {
  productId: string;
  images: string[];
  /** Image URL → names of the options that picked it. */
  usage: Record<string, string[]>;
  configured: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    uploadProductImages,
    {}
  );
  const [frameIndex, setFrameIndex] = useState<number | null>(null);

  // Photos already on the product count towards the cap.
  const remaining = MAX_IMAGES_PER_PRODUCT - images.length;

  return (
    <section className="rounded-md border border-nk-neutral-800 bg-nk-surface p-6 sm:p-8">
      <h2 className="text-base font-medium tracking-tight">
        Photos
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-nk-neutral-400">
        The first photo is the one customers see in your shop listing. Up to{" "}
        {MAX_IMAGES_PER_PRODUCT} per product, 5MB each.
      </p>

      {!configured ? (
        <p className="mt-5 rounded-md border border-dashed border-nk-neutral-800 p-5 text-sm text-nk-neutral-500">
          Image storage is not connected yet.
        </p>
      ) : (
        <>
          {images.length > 0 && (
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((url, index) => (
                <ImageTile
                  key={url}
                  productId={productId}
                  url={url}
                  isFirst={index === 0}
                  usedBy={usage[url] ?? []}
                  onPreview={() => setFrameIndex(index)}
                />
              ))}
            </div>
          )}

          {remaining > 0 ? (
            <form action={formAction} className="mt-5 space-y-4">
              <input type="hidden" name="productId" value={productId} />
              <FormError message={state.error} />

              {/* Remounting on a successful upload is what clears the
                  selection: new state, a fresh empty file input, and the
                  unmount cleanup revokes the preview object URLs. */}
              <PhotoPicker
                key={state.uploadedAt ?? 0}
                label="Add photos"
                maxSelectable={remaining}
              />
              <UploadButton />
            </form>
          ) : (
            <p className="mt-5 text-sm text-nk-neutral-500">
              You have the maximum of {MAX_IMAGES_PER_PRODUCT} photos. Remove
              one to add another.
            </p>
          )}

          <PhotoFrame
            photos={images.map((url, index) => ({
              src: url,
              caption: index === 0 ? "Main photo" : `Photo ${index + 1}`,
            }))}
            index={frameIndex}
            onClose={() => setFrameIndex(null)}
            onIndexChange={setFrameIndex}
          />
        </>
      )}
    </section>
  );
}
