import '@testing-library/jest-dom'
import 'jest-fetch-mock'
// import './__tests__/setup/test-environment'  // Disabled due to MSW issues
// import { server } from './__tests__/mocks/server'

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Add Node.js polyfills for browser APIs
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}

if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock fetch
global.fetch = require('jest-fetch-mock');

// Mock EventSource for SSE testing
global.EventSource = class EventSource {
  constructor(url) {
    this.url = url;
    this.readyState = EventSource.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    
    // Simulate connection
    setTimeout(() => {
      this.readyState = EventSource.OPEN;
      if (this.onopen) this.onopen({});
    }, 10);
  }
  
  close() {
    this.readyState = EventSource.CLOSED;
  }
  
  addEventListener(event, handler) {
    if (event === 'open') this.onopen = handler;
    if (event === 'message') this.onmessage = handler;
    if (event === 'error') this.onerror = handler;
  }
  
  removeEventListener() {}
  
  // Mock sending messages
  _sendMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }
  
  _sendError(error) {
    if (this.onerror) {
      this.onerror(error);
    }
  }
};

EventSource.CONNECTING = 0;
EventSource.OPEN = 1;
EventSource.CLOSED = 2;

// Start MSW server
// beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});
// afterAll(() => server.close());

// Add custom matchers
expect.extend({
  toBeValidResponse(received) {
    const pass = received && 
                  typeof received.status === 'number' && 
                  received.status >= 200 && 
                  received.status < 300;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid response`,
        pass: false,
      };
    }
  },
});