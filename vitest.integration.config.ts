import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

/**
 * Vitest Configuration for Integration Tests
 *
 * These tests use REAL local Supabase instead of mocks.
 * Requires: `supabase start` running before tests
 *
 * Run with: npm run test:integration
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // Use integration setup instead of mock setup
    setupFiles: ['./src/test/integration-setup.ts'],
    // Only run .integration.test.ts files
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 15000, // Longer timeout for real DB operations
    hookTimeout: 10000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // Run sequentially to avoid DB conflicts
      },
    },
  },
});
