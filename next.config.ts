import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Product photos come straight off a phone camera and routinely exceed
      // the 1MB default. The upload action enforces 5MB per file; this leaves
      // headroom for multipart boundaries and field metadata on top of that.
      bodySizeLimit: "6mb",
    },
  },
  images: {
    // Product images are served from the public R2 bucket.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
    ],
    // Next 16 only serves qualities explicitly allow-listed here — the
    // default is 75. The storefront hero/mid-page banner request 90 (the
    // largest, most visible images on the page), everything else stays at 75.
    qualities: [75, 90],
    // Default breakpoints jump 256 -> 384 with nothing between. ProductCard's
    // 230px desktop slot needs ~281-288 physical px at the ~1.25 DPR a scaled
    // Windows display reports, which fell in that gap and got rounded up to
    // the 384 variant — Lighthouse's `image-delivery-insight` caught the
    // resulting ~37% oversized fetch. 320 fills the gap without touching the
    // `sizes` hint that fixed an earlier blurry-image bug, so this can only
    // ever pick a smaller-but-still-sufficient image, never an undersized one.
    imageSizes: [32, 48, 64, 96, 128, 256, 320, 384],
  },
};

export default nextConfig;
