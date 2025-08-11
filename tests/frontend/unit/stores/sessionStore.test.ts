import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSessionStore } from '@/stores/sessionStore'

// Mock API client
vi.mock('@/lib/api', () => ({
  api: {
    saveSession: vi.fn(),
    loadSession: vi.fn(),
    createSession: vi.fn(),
  }
}))

describe('SessionStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSessionStore.getState().resetStore?.()
  })

  describe('session creation', () => {
    it('should create new session with correct properties', () => {
      const { result } = renderHook(() => useSessionStore())
      
      act(() => {
        result.current.createSession('homepage', 'Test prompt')
      })

      const session = result.current.sessions[0]
      expect(session).toBeDefined()
      expect(session.origin).toBe('homepage')
      expect(session.title).toBe('Test prompt')
      expect(session.messages).toHaveLength(1)
      expect(session.messages[0].content).toBe('Test prompt')
      expect(session.messages[0].role).toBe('user')
    })

    it('should set created session as current session', () => {
      const { result } = renderHook(() => useSessionStore())
      
      act(() => {
        result.current.createSession('homepage', 'Test prompt')
      })

      expect(result.current.currentSessionId).toBe(result.current.sessions[0].id)
    })

    it('should generate unique session IDs', () => {
      const { result } = renderHook(() => useSessionStore())
      
      act(() => {
        result.current.createSession('homepage', 'First prompt')
        result.current.createSession('homepage', 'Second prompt')
      })

      const [session1, session2] = result.current.sessions
      expect(session1.id).not.toBe(session2.id)
    })
  })

  describe('session filtering', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useSessionStore())
      
      act(() => {
        result.current.createSession('homepage', 'Homepage session')
        result.current.createSession('tool', 'Tool session')
        result.current.createSession('other', 'Other session')
      })
    })

    it('should filter homepage sessions correctly', () => {
      const { result } = renderHook(() => useSessionStore())
      
      const homepageSessions = result.current.getHomepageSessions()
      expect(homepageSessions).toHaveLength(1)
      expect(homepageSessions[0].origin).toBe('homepage')
    })

    it('should return sessions sorted by updatedAt desc', () => {
      const { result } = renderHook(() => useSessionStore())
      
      // Update timestamps to test sorting
      act(() => {
        result.current.sessions[0].updatedAt = Date.now() - 2000 // Older
        result.current.sessions[1].updatedAt = Date.now() - 1000 // Newer
      })

      const homepageSessions = result.current.getHomepageSessions()
      expect(homepageSessions[0].updatedAt).toBeGreaterThan(homepageSessions[1]?.updatedAt || 0)
    })
  })

  describe('session management', () => {
    it('should load session and set as current', () => {
      const { result } = renderHook(() => useSessionStore())
      
      act(() => {
        result.current.createSession('homepage', 'Test session')
      })

      const sessionId = result.current.sessions[0].id

      act(() => {
        result.current.loadSession(sessionId)
      })

      expect(result.current.currentSessionId).toBe(sessionId)
    })

    it('should update session title', () => {
      const { result } = renderHook(() => useSessionStore())
      
      act(() => {
        result.current.createSession('homepage', 'Original title')
      })

      const sessionId = result.current.sessions[0].id

      act(() => {
        result.current.updateSessionTitle(sessionId, 'Updated title')
      })

      const updatedSession = result.current.sessions.find(s => s.id === sessionId)
      expect(updatedSession?.title).toBe('Updated title')
    })

    it('should delete session', () => {
      const { result } = renderHook(() => useSessionStore())
      
      act(() => {
        result.current.createSession('homepage', 'To be deleted')
      })

      const sessionId = result.current.sessions[0].id

      act(() => {
        result.current.deleteSession(sessionId)
      })

      expect(result.current.sessions).toHaveLength(0)
      expect(result.current.currentSessionId).toBeNull()
    })
  })

  describe('persistence', () => {
    it('should persist sessions to localStorage', () => {
      const { result } = renderHook(() => useSessionStore())
      const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem')
      
      act(() => {
        result.current.createSession('homepage', 'Persistent session')
      })

      expect(localStorageSpy).toHaveBeenCalledWith(
        'vana-storage',
        expect.stringContaining('Persistent session')
      )
    })
  })
})