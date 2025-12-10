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
    // Use threads pool locally for faster execution (some OOM warnings may appear at end but don't affect results)
    // CI uses forks for memory isolation during coverage generation
    pool: process.env.CI ? 'forks' : 'threads',
    poolOptions: {
      threads: {
        // Reduce threads to prevent OOM during large test runs
        maxThreads: 2,
        minThreads: 1,
        isolate: true
      },
      forks: {
        // In CI: reduce concurrency from 4 to 2 with aggressive GC (NODE_OPTIONS flags)
        // This prevents OOM during istanbul coverage instrumentation of 28 test files
        // Each fork + instrumentation consumes ~1.5-2GB; 2 forks = 3-4GB + OS overhead
        maxForks: 2,
        isolate: true
      }
    }
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
