/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: "cloud.appwrite.io", pathname: "**" },
      { hostname: "img.clerk.com", pathname: "**" },
    ],
  },
};

export default nextConfig;
