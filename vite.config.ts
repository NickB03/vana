import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import compression from "vite-plugin-compression";
import { VitePWA } from "vite-plugin-pwa";
import { createHash } from "crypto";
import fs from "fs";

// Generate unique build hash for cache busting
const buildHash = createHash('sha256')
  .update(Date.now().toString() + Math.random().toString())
  .digest('hex')
  .substring(0, 8);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Brotli compression
    compression({
      algorithm: "brotliCompress",
      ext: ".br",
      threshold: 1024,
    }),
    // Gzip compression fallback
    compression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024,
    }),
    // PWA configuration - Optimized for fast updates on portfolio site
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt"],
      manifest: {
        name: "AI Assistant",
        short_name: "AI Assistant",
        description: "AI-Powered Chat Assistant",
        theme_color: "#8B7BF7",
        icons: [
          {
            src: "https://storage.googleapis.com/gpt-engineer-file-uploads/OC7fxCsI8GZ5WHrbh3LxjMoliXA3/uploads/1761355340262-nebius.png",
            sizes: "192x192",
            type: "image/png"
          }
        ]
      },
      workbox: {
        // Immediate service worker activation for faster updates
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 // 30 seconds (reduced from 5 minutes)
              },
              networkTimeoutSeconds: 5
            }
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: "NetworkFirst", // Changed from CacheFirst to NetworkFirst
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 300 // 5 minutes (reduced from 24 hours)
              },
              networkTimeoutSeconds: 5
            }
          }
        ]
      }
    }),
    // Plugin to inject build hash into HTML for cache busting
    {
      name: 'inject-build-hash',
      transformIndexHtml(html) {
        return html.replace('data-build-hash="__BUILD_HASH__"', `data-build-hash="${buildHash}"`);
      },
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Generate unique hashes for all assets for cache busting
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash][extname]`,
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-avatar",
          ],
          "vendor-markdown": ["react-markdown", "remark-gfm"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-supabase": ["@supabase/supabase-js"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: mode === "production",
        drop_debugger: true,
        pure_funcs: mode === "production" ? ["console.log", "console.info", "console.debug"] : [],
      },
    },
    sourcemap: mode === "development",
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },
  define: {
    // Inject build hash as environment variable for cache busting
    __BUILD_HASH__: JSON.stringify(buildHash),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
}));
