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
  // Note: Security headers are now handled by middleware.ts for better CSP nonce support
  // Enable experimental features for better development experience
  experimental: {
    turbo: {
      // Turbopack configuration
    },
  },
  // Disable x-powered-by header
  poweredByHeader: false,
  // Enable strict mode
  reactStrictMode: true,
};

export default nextConfig;
