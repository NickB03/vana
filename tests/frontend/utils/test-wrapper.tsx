import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { ThemeProvider } from '@/contexts/ThemeProvider'

interface TestWrapperProps {
  children: React.ReactNode
  initialRoute?: string
  queryClient?: QueryClient
  mockAuth?: {
    user?: any
    loading?: boolean
  }
}

const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0
    },
    mutations: {
      retry: false
    }
  }
})

export const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  initialRoute = '/',
  queryClient = defaultQueryClient,
  mockAuth
}) => {
  // Mock router for testing
  const MockRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (initialRoute === '/') {
      return <BrowserRouter>{children}</BrowserRouter>
    }
    
    // For specific routes, we can use MemoryRouter
    const { MemoryRouter } = require('react-router-dom')
    return (
      <MemoryRouter initialEntries={[initialRoute]}>
        {children}
      </MemoryRouter>
    )
  }

  // Mock auth provider for testing
  const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (mockAuth) {
      const mockAuthValue = {
        user: mockAuth.user || null,
        loading: mockAuth.loading || false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        getToken: vi.fn().mockResolvedValue('mock-token'),
        ...mockAuth
      }
      
      const AuthContext = React.createContext(mockAuthValue)
      return <AuthContext.Provider value={mockAuthValue}>{children}</AuthContext.Provider>
    }
    
    return <AuthProvider>{children}</AuthProvider>
  }

  return (
    <MockRouter>
      <QueryClientProvider client={queryClient}>
        <MockAuthProvider>
          <ThemeProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </MockAuthProvider>
      </QueryClientProvider>
    </MockRouter>
  )
}

// Helper for rendering with React Testing Library
export const renderWithProviders = (
  ui: React.ReactElement,
  options: Omit<TestWrapperProps, 'children'> = {}
) => {
  const { render } = require('@testing-library/react')
  return render(ui, {
    wrapper: ({ children }) => <TestWrapper {...options}>{children}</TestWrapper>
  })
}

// Mock hooks for testing
export const mockHooks = {
  useAuth: (overrides = {}) => ({
    user: null,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    getToken: vi.fn().mockResolvedValue('mock-token'),
    ...overrides
  }),
  
  useRouter: (overrides = {}) => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    ...overrides
  }),
  
  useToast: (overrides = {}) => ({
    toast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    ...overrides
  })
}

// Test data factories
export const factories = {
  message: (overrides = {}) => ({
    id: `msg-${Math.random()}`,
    role: 'user',
    content: 'Test message',
    timestamp: Date.now(),
    ...overrides
  }),
  
  session: (overrides = {}) => ({
    id: `session-${Math.random()}`,
    title: 'Test Session',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    origin: 'homepage',
    ...overrides
  }),
  
  user: (overrides = {}) => ({
    uid: `user-${Math.random()}`,
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: null,
    ...overrides
  }),
  
  canvasVersion: (overrides = {}) => ({
    id: `version-${Math.random()}`,
    content: '# Test Content',
    timestamp: Date.now(),
    author: 'user',
    description: 'Test version',
    type: 'markdown',
    ...overrides
  })
}

// Mock API responses
export const mockApiResponses = {
  sessions: {
    create: (data = {}) => ({
      id: 'session-123',
      title: data.prompt || 'New Session',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: data.prompt || 'Test prompt',
          timestamp: Date.now()
        }
      ],
      origin: 'homepage',
      ...data
    }),
    
    list: (count = 3) => Array.from({ length: count }, (_, i) => 
      factories.session({
        id: `session-${i}`,
        title: `Session ${i + 1}`,
        createdAt: Date.now() - (i * 3600000)
      })
    )
  },
  
  canvas: {
    save: (data = {}) => ({
      success: true,
      versionId: 'version-123',
      ...data
    }),
    
    versions: (count = 3) => Array.from({ length: count }, (_, i) => 
      factories.canvasVersion({
        id: `version-${i}`,
        content: `# Version ${i + 1}`,
        timestamp: Date.now() - (i * 1800000)
      })
    )
  },
  
  auth: {
    success: (user = {}) => ({
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
      user: factories.user(user)
    }),
    
    error: (message = 'Authentication failed') => ({
      error: message
    })
  }
}

// Testing utilities
export const testUtils = {
  // Wait for element to appear
  waitForElement: async (selector: string, timeout = 5000) => {
    const { waitFor } = require('@testing-library/react')
    return waitFor(
      () => {
        const element = document.querySelector(selector)
        if (!element) throw new Error(`Element ${selector} not found`)
        return element
      },
      { timeout }
    )
  },
  
  // Simulate file upload
  createFile: (name: string, content: string, type = 'text/plain') => {
    return new File([content], name, { type })
  },
  
  // Simulate drag and drop
  createDataTransfer: (files: File[]) => ({
    dataTransfer: {
      files,
      items: files.map(file => ({
        kind: 'file',
        type: file.type,
        getAsFile: () => file
      })),
      types: ['Files']
    }
  }),
  
  // Mock SSE events
  mockSSEEvent: (eventType: string, data: any) => {
    const event = new MessageEvent(eventType, {
      data: JSON.stringify(data)
    })
    return event
  },
  
  // Performance testing helpers
  measureRenderTime: async (renderFn: () => void) => {
    const start = performance.now()
    await renderFn()
    const end = performance.now()
    return end - start
  },
  
  // Memory usage approximation
  getMemoryUsage: () => {
    if ('memory' in performance) {
      // @ts-ignore
      return performance.memory.usedJSHeapSize
    }
    return 0
  }
}

export default TestWrapper