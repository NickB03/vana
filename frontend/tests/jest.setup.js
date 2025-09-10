/**
 * Jest Setup for Vana Frontend Tests
 * Configures testing environment and global test utilities
 */

import '@testing-library/jest-dom';

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH = 'false';
process.env.NODE_ENV = 'test';

// Mock window.EventSource for SSE testing
global.EventSource = class MockEventSource {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    
    // Store instance for test access
    MockEventSource.instances.push(this);
    
    // Simulate connection
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }
  
  close() {
    this.readyState = 2; // CLOSED
  }
  
  // Test utilities
  static instances = [];
  static reset() {
    MockEventSource.instances = [];
  }
  static getLatest() {
    return MockEventSource.instances[MockEventSource.instances.length - 1];
  }
};

// Mock fetch with default behavior
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    headers: new Map(),
  })
);

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock window.location
delete window.location;
window.location = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  reload: jest.fn(),
  replace: jest.fn(),
  assign: jest.fn(),
};

// Mock navigator
Object.defineProperty(window.navigator, 'userAgent', {
  value: 'Mozilla/5.0 (test environment)',
  configurable: true,
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock performance.now()
global.performance.now = jest.fn(() => Date.now());

// Mock console methods for cleaner test output
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset fetch mock
  fetch.mockClear();
  
  // Clear storage
  localStorage.clear();
  sessionStorage.clear();
  
  // Reset EventSource instances
  global.EventSource.reset();
  
  // Clean up any timers if fake timers are active
  try {
    jest.runOnlyPendingTimers();
  } catch (error) {
    // Ignore timer cleanup errors if fake timers are not active
  }
  
  try {
    jest.useRealTimers();
  } catch (error) {
    // Ignore if real timers are already active
  }
});

// Global test utilities
global.testUtils = {
  // Create mock SSE event
  createSSEEvent: (type, data) => ({
    event: type,
    data: JSON.stringify(data),
  }),
  
  // Create mock message event for EventSource
  createMessageEvent: (data) => new MessageEvent('message', {
    data: JSON.stringify(data),
  }),
  
  // Wait for async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock API response
  mockApiResponse: (data, options = {}) => ({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    ...options,
  }),
  
  // Mock API error
  mockApiError: (status = 500, message = 'Internal Server Error') => ({
    ok: false,
    status,
    statusText: message,
    json: () => Promise.resolve({ message }),
  }),
};

// Console warnings for common test issues
const originalWarn = console.warn;
console.warn = (...args) => {
  // Suppress specific warnings
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('componentWillReceiveProps') ||
     message.includes('componentWillMount') ||
     message.includes('componentWillUpdate'))
  ) {
    return;
  }
  originalWarn.apply(console, args);
};