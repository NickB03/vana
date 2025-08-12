/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    // Dangerously allow production builds to successfully complete even if there are type errors
    ignoreBuildErrors: false,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if ESLint errors exist
    ignoreDuringBuilds: false,
  },
  // Security headers for Monaco Editor and general security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:", // Monaco Editor needs unsafe-eval and blob:
              "style-src 'self' 'unsafe-inline'", // Tailwind needs unsafe-inline
              "font-src 'self' data:",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' ws: wss:", // WebSocket connections for SSE
              "worker-src 'self' blob:", // Monaco Editor web workers
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
  // Enable source maps in development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.devtool = 'eval-source-map'
    }
    
    // Handle Monaco Editor's web workers
    config.module.rules.push({
      test: /\.worker\.js$/,
      use: { loader: 'worker-loader' },
    })
    
    return config
  },
}

module.exports = nextConfig