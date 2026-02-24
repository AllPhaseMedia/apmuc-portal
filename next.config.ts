import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
