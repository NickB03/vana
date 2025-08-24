import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  
  test: {
    name: 'Vana Frontend (Vitest)',
    
    // Test environment
    environment: 'jsdom',
    
    // Global setup files
    setupFiles: ['./src/__tests__/vitest.setup.ts'],
    
    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'coverage',
      'src/__tests__/e2e/**',
    ],
    
    // Global test settings
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    
    // Coverage configuration
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'clover'],
      reportsDirectory: 'coverage',
      clean: true,
      
      include: [
        'src/**/*.{js,jsx,ts,tsx}',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.stories.{js,jsx,ts,tsx}',
        'src/**/__tests__/**',
        'src/**/__mocks__/**',
        'src/app/**/layout.tsx',
        'src/app/**/loading.tsx',
        'src/app/**/error.tsx',
        'src/app/**/not-found.tsx',
        'src/components/ui/**', // shadcn components
        'src/lib/utils.ts',
        'node_modules',
      ],
      
      // Coverage thresholds
      thresholds: {
        global: {
          statements: 85,
          branches: 80,
          functions: 85,
          lines: 85,
        },
        // Specific thresholds for critical modules
        'src/lib/': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
        'src/store/': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
        'src/hooks/': {
          statements: 85,
          branches: 80,
          functions: 85,
          lines: 85,
        },
      },
      
      // Coverage watermarks
      watermarks: {
        statements: [80, 95],
        functions: [80, 95],
        branches: [80, 95],
        lines: [80, 95],
      },
    },
    
    // Performance settings
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 2,
      },
    },
    
    // Test execution settings
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 1000,
    
    // Reporter configuration
    reporter: [
      'default',
      'verbose',
      'json',
      'html',
      'junit',
    ],
    
    outputFile: {
      json: 'test-results/vitest-results.json',
      html: 'test-results/vitest-report.html',
      junit: 'test-results/vitest-junit.xml',
    },
    
    // Watch mode settings
    watch: true,
    
    // UI configuration
    ui: false, // Set to true to enable Vitest UI
    open: false,
    
    // Snapshot settings
    resolveSnapshotPath: (testPath, snapExtension) => {
      return testPath.replace(/\.test\.([tj]sx?)/, `.snap${snapExtension}`)
    },
    
    // Environment configuration
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_APP_ENV: 'test',
    },
  },
  
  // Vite configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/store': resolve(__dirname, './src/store'),
      '@/types': resolve(__dirname, './src/types'),
      '@/examples': resolve(__dirname, './src/examples'),
    },
  },
  
  // Define configuration for test builds
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.NEXT_PUBLIC_APP_ENV': '"test"',
  },
  
  // Optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@testing-library/react',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
    ],
  },
  
  // Build configuration for test
  build: {
    sourcemap: true,
    minify: false,
  },
  
  // Server configuration for test environment
  server: {
    host: true,
    port: 5174, // Different port from dev to avoid conflicts
  },
  
  // Preview configuration
  preview: {
    port: 4173,
  },
})