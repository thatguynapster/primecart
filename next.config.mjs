/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: "cloud.appwrite.io", pathname: "**" }],
  },
};

export default nextConfig;
