/**
 * Jest Security Test Configuration
 * Specialized configuration for running security tests
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const securityJestConfig = {
  displayName: 'Vana Security Tests',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  
  // Focus on security test files
  testMatch: [
    '<rootDir>/src/__tests__/security/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.security.test.{js,jsx,ts,tsx}',
  ],
  
  // Module name mapping for path resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/store/(.*)$': '<rootDir>/src/store/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    
    // Handle CSS imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    
    // Handle static file imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    
    // Handle ESM modules
    '^jose/(.*)$': '<rootDir>/__mocks__/jose.js',
    '^uuid$': 'uuid',
    '^isomorphic-dompurify$': '<rootDir>/__mocks__/dompurify.js',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|jose|@testing-library|@radix-ui|isomorphic-dompurify)/)',
  ],
  
  // Coverage configuration for security tests
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    // Focus on security-critical components
    'src/components/chat/**/*.{js,jsx,ts,tsx}',
    'src/components/editor/**/*.{js,jsx,ts,tsx}',
    'src/components/auth/**/*.{js,jsx,ts,tsx}',
    'src/lib/auth/**/*.{js,jsx,ts,tsx}',
    'src/lib/csp.ts',
    'src/lib/sse-client.ts',
    'src/hooks/use-auth.ts',
    'src/middleware*.ts',
  ],
  
  // Higher coverage thresholds for security tests
  coverageThreshold: {
    global: {
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95,
    },
    // Critical security modules need 100% coverage
    'src/lib/auth/': {
      statements: 100,
      branches: 95,
      functions: 100,
      lines: 100,
    },
    'src/lib/csp.ts': {
      statements: 100,
      branches: 95,
      functions: 100,
      lines: 100,
    },
  },
  
  // Coverage output
  coverageDirectory: '<rootDir>/coverage/security',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // Test execution settings
  verbose: true,
  bail: true, // Stop on first failure for security tests
  maxWorkers: '50%',
  testTimeout: 15000, // Longer timeout for security tests
  
  // Security test specific reporters
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: '<rootDir>/coverage/security/html-report',
      filename: 'security-report.html',
      expand: true,
      pageTitle: 'Vana Security Test Report',
      logoImgPath: undefined,
      hideIcon: true,
    }],
    ['jest-junit', {
      outputDirectory: '<rootDir>/coverage/security',
      outputName: 'security-results.xml',
      suiteName: 'Security Tests',
    }]
  ],
  
  // Security test environment variables
  testEnvironmentOptions: {
    url: 'https://localhost:3000', // Use HTTPS for security tests
  },
  
  // Global setup for security tests
  globalSetup: '<rootDir>/src/__tests__/security/setup.js',
  globalTeardown: '<rootDir>/src/__tests__/security/teardown.js',
  
  // Security-focused test patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
  ],
  
  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  
  // Clear mocks between tests for security isolation
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,
  
  // Fail fast on security issues
  errorOnDeprecated: true,
  
  // Security test specific settings
  detectOpenHandles: true,
  detectLeaks: true,
  forceExit: false,
  
  // Custom matchers for security tests
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/src/__tests__/security/matchers.js'
  ],
};

module.exports = createJestConfig(securityJestConfig);
