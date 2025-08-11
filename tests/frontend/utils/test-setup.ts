import '@testing-library/jest-dom'
import { vi } from 'vitest'
import 'whatwg-fetch'

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock window.crypto
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => crypto.randomUUID(),
    subtle: {
      digest: vi.fn()
    }
  }
})

// Mock EventSource for SSE testing
class MockEventSource {
  public url: string
  public readyState: number = 1
  public onopen: ((event: Event) => void) | null = null
  public onmessage: ((event: MessageEvent) => void) | null = null
  public onerror: ((event: Event) => void) => null = null
  public addEventListener = vi.fn()
  public removeEventListener = vi.fn()
  public close = vi.fn()
  public dispatchEvent = vi.fn()

  constructor(url: string) {
    this.url = url
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }
}

global.EventSource = MockEventSource as any

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
}
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue('')
  }
})

// Mock File API
global.File = class MockFile {
  name: string
  size: number
  type: string
  lastModified: number

  constructor(bits: any[], filename: string, options: any = {}) {
    this.name = filename
    this.size = bits.reduce((acc, bit) => acc + (bit.length || bit.size || 0), 0)
    this.type = options.type || ''
    this.lastModified = options.lastModified || Date.now()
  }
} as any

global.FileReader = class MockFileReader {
  readAsText = vi.fn().mockImplementation(function(file) {
    setTimeout(() => {
      this.onload?.({ target: { result: file.name + ' content' } })
    }, 0)
  })
  onload: ((event: any) => void) | null = null
} as any

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-url')
global.URL.revokeObjectURL = vi.fn()

// Mock performance API
global.performance.mark = vi.fn()
global.performance.measure = vi.fn()
global.performance.getEntriesByName = vi.fn(() => [])
global.performance.getEntriesByType = vi.fn(() => [])
global.performance.clearMarks = vi.fn()
global.performance.clearMeasures = vi.fn()

// Mock console methods to reduce test noise
const originalConsoleError = console.error
console.error = (...args) => {
  // Suppress specific React warnings in tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
     args[0].includes('Warning: useLayoutEffect'))
  ) {
    return
  }
  originalConsoleError.call(console, ...args)
}

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
  localStorageMock.clear()
  sessionStorageMock.clear()
})

// Global test utilities
global.testUtils = {
  createMockUser: () => ({
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg'
  }),
  
  createMockMessage: (overrides = {}) => ({
    id: 'msg-123',
    role: 'user',
    content: 'Test message',
    timestamp: Date.now(),
    ...overrides
  }),
  
  createMockSession: (overrides = {}) => ({
    id: 'session-123',
    title: 'Test Session',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    origin: 'homepage',
    ...overrides
  }),
  
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
}