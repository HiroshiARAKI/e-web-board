import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.jma.go.jp",
        pathname: "/bosai/forecast/img/**",
      },
    ],
  },
};

export default nextConfig;
