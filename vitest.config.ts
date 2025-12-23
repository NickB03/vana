import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/*.{test,spec}.performance.{ts,tsx}'
    ],
    testTimeout: 5000, // Increased from default 1000ms for async operations
    teardownTimeout: 10000, // Allow 10s for cleanup
    // Use threads to avoid fork-based memory spikes during large test suites
    pool: 'threads',
    maxWorkers: 1,
    fileParallelism: false,
    isolate: true
  },
  coverage: {
    // Use istanbul instead of v8 to prevent OOM during CI coverage generation
    // v8 coverage instruments all code at runtime, consuming significant memory
    // istanbul uses source-map-based instrumentation which is more memory-efficient
    provider: 'istanbul',
    reportsDirectory: './coverage',
    reporter: ['text', 'lcov'],  // Removed 'html' reporter to reduce memory overhead
    include: ['src/**/*.{ts,tsx}'],
    exclude: [
      'src/**/*.d.ts',
      // Note: Include performance tests in coverage - remove exclusion
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
    all: true,
    // Clean coverage data between runs to reduce memory pressure
    clean: true,
    cleanOnRerun: true,
    // Skip per-file reporting to reduce memory consumption
    skipFull: false,
    // Minimize coverage map size in memory
    excludeNodeModules: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
