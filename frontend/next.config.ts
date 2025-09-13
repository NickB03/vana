import type { NextConfig } from "next";

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
  
  // Security Headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          // Content Security Policy - Strict policy to prevent XSS
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: Remove unsafe-* in production
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com data:",
              "img-src 'self' data: blob: *.githubusercontent.com",
              "connect-src 'self' localhost:8000 ws://localhost:* wss://localhost:* *.googleapis.com *.google.com",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
          
          // Prevent clickjacking attacks
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          
          // XSS Protection (legacy but still useful)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          
          // Referrer Policy - Protect sensitive URLs
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          
          // Permissions Policy - Restrict dangerous APIs
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'interest-cohort=()',
              'browsing-topics=()',
              'payment=()',
              'usb=()',
              'serial=()',
              'bluetooth=()'
            ].join(', ')
          },
          
          // Strict Transport Security (only in production with HTTPS)
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }] : []),
        ]
      },
      
      // API Routes - Additional security for API endpoints
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, private'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          }
        ]
      }
    ];
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
