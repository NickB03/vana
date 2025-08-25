import { vi } from 'vitest'
import '@testing-library/jest-dom'
import 'whatwg-fetch'

// Extended DOM APIs
import { TextEncoder, TextDecoder } from 'util'

// Polyfill for Node.js environment
Object.assign(global, { TextDecoder, TextEncoder })

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_APP_ENV = 'test'

// Mock next/navigation for Vitest
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    pathname: '/',
    route: '/',
    query: {},
    asPath: '/',
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({}),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  notFound: vi.fn(),
}))

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
    getAll: vi.fn(),
  }),
  headers: () => new Map(),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => {
    // Return a simple mock component
    return props
  },
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
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
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  }),
  useMotionValue: (initial: any) => ({
    get: () => initial,
    set: vi.fn(),
    destroy: vi.fn(),
  }),
  useTransform: () => vi.fn(),
  useSpring: () => vi.fn(),
}))

// Mock Web APIs
class MockIntersectionObserver {
  constructor(public callback: IntersectionObserverCallback, public options?: IntersectionObserverInit) {}
  disconnect = vi.fn()
  observe = vi.fn()
  unobserve = vi.fn()
  takeRecords = vi.fn(() => [])
}

class MockResizeObserver {
  constructor(public callback: ResizeObserverCallback) {}
  disconnect = vi.fn()
  observe = vi.fn()
  unobserve = vi.fn()
}

class MockMutationObserver {
  constructor(public callback: MutationCallback) {}
  disconnect = vi.fn()
  observe = vi.fn()
  takeRecords = vi.fn(() => [])
}

Object.assign(global, {
  IntersectionObserver: MockIntersectionObserver,
  ResizeObserver: MockResizeObserver,
  MutationObserver: MockMutationObserver,
})

// Mock matchMedia
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
})

// Mock localStorage and sessionStorage
const createStorageMock = () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
})

Object.defineProperties(window, {
  localStorage: {
    value: createStorageMock(),
    writable: true,
  },
  sessionStorage: {
    value: createStorageMock(),
    writable: true,
  },
})

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:5174',
    origin: 'http://localhost:5174',
    protocol: 'http:',
    host: 'localhost:5174',
    hostname: 'localhost',
    port: '5174',
    pathname: '/',
    search: '',
    hash: '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  },
  writable: true,
})

// Mock window.history
Object.defineProperty(window, 'history', {
  value: {
    length: 1,
    state: null,
    pushState: vi.fn(),
    replaceState: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  },
  writable: true,
})

// Mock EventSource for SSE testing
class MockEventSource {
  public url: string
  public readyState: number = 1
  public onopen: ((event: Event) => void) | null = null
  public onmessage: ((event: MessageEvent) => void) | null = null
  public onerror: ((event: Event) => void) | null = null

  constructor(url: string, options?: EventSourceInit) {
    this.url = url
    setTimeout(() => {
      if (this.onopen) this.onopen(new Event('open'))
    }, 0)
  }

  close() {
    this.readyState = 2
  }

  addEventListener(event: string, handler: EventListener) {
    ;(this as any)[`on${event}`] = handler
  }

  removeEventListener() {}

  dispatchEvent() {
    return true
  }
}

// Mock WebSocket
class MockWebSocket {
  public url: string
  public protocols?: string | string[]
  public readyState: number = 1
  public onopen: ((event: Event) => void) | null = null
  public onmessage: ((event: MessageEvent) => void) | null = null
  public onerror: ((event: Event) => void) | null = null
  public onclose: ((event: CloseEvent) => void) | null = null

  constructor(url: string, protocols?: string | string[]) {
    this.url = url
    this.protocols = protocols
  }

  send() {}
  close() {
    this.readyState = 3
  }
}

Object.assign(global, {
  EventSource: MockEventSource,
  WebSocket: MockWebSocket,
})

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => '12345678-1234-5678-9012-123456789012',
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    },
    subtle: {
      digest: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    },
  },
})

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  return setTimeout(callback, 16) as unknown as number
})
global.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id)
})

// Mock requestIdleCallback
global.requestIdleCallback = vi.fn((callback) => {
  return setTimeout(callback, 1) as unknown as number
})
global.cancelIdleCallback = vi.fn((id) => {
  clearTimeout(id)
})

// Custom test utilities for Vitest
export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: '123',
  email: 'test@example.com',
  name: 'Test User',
  avatar: null,
  role: 'user',
  ...overrides,
})

export const createMockAgent = (overrides: Partial<any> = {}) => ({
  id: 'agent-1',
  name: 'Test Agent',
  type: 'researcher',
  status: 'idle',
  capabilities: ['research', 'analysis'],
  avatar: null,
  ...overrides,
})

export const createMockSession = (overrides: Partial<any> = {}) => ({
  id: 'session-1',
  title: 'Test Session',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  userId: '123',
  agents: [],
  messages: [],
  ...overrides,
})

// Mock console methods for clean test output
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: Function components cannot be given refs'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: Function components cannot be given refs') ||
       args[0].includes('Warning: forwardRef render functions'))
    ) {
      return
    }
    originalWarn.apply(console, args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})

// Global test setup for each test
beforeEach(() => {
  vi.clearAllMocks()
  vi.clearAllTimers()
})

// Global test cleanup
afterEach(() => {
  vi.restoreAllMocks()
})