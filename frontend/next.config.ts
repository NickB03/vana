import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      devIndicators: {
        position: "bottom-right"
      }
    }
  }
};

export default nextConfig;
