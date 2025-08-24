import '@testing-library/jest-dom'
import 'whatwg-fetch'

// Extended DOM APIs
import { TextEncoder, TextDecoder } from 'util'

// Polyfill for Node.js environment
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder
}

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_APP_ENV = 'test'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
      pathname: '/',
      route: '/',
      query: {},
      asPath: '/',
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
  useParams() {
    return {}
  },
  redirect: jest.fn(),
  permanentRedirect: jest.fn(),
  notFound: jest.fn(),
}))

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(),
    getAll: jest.fn(),
  }),
  headers: () => new Map(),
}))

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
    section: 'section',
    article: 'article',
    main: 'main',
    nav: 'nav',
    header: 'header',
    footer: 'footer',
    aside: 'aside',
  },
  AnimatePresence: ({ children }) => children,
  useAnimation: () => ({
    start: jest.fn(),
    stop: jest.fn(),
    set: jest.fn(),
  }),
  useMotionValue: (initial) => ({
    get: () => initial,
    set: jest.fn(),
    destroy: jest.fn(),
  }),
  useTransform: () => jest.fn(),
  useSpring: () => jest.fn(),
}))

// Mock Web APIs
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback
    this.options = options
  }
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return []
  }
}

global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback
  }
  disconnect() {}
  observe() {}
  unobserve() {}
}

global.MutationObserver = class MutationObserver {
  constructor(callback) {
    this.callback = callback
  }
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
}

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
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
  },
  writable: true,
})

// Mock window.history
Object.defineProperty(window, 'history', {
  value: {
    length: 1,
    state: null,
    pushState: jest.fn(),
    replaceState: jest.fn(),
    go: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  },
  writable: true,
})

// Mock console methods for clean test output
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Mock EventSource for SSE testing
global.EventSource = class EventSource {
  constructor(url, options) {
    this.url = url
    this.readyState = 1
    this.onopen = null
    this.onmessage = null
    this.onerror = null
    setTimeout(() => {
      if (this.onopen) this.onopen({})
    }, 0)
  }
  
  close() {
    this.readyState = 2
  }
  
  addEventListener(event, handler) {
    this[`on${event}`] = handler
  }
  
  removeEventListener() {}
}

// Mock WebSocket
global.WebSocket = class WebSocket {
  constructor(url, protocols) {
    this.url = url
    this.protocols = protocols
    this.readyState = 1
    this.onopen = null
    this.onmessage = null
    this.onerror = null
    this.onclose = null
  }
  
  send() {}
  close() {
    this.readyState = 3
  }
}

// Mock crypto for testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => '12345678-1234-5678-9012-123456789012',
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    },
  },
})

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = (callback) => {
  return setTimeout(callback, 16)
}
global.cancelAnimationFrame = (id) => {
  clearTimeout(id)
}

// Custom test utilities
export const createMockUser = (overrides = {}) => ({
  id: '123',
  email: 'test@example.com',
  name: 'Test User',
  avatar: null,
  role: 'user',
  ...overrides,
})

export const createMockAgent = (overrides = {}) => ({
  id: 'agent-1',
  name: 'Test Agent',
  type: 'researcher',
  status: 'idle',
  capabilities: ['research', 'analysis'],
  avatar: null,
  ...overrides,
})

export const createMockSession = (overrides = {}) => ({
  id: 'session-1',
  title: 'Test Session',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  userId: '123',
  agents: [],
  messages: [],
  ...overrides,
})

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()
  
  // Reset localStorage
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
})

// Global test teardown
afterEach(() => {
  // Cleanup after each test
  jest.restoreAllMocks()
})

// Suppress specific warnings in tests
const originalWarn = console.warn
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: Function components cannot be given refs') ||
     args[0].includes('Warning: forwardRef render functions accept exactly two parameters'))
  ) {
    return
  }
  originalWarn.apply(console, args)
}

// Add custom matchers
expect.extend({
  toBeInTheDocument: require('@testing-library/jest-dom/matchers').toBeInTheDocument,
  toHaveClass: require('@testing-library/jest-dom/matchers').toHaveClass,
  toHaveStyle: require('@testing-library/jest-dom/matchers').toHaveStyle,
})