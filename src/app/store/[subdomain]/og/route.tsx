import { ImageResponse } from "next/og";
import sharp from "sharp";

import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import { onBrandColor, safeBrandColor } from "@/lib/storefront/brand";
import { getStorefrontProduct } from "@/lib/storefront/catalogue";

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

/** Converted because the card renderer can't read WebP. PNG keeps transparency. */
async function embedLogo(url: string | null): Promise<string | null> {
  const bytes = url ? await download(url) : null;
  if (!bytes) return null;
  try {
    const png = await sharp(bytes).resize(440, 440, { fit: "inside" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
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

  const logo = await embedLogo(merchant.logoUrl);
  const background = safeBrandColor(merchant.primaryColor);
  const color = onBrandColor(background);
  const name = shorten(merchant.businessName, 48);

  // Everything sits in the middle 630px: WhatsApp often crops the card to its
  // centre square. Name and logo only, since the app shows the description and
  // address as text beside it.
  const card = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background,
          color,
        }}
      >
        {/* On white, like the shop's header: a logo in the shop's own colour
            would vanish against the card. Without one, the shop's initial. */}
        <div
          style={{
            width: 300,
            height: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
            color: "#111111",
            borderRadius: 56,
            fontSize: 170,
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img src={logo} width={220} height={220} style={{ objectFit: "contain" }} />
          ) : (
            merchant.businessName.charAt(0).toUpperCase()
          )}
        </div>
        <div
          style={{
            maxWidth: 540,
            marginTop: 40,
            fontSize: name.length > 26 ? 44 : name.length > 14 ? 58 : 76,
            lineHeight: 1.15,
            textAlign: "center",
          }}
        >
          {name}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );

  // JPEG keeps it far below the size WhatsApp skips (about 600 KB).
  const png = Buffer.from(await card.arrayBuffer());
  const jpeg = await sharp(png).jpeg({ quality: 82 }).toBuffer();

  return jpegResponse(jpeg);
}
