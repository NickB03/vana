import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn()
};

// Mock ResizeObserver for Radix UI components
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Mock localStorage for Supabase Auth
// This prevents "storage.getItem is not a function" errors during async cleanup
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Clear localStorage between tests
afterEach(() => {
  localStorageMock.clear();
});

// Mock window.matchMedia for media query tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Note: The "Timeout waiting for worker to respond" error during close is a known
// Vitest 4.x issue with the pool runner. It doesn't affect test results - all tests
// pass successfully. The error occurs during worker cleanup, not during test execution.
// See: https://github.com/vitest-dev/vitest/issues/3077