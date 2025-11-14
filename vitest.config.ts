import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    testTimeout: 5000 // Increased from default 1000ms for async operations
  },
  coverage: {
    provider: 'v8',
    reportsDirectory: './coverage',
    reporter: ['text', 'html', 'lcov'],
    include: ['src/**/*.{ts,tsx}'],
    exclude: [
      'src/**/*.d.ts',
      'src/**/__tests__/**/*.{ts,tsx}',
      'src/test/**',
      'src/main.tsx',
      'src/vite-env.d.ts'
    ],
    thresholds: {
      statements: 55,
      branches: 50,
      functions: 55,
      lines: 55
    },
    all: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
