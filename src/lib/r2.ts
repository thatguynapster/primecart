import { randomUUID } from "node:crypto";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 object storage.
 *
 * R2 speaks the S3 API, and Cloudflare's own recommendation for JavaScript is
 * to use `@aws-sdk/client-s3` against the R2 endpoint with `region: "auto"`.
 *
 * The bucket is public, so uploaded objects are read straight from
 * R2_PUBLIC_URL with no signing. Credentials only ever live on the server —
 * the browser never talks to R2 directly, which is also why the bucket needs
 * no CORS configuration.
 */

const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class ImageUploadError extends Error {}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new ImageUploadError(
      `${name} is not set. Image upload is not configured yet.`
    );
  }
  return value;
}

/** Built lazily so a missing variable surfaces on use, not at import. */
function client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
  });
}

/**
 * Checks a file without touching the network.
 *
 * Separated so a form can reject a bad file *before* creating anything —
 * product creation uploads after the record exists, and it is better to fail
 * on validation than to leave a product behind because of a wrong file type.
 *
 * @returns an error message, or null when the file is acceptable.
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES[file.type]) return "Use a JPG, PNG or WebP image.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_BYTES) return "Images must be 5MB or smaller.";
  return null;
}

export function isImageUploadConfigured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_URL
  );
}

function publicUrlFor(key: string): string {
  return `${required("R2_PUBLIC_URL").replace(/\/$/, "")}/${key}`;
}

/**
 * Uploads one product image and returns its public URL.
 *
 * Keys are namespaced by merchant and product so objects are traceable back to
 * their owner, and a random filename means re-uploading never overwrites an
 * existing image or leaks the original filename.
 */
export async function uploadProductImage(params: {
  merchantId: string;
  productId: string;
  file: File;
}): Promise<string> {
  const { merchantId, productId, file } = params;

  const invalid = validateImageFile(file);
  if (invalid) throw new ImageUploadError(invalid);

  const extension = ALLOWED_TYPES[file.type];
  const key = `products/${merchantId}/${productId}/${randomUUID()}.${extension}`;
  const body = Buffer.from(await file.arrayBuffer());

  await client().send(
    new PutObjectCommand({
      Bucket: required("R2_BUCKET_NAME"),
      Key: key,
      Body: body,
      ContentType: file.type,
      // Images are immutable — a new upload gets a new key — so they can be
      // cached indefinitely.
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return publicUrlFor(key);
}

/**
 * Deletes an image by its public URL.
 *
 * Best-effort: the merchant's intent is to remove the image from their
 * product, and that is a database change. A failure to delete the object
 * leaves an orphan in the bucket, which is not worth failing the request over.
 */
export async function deleteProductImage(url: string): Promise<void> {
  const base = required("R2_PUBLIC_URL").replace(/\/$/, "");
  if (!url.startsWith(`${base}/`)) return;

  const key = url.slice(base.length + 1);

  try {
    await client().send(
      new DeleteObjectCommand({
        Bucket: required("R2_BUCKET_NAME"),
        Key: key,
      })
    );
  } catch {
    // Orphaned object; the product no longer references it.
  }
}
