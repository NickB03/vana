const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  displayName: 'Vana Frontend Tests',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  
  // Module name mapping for path resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/store/(.*)$': '<rootDir>/src/store/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/examples/(.*)$': '<rootDir>/src/examples/$1',
    
    // Handle CSS imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    
    // Handle static file imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    
    // Handle ESM modules
    '^jose/(.*)$': '<rootDir>/__mocks__/jose.js',
    '^uuid$': 'uuid',
  },
  
  // Transform configuration handled by Next.js Jest
  // No manual transform needed - Next.js handles TypeScript compilation
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|jose|@testing-library|@radix-ui)/)',
  ],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}',
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/src/__tests__/e2e/',
    '<rootDir>/playwright/',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/error.tsx',
    '!src/app/**/not-found.tsx',
    '!src/components/ui/**', // UI components are thoroughly tested by shadcn
    '!src/lib/utils.ts', // Utility functions with simple logic
  ],
  
  // Coverage thresholds - comprehensive and realistic
  coverageThreshold: {
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
  
  // Coverage output
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary', 'clover'],
  
  // Test execution settings
  verbose: true,
  bail: false,
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Timeout settings
  testTimeout: 10000,
  
  // Reporter configuration
  reporters: ['default'],
  
  // Global setup and teardown
  globalSetup: undefined,
  globalTeardown: undefined,
  
  // Watch plugins for better development experience - temporarily disabled
  // watchPlugins: [
  //   'jest-watch-typeahead/filename',
  //   'jest-watch-typeahead/testname',
  // ],
  
  // Error handling
  errorOnDeprecated: false,
  
  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  
  // Resolver configuration
  resolver: undefined,
  
  // Additional Jest configuration
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)