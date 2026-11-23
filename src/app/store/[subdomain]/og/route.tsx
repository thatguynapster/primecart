import { ImageResponse } from "next/og";
import sharp from "sharp";

import { getRootDomain } from "@/lib/domain";
import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import { onBrandColor, safeBrandColor } from "@/lib/storefront/brand";
import { getPreviewPhoto, getStorefrontProduct } from "@/lib/storefront/catalogue";

/**
 * The shop's link-preview card. A route handler, not `opengraph-image.tsx`:
 * the file convention would publish a `/store/<shop>/…` URL, which the proxy
 * would rewrite a second time into a 404.
 */

/** Uploads are at most 4 MB (src/lib/r2.ts). */
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;

/** A stored image's bytes, or null: a missing photo must never break a preview. */
async function download(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    return bytes.length <= MAX_SOURCE_BYTES ? bytes : null;
  } catch {
    return null;
  }
}

/** Resized, and converted because the card renderer can't read WebP. */
async function embed(url: string | null, kind: "photo" | "logo"): Promise<string | null> {
  const bytes = url ? await download(url) : null;
  if (!bytes) return null;
  try {
    const image = sharp(bytes);
    if (kind === "logo") {
      // PNG keeps transparency, so the logo sits cleanly on its white tile.
      const png = await image.resize(192, 192, { fit: "inside" }).png().toBuffer();
      return `data:image/png;base64,${png.toString("base64")}`;
    }
    const jpeg = await image
      .resize(480, 630, { fit: "cover" })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 80 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

function jpegResponse(jpeg: Buffer): Response {
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      // The URL carries a version, so a change gets a new address.
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

/** A product's own photo, small and on white: cut-outs would go black as JPEG. */
async function productPhoto(merchantId: string, productId: string): Promise<Buffer | null> {
  try {
    const product = await getStorefrontProduct(merchantId, productId);
    const bytes = product?.images[0] ? await download(product.images[0]) : null;
    if (!bytes) return null;
    return await sharp(bytes)
      .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 78 })
      .toBuffer();
  } catch {
    return null;
  }
}

function shorten(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const merchant = await getMerchantBySubdomain(subdomain);
  if (!merchant || !merchant.isActive) {
    return new Response("Not found", { status: 404 });
  }

  const productId = new URL(request.url).searchParams.get("product");
  if (productId) {
    const photo = await productPhoto(merchant.id, productId);
    if (photo) return jpegResponse(photo);
    // Otherwise the shop's card.
  }

  const photoUrl = await getPreviewPhoto(merchant);
  const [photo, logo] = await Promise.all([
    embed(photoUrl, "photo"),
    embed(merchant.logoUrl, "logo"),
  ]);

  const background = safeBrandColor(merchant.primaryColor);
  const color = onBrandColor(background);
  const name = shorten(merchant.businessName, 48);

  const card = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background, color }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: 72,
          }}
        >
          {logo && (
            // On white, like the shop's header: a logo in the shop's own colour
            // would vanish against the card.
            <div
              style={{
                width: 112,
                height: 112,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#ffffff",
                borderRadius: 24,
                marginBottom: 32,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
              <img src={logo} width={88} height={88} style={{ objectFit: "contain" }} />
            </div>
          )}
          <div style={{ fontSize: name.length > 22 ? 60 : 80, fontWeight: 700, lineHeight: 1.1 }}>
            {name}
          </div>
          {merchant.description && (
            <div style={{ fontSize: 32, marginTop: 24, opacity: 0.85, lineHeight: 1.35 }}>
              {shorten(merchant.description, 90)}
            </div>
          )}
          <div style={{ fontSize: 28, marginTop: 36, opacity: 0.75 }}>
            {`${merchant.subdomain}.${getRootDomain()}`}
          </div>
        </div>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img src={photo} width={480} height={630} style={{ objectFit: "cover" }} />
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );

  // JPEG, because a PNG holding a photo can pass WhatsApp's size limit (about
  // 600 KB) and lose the preview. Measured: 641 KB as PNG, 57 KB as JPEG.
  const png = Buffer.from(await card.arrayBuffer());
  const jpeg = await sharp(png).jpeg({ quality: 82 }).toBuffer();

  return jpegResponse(jpeg);
}
