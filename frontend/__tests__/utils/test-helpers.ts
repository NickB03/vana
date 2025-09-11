/**
 * Test Utilities and Helper Functions
 * 
 * Reusable utilities for integration testing including:
 * - API mocking utilities
 * - Authentication helpers
 * - SSE simulation helpers
 * - Component testing utilities
 */

import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import type { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ChatProvider } from '@/contexts/chat-context'
import { TEST_TOKENS, TEST_USERS, TEST_STORAGE_KEYS } from '../constants/test-config'

// ============================================================================
// Test Providers and Wrappers
// ============================================================================

interface AllTheProvidersProps {
  children: React.ReactNode
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <ChatProvider>
      {children}
    </ChatProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// ============================================================================
// Authentication Test Utilities
// ============================================================================

export const AuthTestUtils = {
  /**
   * Set up authenticated state for tests
   */
  setupAuth: (token: string = TEST_TOKENS.GENERIC_TOKEN) => {
    localStorage.setItem('vana_auth_token', token)
    localStorage.setItem('vana_user_data', JSON.stringify({
      id: 'test_user_123',
      email: 'test@example.com',
      name: 'Test User'
    }))
  },

  /**
   * Clear authentication state
   */
  clearAuth: () => {
    localStorage.removeItem('vana_auth_token')
    localStorage.removeItem('vana_user_data')
  },

  /**
   * Mock successful login response
   */
  mockSuccessfulLogin: () => {
    server.use(
      http.post('http://localhost:8000/auth/login', () => {
        return HttpResponse.json({
          access_token: TEST_TOKENS.GENERIC_TOKEN,
          token_type: 'bearer',
          expires_in: 3600,
          user: {
            id: 'test_user_123',
            email: 'test@example.com',
            name: 'Test User'
          }
        })
      })
    )
  },

  /**
   * Mock failed login response
   */
  mockFailedLogin: (error: string = 'Invalid credentials') => {
    server.use(
      http.post('http://localhost:8000/auth/login', () => {
        return HttpResponse.json(
          { detail: error },
          { status: 401 }
        )
      })
    )
  },

  /**
   * Mock protected endpoint
   */
  mockProtectedEndpoint: (endpoint: string, response: any) => {
    server.use(
      http.get(`http://localhost:8000${endpoint}`, ({ request }) => {
        const authHeader = request.headers.get('Authorization')
        
        if (!authHeader || !authHeader.startsWith('Bearer mock_test_token')) {
          return HttpResponse.json(
            { detail: 'Authentication required' },
            { status: 401 }
          )
        }
        
        return HttpResponse.json(response)
      })
    )
  }
}

// ============================================================================
// SSE Test Utilities
// ============================================================================

export const SSETestUtils = {
  /**
   * Create a mock SSE stream with custom messages
   */
  createMockSSEStream: (messages: string[], delay: number = 100) => {
    return http.get('http://localhost:8000/chat/:chatId/stream', () => {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          let index = 0
          const sendMessage = () => {
            if (index < messages.length) {
              const data = JSON.stringify({
                content: messages[index],
                message_id: 'test_msg',
                timestamp: new Date().toISOString()
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              index++
              setTimeout(sendMessage, delay)
            } else {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
            }
          }
          setTimeout(sendMessage, 50)
        }
      })

      return new HttpResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        }
      })
    })
  },

  /**
   * Mock SSE stream that fails
   */
  mockFailedSSEStream: (chatId: string = 'error') => {
    server.use(
      http.get(`http://localhost:8000/chat/${chatId}/stream`, () => {
        return HttpResponse.json(
          { detail: 'Stream failed' },
          { status: 500 }
        )
      })
    )
  },

  /**
   * Mock SSE stream with network error
   */
  mockNetworkErrorSSEStream: (chatId: string = 'network-error') => {
    server.use(
      http.get(`http://localhost:8000/chat/${chatId}/stream`, () => {
        throw new Error('Network error')
      })
    )
  },

  /**
   * Mock rapid SSE events for performance testing
   */
  mockRapidSSEStream: (messageCount: number = 100) => {
    return http.get('http://localhost:8000/chat/:chatId/stream', () => {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          for (let i = 0; i < messageCount; i++) {
            const data = JSON.stringify({
              content: `Message ${i + 1} `,
              message_id: 'rapid_test',
            })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      })

      return new HttpResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
        }
      })
    })
  }
}

// ============================================================================
// API Test Utilities
// ============================================================================

export const APITestUtils = {
  /**
   * Mock API endpoint with custom response
   */
  mockEndpoint: (method: 'get' | 'post' | 'put' | 'delete', endpoint: string, response: any, status: number = 200) => {
    const httpMethod = http[method]
    server.use(
      httpMethod(`http://localhost:8000${endpoint}`, () => {
        return HttpResponse.json(response, { status })
      })
    )
  },

  /**
   * Mock network timeout for endpoint
   */
  mockNetworkTimeout: (endpoint: string) => {
    server.use(
      http.get(`http://localhost:8000${endpoint}`, async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        throw new Error('Network timeout')
      })
    )
  },

  /**
   * Mock rate limiting
   */
  mockRateLimit: (endpoint: string) => {
    server.use(
      http.post(`http://localhost:8000${endpoint}`, () => {
        return HttpResponse.json(
          { detail: 'Rate limit exceeded', error_type: 'rate_limit' },
          { status: 429 }
        )
      })
    )
  },

  /**
   * Mock server error
   */
  mockServerError: (endpoint: string, error: string = 'Internal server error') => {
    server.use(
      http.all(`http://localhost:8000${endpoint}`, () => {
        return HttpResponse.json(
          { detail: error },
          { status: 500 }
        )
      })
    )
  },

  /**
   * Count API calls to an endpoint
   */
  countAPICalls: (endpoint: string): Promise<number> => {
    let callCount = 0
    
    server.use(
      http.all(`http://localhost:8000${endpoint}`, ({ request }) => {
        callCount++
        // Pass through to original handler
        server.listHandlers().forEach(handler => {
          if (handler.info.method === request.method && 
              handler.info.path === endpoint) {
            return handler.resolver(request as any)
          }
        })
        return HttpResponse.json({ count: callCount })
      })
    )
    
    return Promise.resolve(callCount)
  }
}

// ============================================================================
// Performance Test Utilities
// ============================================================================

export const PerformanceTestUtils = {
  /**
   * Measure execution time of a function
   */
  measureTime: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    const duration = end - start
    
    return { result, duration }
  },

  /**
   * Run performance test multiple times and get statistics
   */
  benchmarkFunction: async <T>(
    fn: () => Promise<T>,
    iterations: number = 10
  ): Promise<{
    results: T[]
    times: number[]
    average: number
    min: number
    max: number
    median: number
  }> => {
    const results: T[] = []
    const times: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      const { result, duration } = await PerformanceTestUtils.measureTime(fn)
      results.push(result)
      times.push(duration)
    }
    
    const sortedTimes = [...times].sort((a, b) => a - b)
    const average = times.reduce((sum, time) => sum + time, 0) / times.length
    const min = Math.min(...times)
    const max = Math.max(...times)
    const median = sortedTimes[Math.floor(sortedTimes.length / 2)]
    
    return { results, times, average, min, max, median }
  },

  /**
   * Monitor memory usage during test execution
   */
  monitorMemory: async <T>(fn: () => Promise<T>): Promise<{
    result: T
    memoryBefore: number
    memoryAfter: number
    memoryIncrease: number
  }> => {
    const memoryBefore = process.memoryUsage().heapUsed
    const result = await fn()
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
    
    const memoryAfter = process.memoryUsage().heapUsed
    const memoryIncrease = memoryAfter - memoryBefore
    
    return { result, memoryBefore, memoryAfter, memoryIncrease }
  }
}

// ============================================================================
// Test Data Generators
// ============================================================================

export const TestDataGenerators = {
  /**
   * Generate random chat message
   */
  generateChatMessage: (role: 'user' | 'assistant' = 'user', content?: string) => ({
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    content: content || `Test message ${Math.random().toString(36).substr(2, 9)}`,
    role,
    timestamp: new Date()
  }),

  /**
   * Generate multiple chat messages
   */
  generateChatHistory: (count: number) => {
    const messages = []
    for (let i = 0; i < count; i++) {
      const isUser = i % 2 === 0
      messages.push(
        TestDataGenerators.generateChatMessage(
          isUser ? 'user' : 'assistant',
          `${isUser ? 'User' : 'Assistant'} message ${i + 1}`
        )
      )
    }
    return messages
  },

  /**
   * Generate user data
   */
  generateUser: () => ({
    id: `user_${Math.random().toString(36).substr(2, 9)}`,
    email: `test${Math.random().toString(36).substr(2, 5)}@example.com`,
    name: `Test User ${Math.random().toString(36).substr(2, 5)}`
  }),

  /**
   * Generate API response data
   */
  generateAPIResponse: (type: 'health' | 'chat' | 'auth') => {
    switch (type) {
      case 'health':
        return {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          environment: 'test',
          version: '1.0.0'
        }
      case 'chat':
        return {
          task_id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          message_id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          chat_id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      case 'auth':
        return {
          access_token: `token_${Math.random().toString(36).substr(2, 20)}`,
          token_type: 'bearer',
          expires_in: 3600,
          user: TestDataGenerators.generateUser()
        }
      default:
        return {}
    }
  }
}

// ============================================================================
// Async Test Utilities
// ============================================================================

export const AsyncTestUtils = {
  /**
   * Wait for condition to be true
   */
  waitForCondition: async (
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> => {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      const result = await condition()
      if (result) {
        return
      }
      await new Promise(resolve => setTimeout(resolve, interval))
    }
    
    throw new Error(`Condition not met within ${timeout}ms`)
  },

  /**
   * Wait for async generator to complete
   */
  collectAsyncGenerator: async <T>(generator: AsyncGenerator<T>): Promise<T[]> => {
    const results: T[] = []
    
    for await (const item of generator) {
      results.push(item)
    }
    
    return results
  },

  /**
   * Race async operations with timeout
   */
  withTimeout: async <T>(
    promise: Promise<T>,
    timeout: number,
    timeoutMessage: string = 'Operation timed out'
  ): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeout)
    })
    
    return Promise.race([promise, timeoutPromise])
  }
}

// ============================================================================
// Environment Utilities
// ============================================================================

export const EnvironmentUtils = {
  /**
   * Set up test environment variables
   */
  setupTestEnv: () => {
    process.env.NODE_ENV = 'test'
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'
    process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH = 'false'
  },

  /**
   * Clean up environment variables
   */
  cleanupTestEnv: () => {
    delete process.env.NEXT_PUBLIC_API_URL
    delete process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH
  },

  /**
   * Mock environment variables temporarily
   */
  withMockEnv: async <T>(
    envVars: Record<string, string>,
    fn: () => Promise<T>
  ): Promise<T> => {
    const originalEnv = { ...process.env }
    
    Object.assign(process.env, envVars)
    
    try {
      return await fn()
    } finally {
      process.env = originalEnv
    }
  }
}