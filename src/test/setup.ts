import '@testing-library/jest-dom';
import { vi } from 'vitest';

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