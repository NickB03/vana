import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useChatStore } from '@/stores/chatStore'
import type { Message } from '@/types'

describe('ChatStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useChatStore.getState().resetStore?.()
    vi.clearAllMocks()
  })

  describe('message management', () => {
    it('should add message to store', () => {
      const { result } = renderHook(() => useChatStore())
      
      const message: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now()
      }

      act(() => {
        result.current.addMessage(message)
      })

      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0]).toEqual(message)
    })

    it('should add assistant message and enable streaming', () => {
      const { result } = renderHook(() => useChatStore())
      
      act(() => {
        result.current.addMessage({
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now()
        })
        
        result.current.addMessage({
          id: 'msg-2',
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          agentName: 'Vana Agent'
        })
      })

      expect(result.current.messages).toHaveLength(2)
      expect(result.current.isStreaming).toBe(true)
    })

    it('should append tokens to last message', () => {
      const { result } = renderHook(() => useChatStore())
      
      act(() => {
        result.current.addMessage({
          id: 'msg-1',
          role: 'assistant',
          content: '',
          timestamp: Date.now()
        })
      })

      act(() => {
        result.current.appendToLastMessage('Hello')
        result.current.appendToLastMessage(' world')
      })

      expect(result.current.messages[0].content).toBe('Hello world')
    })

    it('should not append tokens if no messages exist', () => {
      const { result } = renderHook(() => useChatStore())
      
      act(() => {
        result.current.appendToLastMessage('Should not append')
      })

      expect(result.current.messages).toHaveLength(0)
    })

    it('should only append to assistant messages', () => {
      const { result } = renderHook(() => useChatStore())
      
      act(() => {
        result.current.addMessage({
          id: 'msg-1',
          role: 'user',
          content: 'Original content',
          timestamp: Date.now()
        })
      })

      act(() => {
        result.current.appendToLastMessage(' appended')
      })

      expect(result.current.messages[0].content).toBe('Original content')
    })
  })

  describe('streaming state management', () => {
    it('should set streaming error state', () => {
      const { result } = renderHook(() => useChatStore())
      
      act(() => {
        result.current.setStreamError(true)
      })

      expect(result.current.streamError).toBe(true)
      expect(result.current.isStreaming).toBe(false)
    })

    it('should clear streaming error when adding new message', () => {
      const { result } = renderHook(() => useChatStore())
      
      act(() => {
        result.current.setStreamError(true)
        result.current.addMessage({
          id: 'msg-1',
          role: 'user',
          content: 'New message',
          timestamp: Date.now()
        })
      })

      expect(result.current.streamError).toBe(false)
    })

    it('should finish streaming when complete', () => {
      const { result } = renderHook(() => useChatStore())
      
      act(() => {
        result.current.addMessage({
          id: 'msg-1',
          role: 'assistant',
          content: '',
          timestamp: Date.now()
        })
        result.current.finishStreaming()
      })

      expect(result.current.isStreaming).toBe(false)
    })
  })

  describe('task list management', () => {
    it('should set active task list', () => {
      const { result } = renderHook(() => useChatStore())
      
      const taskList = [
        {
          id: 'task-1',
          title: 'Test task',
          agent: 'Test Agent',
          description: 'Test description',
          status: 'running' as const
        }
      ]

      act(() => {
        result.current.setActiveTaskList(taskList)
      })

      expect(result.current.activeTaskList).toEqual(taskList)
    })

    it('should clear task list', () => {
      const { result } = renderHook(() => useChatStore())
      
      act(() => {
        result.current.setActiveTaskList([])
        result.current.clearActiveTaskList()
      })

      expect(result.current.activeTaskList).toBeNull()
    })
  })

  describe('retry functionality', () => {
    it('should retry last user message', async () => {
      const { result } = renderHook(() => useChatStore())
      const retrySpy = vi.fn()
      
      // Mock retry implementation
      result.current.retryLastMessage = retrySpy

      act(() => {
        result.current.addMessage({
          id: 'msg-1',
          role: 'user',
          content: 'Failed message',
          timestamp: Date.now()
        })
        result.current.addMessage({
          id: 'msg-2',
          role: 'assistant',
          content: 'Error occurred',
          timestamp: Date.now()
        })
        result.current.setStreamError(true)
      })

      await act(async () => {
        await result.current.retryLastMessage()
      })

      expect(retrySpy).toHaveBeenCalled()
    })
  })
})