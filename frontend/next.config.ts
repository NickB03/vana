import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Output configuration for Docker deployment
  output: 'standalone',

  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  // API proxy configuration for development
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return [];
    return [
      {
        source: '/api/vana/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
  // Note: Security headers are now handled by middleware.ts for better CSP nonce support
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