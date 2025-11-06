import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    testTimeout: 5000, // Increased from default 1000ms for async operations
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});