import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API proxy configuration for development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/:path*',
      },
      {
        source: '/agent_network_sse/:path*',
        destination: 'http://localhost:8000/agent_network_sse/:path*',
      },
      {
        source: '/agent_network_events/:path*',
        destination: 'http://localhost:8000/agent_network_events/:path*',
      },
    ];
  },
  // CSS configuration
  experimental: {
    optimizeCss: false,
  },
  // Note: Security headers are now handled by middleware.ts for better CSP nonce support
  // Turbopack configuration (moved from experimental.turbo)
  turbopack: {
    // Turbopack configuration
  },
  // Disable x-powered-by header
  poweredByHeader: false,
  // Enable strict mode
  reactStrictMode: true,
  // Disable ESLint during builds temporarily
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
