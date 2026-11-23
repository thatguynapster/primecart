import { ImageResponse } from "next/og";
import sharp from "sharp";

import { getRootDomain, getStorefrontOrigin } from "@/lib/domain";
import { sniffImageType } from "@/lib/images/sniff";
import { getMerchantBySubdomain } from "@/lib/merchant/lookup";
import { onBrandColor, safeBrandColor } from "@/lib/storefront/brand";
import { getPreviewPhoto } from "@/lib/storefront/catalogue";
import { previewPhotoUrl } from "@/lib/storefront/preview";

/**
 * The shop's link-preview card. A route handler, not `opengraph-image.tsx`:
 * the file convention would publish a `/store/<shop>/…` URL, which the proxy
 * would rewrite a second time into a 404.
 */

const MAX_PHOTO_BYTES = 1_500_000;

/** As a data URI, or null: a missing photo must never break the card. */
async function loadPhoto(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "image/jpeg,image/png" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const type = sniffImageType(bytes);
    // The renderer can't read WebP.
    if (bytes.length > MAX_PHOTO_BYTES || (type !== "image/jpeg" && type !== "image/png")) {
      return null;
    }
    return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch {
    return null;
  }
}

function shorten(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const merchant = await getMerchantBySubdomain(subdomain);
  if (!merchant || !merchant.isActive) {
    return new Response("Not found", { status: 404 });
  }

  const origin = getStorefrontOrigin(merchant.subdomain);
  const photoUrl = await getPreviewPhoto(merchant);
  const [photo, logo] = await Promise.all([
    photoUrl ? loadPhoto(previewPhotoUrl(origin, photoUrl)) : null,
    merchant.logoUrl ? loadPhoto(previewPhotoUrl(origin, merchant.logoUrl)) : null,
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
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img
              src={logo}
              width={96}
              height={96}
              style={{ borderRadius: 20, objectFit: "cover", marginBottom: 32 }}
            />
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

  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      // The URL carries a version, so a change gets a new address.
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
