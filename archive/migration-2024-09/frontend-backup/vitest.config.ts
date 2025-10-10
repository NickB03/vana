/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['tests/e2e/**', 'tests/integration/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'coverage/**',
        'dist/**',
        'tests/**',
        'vitest.config.*',
        'next.config.*',
        'tailwind.config.*',
        'postcss.config.*',
        '**/*.d.ts',
        '**/node_modules/**',
        '**/.next/**'
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Core components require higher coverage
        'src/components/VanaHomePage/**': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/components/VanaChatInterface/**': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/components/VanaSidebar/**': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/hooks/**': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    },
    reporters: ['verbose', 'junit'],
    outputFile: {
      junit: './tests/reports/junit.xml'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/stores': path.resolve(__dirname, './src/stores'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils')
    }
  }
})