/**
 * Testing utilities and shared helpers
 */

import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
// Mock providers for testing
export const MockProviders = ({ children }: { children: ReactNode }) => {
  return <>{children}</>
}

// Custom render function with providers
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: MockProviders, ...options })

// Mock EventSource for SSE testing
export const mockEventSource = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  readyState: 0,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
}))

// SSE testing utilities
export const sseTestUtils = {
  triggerEvent: (instance: any, type: string, data: any) => {
    const event = new MessageEvent(type, { data: JSON.stringify(data) })
    instance.onmessage?.(event)
  },
  
  triggerError: (instance: any, error: Error) => {
    instance.onerror?.(error)
  },
  
  setReadyState: (instance: any, state: number) => {
    instance.readyState = state
  },
}

// Chat testing utilities
export const chatTestUtils = {
  createMockMessage: (id: string, content: string, type = 'user') => ({
    id,
    content,
    type,
    timestamp: new Date().toISOString(),
  }),
  
  createMockSession: (id: string) => ({
    id,
    name: `Session ${id}`,
    createdAt: new Date().toISOString(),
    messages: [],
  }),
}

// Performance testing utilities
export const performanceTestUtils = {
  measureRenderTime: async (renderFn: () => Promise<void> | void) => {
    const start = performance.now()
    await renderFn()
    return performance.now() - start
  },
  
  expectRenderWithinBudget: (renderTime: number, budget: number = 16) => {
    expect(renderTime).toBeLessThan(budget)
  },
}

// Re-export everything for convenience
export * from '@testing-library/react'
export * from '@testing-library/user-event'