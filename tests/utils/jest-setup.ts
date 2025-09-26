/**
 * Jest Setup Configuration for Chat Actions Testing
 * Global test utilities and mocks
 */

import '@testing-library/jest-dom';
import 'jest-axe/extend-expect';
import { configure } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 10000,
  computedStyleSupportsPseudoElements: true
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
  }

  private callback: IntersectionObserverCallback;
  private options?: IntersectionObserverInit;
  public root: Element | null = null;
  public rootMargin: string = '0px';
  public thresholds: ReadonlyArray<number> = [0];

  observe(target: Element) {
    // Immediately trigger intersection for testing
    this.callback([{
      target,
      isIntersecting: true,
      intersectionRatio: 1,
      intersectionRect: target.getBoundingClientRect(),
      boundingClientRect: target.getBoundingClientRect(),
      rootBounds: null,
      time: Date.now()
    }], this);
  }

  unobserve() {}
  disconnect() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  private callback: ResizeObserverCallback;

  observe(target: Element) {
    // Trigger resize for testing
    this.callback([{
      target,
      contentRect: target.getBoundingClientRect(),
      borderBoxSize: [{
        blockSize: 100,
        inlineSize: 100
      }],
      contentBoxSize: [{
        blockSize: 100,
        inlineSize: 100
      }],
      devicePixelContentBoxSize: [{
        blockSize: 100,
        inlineSize: 100
      }]
    }], this);
  }

  unobserve() {}
  disconnect() {}
};

// Mock EventSource for SSE testing
global.EventSource = class EventSource {
  constructor(url: string, options?: EventSourceInit) {
    this.url = url;
    this.readyState = EventSource.CONNECTING;

    // Simulate connection after short delay
    setTimeout(() => {
      this.readyState = EventSource.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly url: string;
  readyState: number;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  addEventListener(type: string, listener: EventListener) {
    if (type === 'open') this.onopen = listener as any;
    if (type === 'message') this.onmessage = listener as any;
    if (type === 'error') this.onerror = listener as any;
  }

  removeEventListener(type: string, listener: EventListener) {
    if (type === 'open' && this.onopen === listener) this.onopen = null;
    if (type === 'message' && this.onmessage === listener) this.onmessage = null;
    if (type === 'error' && this.onerror === listener) this.onerror = null;
  }

  close() {
    this.readyState = EventSource.CLOSED;
  }

  // Helper for testing - simulate receiving message
  _simulateMessage(data: string, eventType?: string) {
    if (this.readyState === EventSource.OPEN && this.onmessage) {
      const event = new MessageEvent('message', {
        data,
        type: eventType || 'message'
      });
      this.onmessage(event);
    }
  }

  // Helper for testing - simulate error
  _simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
} as any;

// Mock performance API
if (!global.performance) {
  global.performance = {
    now: () => Date.now(),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn()
  } as any;
}

// Mock performance.memory for Chrome
Object.defineProperty(global.performance, 'memory', {
  value: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 10000000
  },
  writable: true
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn()
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock crypto for uuid generation
if (!global.crypto) {
  global.crypto = {
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }
  } as any;
}

// Mock console methods for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  // Suppress expected error messages during testing
  console.error = jest.fn((message) => {
    // Only suppress React error boundary errors and other expected errors
    if (
      typeof message === 'string' &&
      (message.includes('Error: Uncaught [React Error Boundary]') ||
       message.includes('Warning: ReactDOM.render is no longer supported'))
    ) {
      return;
    }
    originalError(message);
  });

  console.warn = jest.fn((message) => {
    // Suppress common warnings
    if (
      typeof message === 'string' &&
      (message.includes('componentWillReceiveProps has been renamed') ||
       message.includes('componentWillMount has been renamed'))
    ) {
      return;
    }
    originalWarn(message);
  });
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test helpers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): R;
      toHaveLoadedWithin(ms: number): R;
      toHaveRenderedWithin(ms: number): R;
    }
  }

  interface Window {
    EventSource: typeof EventSource;
  }
}

// Custom Jest matchers
expect.extend({
  toBeAccessible(received) {
    const pass = received.getAttribute('aria-label') !== null ||
                 received.getAttribute('aria-labelledby') !== null ||
                 received.getAttribute('role') !== null;

    return {
      message: () =>
        pass
          ? `expected element not to be accessible`
          : `expected element to be accessible (have aria-label, aria-labelledby, or role)`,
      pass
    };
  },

  toHaveLoadedWithin(received, ms) {
    const loadTime = received.dataset.loadTime || '0';
    const actualMs = parseInt(loadTime);
    const pass = actualMs <= ms;

    return {
      message: () =>
        pass
          ? `expected element not to have loaded within ${ms}ms`
          : `expected element to have loaded within ${ms}ms, but took ${actualMs}ms`,
      pass
    };
  },

  toHaveRenderedWithin(received, ms) {
    const renderTime = received.dataset.renderTime || '0';
    const actualMs = parseInt(renderTime);
    const pass = actualMs <= ms;

    return {
      message: () =>
        pass
          ? `expected element not to have rendered within ${ms}ms`
          : `expected element to have rendered within ${ms}ms, but took ${actualMs}ms`,
      pass
    };
  }
});

// Default MSW server for API mocking
export const defaultServer = setupServer(
  // Default chat API endpoints
  rest.post('/api/chat/send', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      messageId: 'test-message-id',
      content: 'Test response'
    }));
  }),

  rest.post('/api/chat/regenerate', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      messageId: 'regenerated-message-id'
    }));
  }),

  rest.put('/api/chat/messages/:messageId/edit', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      message: {
        id: ctx.params.messageId,
        content: 'Edited content'
      }
    }));
  }),

  rest.delete('/api/chat/messages/:messageId', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      deletedMessageIds: [ctx.params.messageId]
    }));
  }),

  rest.post('/api/chat/feedback', (req, res, ctx) => {
    return res(ctx.json({
      success: true
    }));
  }),

  rest.get('/api/chat/sessions/:sessionId', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      session: {
        id: ctx.params.sessionId,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    }));
  })
);

// Start server before all tests
beforeAll(() => {
  defaultServer.listen({ onUnhandledRequest: 'warn' });
});

// Reset handlers between tests
afterEach(() => {
  defaultServer.resetHandlers();
  jest.clearAllMocks();

  // Clear all storage mocks
  localStorageMock.clear.mockClear();
  sessionStorageMock.clear.mockClear();
});

// Close server after all tests
afterAll(() => {
  defaultServer.close();
});

// Global test utilities
export const testUtils = {
  // Simulate typing with realistic delays
  async typeText(element: HTMLElement, text: string, delay: number = 50) {
    for (let i = 0; i < text.length; i++) {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: text[i] }));
      (element as HTMLInputElement).value += text[i];
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { key: text[i] }));

      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },

  // Simulate paste event
  async pasteText(element: HTMLElement, text: string) {
    const clipboardEvent = new ClipboardEvent('paste', {
      clipboardData: new DataTransfer()
    });
    clipboardEvent.clipboardData?.setData('text/plain', text);
    element.dispatchEvent(clipboardEvent);
  },

  // Wait for animation to complete
  async waitForAnimation(duration: number = 300) {
    await new Promise(resolve => setTimeout(resolve, duration));
  },

  // Mock network conditions
  mockSlowNetwork() {
    defaultServer.use(
      rest.post('/api/chat/*', (req, res, ctx) => {
        return res(ctx.delay(2000), ctx.json({ success: true }));
      })
    );
  },

  mockFastNetwork() {
    defaultServer.use(
      rest.post('/api/chat/*', (req, res, ctx) => {
        return res(ctx.delay(50), ctx.json({ success: true }));
      })
    );
  },

  // Performance measurement helpers
  measureRenderTime: async (renderFn: () => Promise<void>): Promise<number> => {
    const start = performance.now();
    await renderFn();
    return performance.now() - start;
  },

  // Memory usage helpers
  measureMemoryUsage: (): number => {
    return (performance as any).memory?.usedJSHeapSize || 0;
  },

  // Accessibility testing helpers
  async checkAccessibility(container: HTMLElement) {
    const { axe } = await import('jest-axe');
    const results = await axe(container);
    return results;
  }
};

// Export commonly used testing utilities
export {
  screen,
  render,
  fireEvent,
  waitFor,
  act,
  cleanup
} from '@testing-library/react';

export { userEvent } from '@testing-library/user-event';
export { rest, setupServer } from 'msw';
export { axe } from 'jest-axe';