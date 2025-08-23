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
  // Security headers configuration
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline';
              worker-src 'self' blob:;
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: https:;
              connect-src 'self' http://localhost:8000 ws://localhost:8000;
              font-src 'self';
              object-src 'none';
              base-uri 'self';
              form-action 'self';
              frame-ancestors 'none';
              wasm-src 'self' 'unsafe-eval';
            `.replace(/\s{2,}/g, ' ').trim()
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  },
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
