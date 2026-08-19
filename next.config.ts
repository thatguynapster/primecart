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
  },
};

export default nextConfig;
