/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: "cloud.appwrite.io", pathname: "**" },
      { hostname: "primecart.s3.us-east-2.amazonaws.com", pathname: "**" },
      { hostname: "img.clerk.com", pathname: "**" },
    ],
  },
};

export default nextConfig;
