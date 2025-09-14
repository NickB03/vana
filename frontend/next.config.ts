import type { NextConfig } from "next";
import { createSecureHeaders } from "./lib/security-headers";

const nextConfig: NextConfig = {
  // Turbopack configuration for development
  turbopack: {
    root: "/Users/nick/Development/vana/frontend"
  },
  
  // Build optimizations
  typescript: {
    // Type checking during build
    ignoreBuildErrors: false
  },
  
  eslint: {
    // ESLint during build
    ignoreDuringBuilds: false
  },
  
  devIndicators: {
    position: "bottom-right"
  },
  
  // Performance optimizations
  compress: true,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
  },
  
  // Security Headers - Environment-driven CSP policy
  async headers() {
    return createSecureHeaders();
  },

  // Environment variable security - Only expose safe variables
  env: {
    // Only expose non-sensitive environment variables to the client
    NEXT_PUBLIC_APP_NAME: 'Vana AI Research Platform',
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },

  // Experimental security features
  experimental: {
    // strictMode moved to React 19 - no longer needed in Next.js experimental
  }
};

export default nextConfig;
