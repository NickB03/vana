/**
 * Test Environment Setup for Backend Integration
 * 
 * Configures the testing environment to work with both real backend
 * and mock fallbacks, ensuring comprehensive testing capabilities.
 */

import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import { backendTestUtils, createConditionalHandlers } from '../mocks/backend-handlers';

// Conditionally import MSW server only if needed
let server: any = null;
try {
  const mswModule = require('../mocks/server');
  server = mswModule.server;
} catch (error) {
  console.warn('MSW server not available, using direct backend testing');
}

// Global test configuration
interface TestEnvironmentConfig {
  useRealBackend: boolean;
  backendUrl: string;
  testTimeout: number;
  setupComplete: boolean;
}

const testConfig: TestEnvironmentConfig = {
  useRealBackend: false,
  backendUrl: 'http://localhost:8000',
  testTimeout: 30000,
  setupComplete: false
};

// Make config available globally
(global as any).__TEST_CONFIG__ = testConfig;

/**
 * Setup test environment with backend detection
 */
export async function setupTestEnvironment() {
  if (testConfig.setupComplete) {
    return testConfig;
  }

  console.log('🗺️ Setting up test environment...');

  try {
    // Check if real backend is available
    const { useRealBackend } = await backendTestUtils.setupMSW();
    testConfig.useRealBackend = useRealBackend;

    // Configure MSW with appropriate handlers
    const handlers = createConditionalHandlers(useRealBackend);
    server.resetHandlers(...handlers);

    // Start MSW server if not already started
    if (!server.listHandlers().length && !useRealBackend) {
      server.listen({
        onUnhandledRequest: 'warn'
      });
    }

    testConfig.setupComplete = true;
    console.log(`✅ Test environment ready (Backend: ${useRealBackend ? 'Real' : 'Mock'})`);

  } catch (error) {
    console.error('❌ Test environment setup failed:', error);
    throw error;
  }

  return testConfig;
}

/**
 * Cleanup test environment
 */
export function cleanupTestEnvironment() {
  if (server.listHandlers().length) {
    server.close();
  }
  testConfig.setupComplete = false;
  console.log('🧹 Test environment cleaned up');
}

/**
 * Global test setup hook
 */
beforeAll(async () => {
  await setupTestEnvironment();
}, 30000);

/**
 * Global test cleanup hook
 */
afterAll(() => {
  cleanupTestEnvironment();
});

/**
 * Reset handlers before each test
 */
beforeEach(() => {
  if (!testConfig.useRealBackend) {
    server.resetHandlers();
  }
});

/**
 * Test utilities available globally
 */
export const globalTestUtils = {
  /**
   * Get current test configuration
   */
  getConfig: () => testConfig,

  /**
   * Check if using real backend
   */
  isUsingRealBackend: () => testConfig.useRealBackend,

  /**
   * Skip test if real backend is not available
   */
  skipIfNoBackend: () => {
    if (!testConfig.useRealBackend) {
      console.log('⏭️ Skipping test - real backend not available');
      return true;
    }
    return false;
  },

  /**
   * Skip test if using mock backend
   */
  skipIfMockBackend: () => {
    if (testConfig.useRealBackend) {
      console.log('⏭️ Skipping test - using real backend');
      return true;
    }
    return false;
  },

  /**
   * Wait for backend to be ready
   */
  async waitForBackend(maxAttempts: number = 10): Promise<boolean> {
    if (!testConfig.useRealBackend) {
      return true; // Mock backend is always ready
    }

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${testConfig.backendUrl}/health`, {
          signal: AbortSignal.timeout(2000)
        });
        if (response.ok) {
          return true;
        }
      } catch (error) {
        console.log(`Backend check attempt ${i + 1}/${maxAttempts} failed`);
      }

      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return false;
  },

  /**
   * Create test timeout based on backend type
   */
  getTestTimeout: (baseTimeout: number = 10000) => {
    return testConfig.useRealBackend ? baseTimeout * 2 : baseTimeout;
  }
};

// Make utilities available globally
(global as any).__TEST_UTILS__ = globalTestUtils;

// Custom Jest matchers for backend integration
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeHealthyBackendResponse(): R;
      toBeValidApiResponse(): R;
      toHaveStreamingContent(): R;
    }
  }
}

// Add custom matchers
expect.extend({
  toBeHealthyBackendResponse(received) {
    const isHealthy = received && 
      (received.status === 'healthy' || received.status === 'ok') &&
      received.service === 'vana' &&
      received.timestamp;
    
    return {
      message: () => `expected ${JSON.stringify(received)} to be a healthy backend response`,
      pass: isHealthy
    };
  },

  toBeValidApiResponse(received) {
    const isValid = received && 
      typeof received === 'object' &&
      !received.error;
    
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid API response`,
      pass: isValid
    };
  },

  toHaveStreamingContent(received) {
    const hasContent = received &&
      (received.content !== undefined || received.error) &&
      typeof received.isComplete === 'boolean';
    
    return {
      message: () => `expected ${JSON.stringify(received)} to have streaming content`,
      pass: hasContent
    };
  }
});

// Export configuration for external access
export { testConfig };
