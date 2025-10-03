/**
 * Testing utilities and shared helpers
 */

import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import { vi } from 'vitest'

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// ---------------------------------------------------------------------------
// Shared testing providers
// ---------------------------------------------------------------------------

export const MockProviders = ({ children }: { children: ReactNode }) => <>{children}</>

export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: MockProviders, ...options })

// ---------------------------------------------------------------------------
// EventSource helpers for SSE driven tests
// ---------------------------------------------------------------------------

export type MockEventSourceInstance = {
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  readyState: number
  CONNECTING: number
  OPEN: number
  CLOSED: number
  onmessage?: (event: MessageEvent) => void
  onerror?: (error: Event) => void
  onopen?: (event: Event) => void
}

export const mockEventSource = vi.fn((): MockEventSourceInstance => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  readyState: 0,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
}))

export const eventUtils = {
  simulateSSEMessage: (
    instance: MockEventSourceInstance,
    type: string,
    payload: unknown,
    lastEventId: string = 'event-1'
  ) => {
    const listeners = instance.addEventListener.mock.calls
    const listener = listeners.find(([eventName]) => eventName === type)?.[1]
    if (listener) {
      listener({ data: JSON.stringify(payload), lastEventId })
    }
  },
  
  simulateError: (instance: MockEventSourceInstance, error: unknown) => {
    instance.onerror?.(error as Event)
  },
  
  setReadyState: (instance: MockEventSourceInstance, state: number) => {
    instance.readyState = state
  },
}

// ---------------------------------------------------------------------------
// Chat fixtures consumed throughout tests
// ---------------------------------------------------------------------------

export interface MockChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: Date
}

export interface MockChatState {
  isActive: boolean
  currentSession: string | null
  messages: MockChatMessage[]
  isStreaming: boolean
  agents: Array<{ id: string; name: string; status: string; progress: number }>
}

export const createMockChatState = (
  overrides: Partial<MockChatState> = {}
): MockChatState => ({
  isActive: false,
  currentSession: null,
  messages: [],
  isStreaming: false,
  agents: [],
  ...overrides,
})

export interface CapabilitySuggestion {
  id: string
  title: string
  description: string
  category?: string
  icon?: string
}

export const createMockCapabilitySuggestion = (
  overrides: Partial<CapabilitySuggestion> = {}
): CapabilitySuggestion => ({
  id: 'capability-1',
  title: 'Mock Capability',
  description: 'Mock capability description',
  category: 'general',
  icon: 'sparkle',
  ...overrides,
})

export interface MockConversation {
  id: string
  title: string
  updatedAt: Date
  lastMessagePreview?: string
}

export const createMockConversation = (
  overrides: Partial<MockConversation> = {}
): MockConversation => ({
  id: 'conversation-1',
  title: 'Mock Conversation',
  updatedAt: new Date(),
  lastMessagePreview: 'Mock preview message',
  ...overrides,
})

export interface MockMessageInput {
  id: string
  content: string
  role?: 'user' | 'assistant' | 'system'
  timestamp?: Date
}

export const createMockMessage = (
  input: PartialBy<MockMessageInput, 'id' | 'content'>
): MockChatMessage => ({
  id: input.id ?? `message-${Date.now()}`,
  content: input.content ?? 'Mock message content',
  role: input.role ?? 'user',
  timestamp: input.timestamp ?? new Date(),
})

export interface MockAgentStatus {
  id: string
  name: string
  status: string
  progress: number
}

export const createMockAgentStatus = (
  overrides: Partial<MockAgentStatus> = {}
): MockAgentStatus => ({
  id: 'agent-1',
  name: 'Mock Agent',
  status: 'idle',
  progress: 0,
  ...overrides,
})

// ---------------------------------------------------------------------------
// Mock backend responses used across integration tests
// ---------------------------------------------------------------------------

export const mockAPIResponses = {
  createSession: (overrides: Record<string, unknown> = {}) => ({
    session_id: `session-${Date.now()}`,
    status: 'created',
    created_at: new Date().toISOString(),
    ...overrides,
  }),
  
  sendMessage: (overrides: Record<string, unknown> = {}) => ({
    message_id: `msg-${Date.now()}`,
    status: 'queued',
    received_at: new Date().toISOString(),
    ...overrides,
  }),
  
  getConversations: (count = 5) => ({
    conversations: Array.from({ length: count }, (_, index) => ({
      id: `session-${index + 1}`,
      title: `Conversation ${index + 1}`,
      updated_at: new Date(Date.now() - index * 3600000).toISOString(),
      last_message: `Mock conversation ${index + 1}`,
    })),
    count,
  }),
}

// ---------------------------------------------------------------------------
// Test execution helpers
// ---------------------------------------------------------------------------

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

// Re-export testing-library conveniences
export * from '@testing-library/react'
export * from '@testing-library/user-event'
