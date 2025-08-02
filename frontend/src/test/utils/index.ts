/**
 * Test Utilities Index
 * 
 * Central export point for all test utilities
 */

// Render helpers
export * from './render-helpers';

// Event simulators
export * from './event-simulators';

// Mock services
export * from './mock-services';

// Performance helpers
export * from './performance-helpers';

// Common test data generators
export const generateTestId = (prefix = 'test') => 
  `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

export const generateMockTimestamp = (offsetMs = 0) => 
  new Date(Date.now() + offsetMs).toISOString();

export const createMockPromise = <T>(
  resolveValue?: T,
  delayMs = 0,
  shouldReject = false
): Promise<T> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldReject) {
        reject(new Error('Mock promise rejected'));
      } else {
        resolve(resolveValue as T);
      }
    }, delayMs);
  });
};

// Test environment helpers
export const isTestEnvironment = () => 
  process.env.NODE_ENV === 'test' || 
  typeof global.it === 'function';

export const setupTestEnvironment = () => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  };

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  };

  // Mock requestAnimationFrame
  global.requestAnimationFrame = (callback: FrameRequestCallback) => {
    return setTimeout(callback, 16);
  };

  global.cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };
};

// Debug helpers for tests
export const debugTest = (message: string, data?: any) => {
  if (process.env.DEBUG_TESTS === 'true') {
    console.log(`[TEST DEBUG] ${message}`, data || '');
  }
};

export const logTestPerformance = (testName: string, startTime: number) => {
  const duration = performance.now() - startTime;
  debugTest(`Test "${testName}" completed in ${duration.toFixed(2)}ms`);
};

// Cleanup helpers
export const createTestCleanup = () => {
  const cleanupFunctions: (() => void)[] = [];

  const addCleanupFunction = (fn: () => void) => {
    cleanupFunctions.push(fn);
  };

  const runCleanup = () => {
    cleanupFunctions.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.error('Cleanup function error:', error);
      }
    });
    cleanupFunctions.length = 0;
  };

  return {
    addCleanupFunction,
    runCleanup,
  };
};

// Wait utilities
export const waitFor = (ms: number) => 
  new Promise(resolve => setTimeout(resolve, ms));

export const waitForCondition = async (
  condition: () => boolean,
  timeoutMs = 5000,
  intervalMs = 100
): Promise<void> => {
  const startTime = Date.now();
  
  while (!condition()) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Condition not met within ${timeoutMs}ms`);
    }
    await waitFor(intervalMs);
  }
};

// Error assertion helpers
export const expectToThrow = async (
  fn: () => Promise<any> | any,
  expectedError?: string | RegExp
) => {
  let thrownError: Error | null = null;

  try {
    const result = fn();
    if (result instanceof Promise) {
      await result;
    }
  } catch (error) {
    thrownError = error as Error;
  }

  expect(thrownError).not.toBeNull();
  
  if (expectedError) {
    if (typeof expectedError === 'string') {
      expect(thrownError!.message).toContain(expectedError);
    } else {
      expect(thrownError!.message).toMatch(expectedError);
    }
  }
};

// Array/Object comparison helpers
export const expectArrayToContainObject = (
  array: any[],
  expectedObject: Record<string, any>
) => {
  const found = array.some(item => {
    return Object.keys(expectedObject).every(key => 
      item[key] === expectedObject[key]
    );
  });

  expect(found).toBe(true);
};

export const expectObjectToMatchPartial = (
  actual: Record<string, any>,
  expected: Record<string, any>
) => {
  Object.keys(expected).forEach(key => {
    expect(actual).toHaveProperty(key, expected[key]);
  });
};

// Custom matchers for vitest
export const customMatchers = {
  toHaveBeenCalledWithObjectContaining: (
    mockFn: any,
    expectedObject: Record<string, any>
  ) => {
    const calls = mockFn.mock.calls;
    const found = calls.some((call: any[]) => 
      call.some(arg => 
        typeof arg === 'object' &&
        Object.keys(expectedObject).every(key => arg[key] === expectedObject[key])
      )
    );

    return {
      pass: found,
      message: () => 
        found 
          ? `Expected mock not to have been called with object containing ${JSON.stringify(expectedObject)}`
          : `Expected mock to have been called with object containing ${JSON.stringify(expectedObject)}`,
    };
  },
};

// Test data factories
export const createTestDataFactory = <T>(
  defaultData: T,
  overrideGenerator?: (overrides: Partial<T>) => Partial<T>
) => {
  return (overrides: Partial<T> = {}): T => {
    const processedOverrides = overrideGenerator 
      ? overrideGenerator(overrides) 
      : overrides;
    
    return {
      ...defaultData,
      ...processedOverrides,
    };
  };
};

// Export test setup function
export { setupTestEnvironment as setup };