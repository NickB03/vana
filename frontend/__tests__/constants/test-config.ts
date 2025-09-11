/**
 * Test Configuration Constants
 * 
 * Centralized configuration for test values including secrets, credentials,
 * and other test-specific data that should not be hardcoded throughout tests.
 */

// Test User Credentials
export const TEST_CREDENTIALS = {
  VALID_USER: {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'password123',
  },
  INVALID_USER: {
    email: process.env.TEST_INVALID_EMAIL || 'wrong@example.com',
    password: process.env.TEST_INVALID_PASSWORD || 'wrongpassword',
  },
  MALFORMED_EMAIL: {
    email: 'invalid-email',
    password: process.env.TEST_USER_PASSWORD || 'password123',
  },
} as const;

// Integration Test User
export const INTEGRATION_USER = {
  email: process.env.INTEGRATION_USER_EMAIL || 'integration@test.com',
  password: process.env.INTEGRATION_USER_PASSWORD || 'IntegrationTest123!',
} as const;

// E2E Test User
export const E2E_USER = {
  email: process.env.E2E_USER_EMAIL || 'e2e@test.com',
  password: process.env.E2E_USER_PASSWORD || 'TestPassword123!',
} as const;

// Test API Tokens
export const TEST_TOKENS = {
  MOCK_JWT: process.env.TEST_MOCK_JWT || 'mock_jwt_token_12345',
  MOCK_REFRESH: process.env.TEST_MOCK_REFRESH || 'mock_refreshed_jwt_token_67890',
  E2E_TOKEN: process.env.TEST_E2E_TOKEN || 'mock_jwt_token_e2e',
  SUCCESS_TOKEN: process.env.TEST_SUCCESS_TOKEN || 'success-token',
  CONCURRENT_TOKEN: process.env.TEST_CONCURRENT_TOKEN || 'concurrent-token',
  LOGIN_TOKEN: process.env.TEST_LOGIN_TOKEN || 'login-token',
  NEW_REFRESH_TOKEN: process.env.TEST_NEW_REFRESH_TOKEN || 'new_refreshed_token',
  BACKEND_TOKEN: process.env.TEST_BACKEND_TOKEN || 'mock-jwt-token-for-testing',
  GENERIC_TOKEN: process.env.TEST_GENERIC_TOKEN || 'mock_test_token',
} as const;

// Test User Data
export const TEST_USERS = {
  DEFAULT: {
    id: process.env.TEST_USER_ID || 'user_123',
    email: TEST_CREDENTIALS.VALID_USER.email,
    name: process.env.TEST_USER_NAME || 'Test User',
  },
  CONCURRENT: {
    id: process.env.TEST_CONCURRENT_USER_ID || 'concurrent_user',
    email: TEST_CREDENTIALS.VALID_USER.email,
    name: process.env.TEST_CONCURRENT_USER_NAME || 'Concurrent User',
  },
} as const;

// Test Storage Keys
export const TEST_STORAGE_KEYS = {
  AUTH_TOKEN: process.env.TEST_AUTH_TOKEN_KEY || 'vana_auth_token',
  USER_DATA: process.env.TEST_USER_DATA_KEY || 'vana_user_data',
} as const;

// Test Secret/Debug Configuration
export const TEST_DEBUG_CONFIG = {
  // Phoenix debug endpoint secret (should be loaded from environment)
  PHOENIX_SECRET: process.env.TEST_PHOENIX_SECRET || 'TEST-PHOENIX-SECRET',
  DEBUG_ENDPOINT: process.env.TEST_DEBUG_ENDPOINT || '/api/debug/phoenix-test',
} as const;

// Test Password Reset
export const TEST_RESET_CONFIG = {
  VALID_TOKEN: process.env.TEST_VALID_RESET_TOKEN || 'valid_reset_token',
  NEW_PASSWORD: process.env.TEST_NEW_PASSWORD || 'NewSecurePassword123!',
} as const;

// Test API Configuration
export const TEST_API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  TIMEOUT: parseInt(process.env.TEST_API_TIMEOUT || '10000'),
  RETRY_ATTEMPTS: parseInt(process.env.TEST_API_RETRY_ATTEMPTS || '3'),
} as const;

// Test Environment Validation
export const validateTestConfig = () => {
  const warnings: string[] = [];
  
  if (!process.env.TEST_PHOENIX_SECRET) {
    warnings.push('TEST_PHOENIX_SECRET not set, using default test value');
  }
  
  if (!process.env.TEST_USER_EMAIL) {
    warnings.push('TEST_USER_EMAIL not set, using default test email');
  }
  
  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('Test Configuration Warnings:', warnings);
  }
};

// Export type definitions for TypeScript
export type TestCredentials = typeof TEST_CREDENTIALS.VALID_USER;
export type TestUser = typeof TEST_USERS.DEFAULT;
export type TestTokens = typeof TEST_TOKENS;

// Initialize validation
validateTestConfig();