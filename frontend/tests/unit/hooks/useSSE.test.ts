import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import React from 'react'

type MessageRecord = {
  id: string
  type: string
  data: unknown
  timestamp: Date
  lastEventId: string | null
}

type SSEState = {
  isConnected: boolean
  isReconnecting: boolean
  error: string | null
  messages: MessageRecord[]
  connectionAttempts: number
  lastEventId: string | null
}

type EventSourceInitWithHeaders = EventSourceInit & { headers?: Record<string, string> }

const RECONNECT_INTERVAL = 1000
const MAX_ATTEMPTS = 5

const createSSEHook = () => {
  return function useMockedSSE(url: string, options: EventSourceInitWithHeaders = {}) {
    const [state, setState] = React.useState<SSEState>({
      isConnected: false,
      isReconnecting: false,
      error: null,
      messages: [],
      connectionAttempts: 0,
      lastEventId: null,
    })

    const eventSourceRef = React.useRef<EventSource | null>(null)
    const reconnectTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    const connect = React.useCallback(() => {
      if (eventSourceRef.current?.readyState === EventSource.OPEN) {
        return
      }

      try {
        const mergedOptions: EventSourceInitWithHeaders = {
          ...options,
          withCredentials: options.withCredentials ?? true,
        }

        const source = new EventSource(url, mergedOptions)
        eventSourceRef.current = source

        source.onopen = () => {
          setState(prev => ({
            ...prev,
            isConnected: true,
            isReconnecting: false,
            error: null,
            connectionAttempts: 0,
          }))
        }

        source.onerror = () => {
          setState(prev => ({
            ...prev,
            isConnected: false,
            error: 'Connection failed',
          }))

          attemptReconnect()
        }

        source.onmessage = event => {
          const record: MessageRecord = {
            id: event.lastEventId || Date.now().toString(),
            type: 'message',
            data: event.data,
            timestamp: new Date(),
            lastEventId: event.lastEventId ?? null,
          }

          setState(prev => ({
            ...prev,
            messages: [...prev.messages, record],
            lastEventId: record.lastEventId,
          }))
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to create connection',
        }))
      }
    }, [options, url])

    const disconnect = React.useCallback(() => {
      eventSourceRef.current?.close()
      eventSourceRef.current = null

      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
        reconnectTimeout.current = null
      }

      setState(prev => ({
        ...prev,
        isConnected: false,
        isReconnecting: false,
      }))
    }, [])

    const attemptReconnect = React.useCallback(() => {
      setState(prev => {
        if (prev.connectionAttempts >= MAX_ATTEMPTS) {
          return {
            ...prev,
            error: 'Max reconnection attempts reached',
            isReconnecting: false,
          }
        }

        reconnectTimeout.current = setTimeout(connect, RECONNECT_INTERVAL)

        return {
          ...prev,
          isReconnecting: true,
          connectionAttempts: prev.connectionAttempts + 1,
        }
      })
    }, [connect])

    const clearMessages = React.useCallback(() => {
      setState(prev => ({
        ...prev,
        messages: [],
      }))
    }, [])

    React.useEffect(() => {
      connect()

      return () => {
        disconnect()
      }
    }, [connect, disconnect])

    return {
      ...state,
      connect,
      disconnect,
      clearMessages,
    }
  }
}

const EVENT_SOURCE_CONSTANTS = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
} as const

const createMockEventSource = () => {
  let instance: any

  const Mock = vi.fn((url: string, init?: EventSourceInitWithHeaders) => {
    instance = {
      url,
      init,
      readyState: EVENT_SOURCE_CONSTANTS.CONNECTING,
      onopen: null as ((event: Event) => void) | null,
      onerror: null as (() => void) | null,
      onmessage: null as ((event: MessageEvent) => void) | null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      close: vi.fn(() => {
        instance.readyState = EVENT_SOURCE_CONSTANTS.CLOSED
      }),
    }

    setTimeout(() => {
      instance.readyState = EVENT_SOURCE_CONSTANTS.OPEN
      instance.onopen?.(new Event('open'))
    }, 0)

    return instance
  })

  return { Mock, getInstance: () => instance }
}

const originalEventSource = global.EventSource

describe('mocked useSSE hook', () => {
  const hookFactory = createSSEHook()
  const { Mock, getInstance } = createMockEventSource()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    global.EventSource = Object.assign(Mock, EVENT_SOURCE_CONSTANTS) as unknown as typeof EventSource
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.clearAllTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.clearAllTimers()
    global.EventSource = originalEventSource
  })

  it('establishes an SSE connection on mount', async () => {
    renderHook(() => hookFactory('http://localhost/events'))

    await vi.runAllTimersAsync()

    expect(Mock).toHaveBeenCalledWith('http://localhost/events', expect.any(Object))
    expect(getInstance().readyState).toBe(EVENT_SOURCE_CONSTANTS.OPEN)
  })

  it('passes through custom EventSource options', () => {
    const options = { withCredentials: false, headers: { Authorization: 'Bearer token' } }
    renderHook(() => hookFactory('/sse', options))

    expect(Mock).toHaveBeenCalledWith('/sse', expect.objectContaining({
      withCredentials: true,
      headers: options.headers,
    }))
  })

  it('stores incoming messages', async () => {
    const { result } = renderHook(() => hookFactory('/sse'))

    await vi.runAllTimersAsync()

    act(() => {
      getInstance().onmessage?.({ data: 'Test', lastEventId: '1' } as MessageEvent)
    })

    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].data).toBe('Test')
    expect(result.current.lastEventId).toBe('1')
  })

  it('queues reconnection attempts on error', async () => {
    renderHook(() => hookFactory('/sse'))

    await vi.runAllTimersAsync()

    act(() => {
      getInstance().onerror?.()
    })

    expect(Mock).toHaveBeenCalledTimes(1)
    expect(getInstance().readyState).toBe(EVENT_SOURCE_CONSTANTS.OPEN)

    await vi.advanceTimersByTimeAsync(RECONNECT_INTERVAL)

    expect(Mock).toHaveBeenCalledTimes(2)
  })

  it('cleans up and clears messages', async () => {
    const { result, unmount } = renderHook(() => hookFactory('/sse'))

    await vi.runAllTimersAsync()

    act(() => {
      const event = new MessageEvent('message', { data: 'Test', lastEventId: '' })
      getInstance().onmessage?.(event)
    })

    expect(result.current.messages).toHaveLength(1)

    act(() => {
      result.current.clearMessages()
    })

    expect(result.current.messages).toHaveLength(0)

    unmount()
    expect(getInstance().close).toHaveBeenCalled()
  })
})
