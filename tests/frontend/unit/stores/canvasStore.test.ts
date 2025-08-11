import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCanvasStore } from '@/stores/canvasStore'
import type { CanvasType } from '@/types'

// Mock API client
vi.mock('@/lib/api', () => ({
  api: {
    saveCanvas: vi.fn().mockResolvedValue({}),
  }
}))

// Mock content conversion utilities
vi.mock('@/lib/utils/content-conversion', () => ({
  convertContent: vi.fn((content, from, to) => `converted-${to}: ${content}`)
}))

describe('CanvasStore', () => {
  beforeEach(() => {
    useCanvasStore.getState().resetStore?.()
    vi.clearAllMocks()
  })

  describe('canvas opening and closing', () => {
    it('should open canvas with specified type and content', () => {
      const { result } = renderHook(() => useCanvasStore())
      
      act(() => {
        result.current.open('markdown', '# Hello World')
      })

      expect(result.current.isOpen).toBe(true)
      expect(result.current.activeType).toBe('markdown')
      expect(result.current.content).toBe('# Hello World')
      expect(result.current.isDirty).toBe(false)
    })

    it('should open canvas with default empty content', () => {
      const { result } = renderHook(() => useCanvasStore())
      
      act(() => {
        result.current.open('code')
      })

      expect(result.current.isOpen).toBe(true)
      expect(result.current.activeType).toBe('code')
      expect(result.current.content).toBe('')
    })

    it('should close canvas and reset state', () => {
      const { result } = renderHook(() => useCanvasStore())
      
      act(() => {
        result.current.open('markdown', '# Test')
        result.current.setContent('# Modified')
        result.current.close()
      })

      expect(result.current.isOpen).toBe(false)
      expect(result.current.content).toBe('')
      expect(result.current.isDirty).toBe(false)
    })

    it('should prompt to save when closing dirty canvas', () => {
      const { result } = renderHook(() => useCanvasStore())
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      const saveSpy = vi.spyOn(result.current, 'save')
      
      act(() => {
        result.current.open('markdown', '# Test')
        result.current.setContent('# Modified')
        result.current.close()
      })

      expect(confirmSpy).toHaveBeenCalledWith('Save changes?')
      expect(saveSpy).toHaveBeenCalled()
      
      confirmSpy.mockRestore()
    })
  })

  describe('content management', () => {
    it('should set content and mark as dirty', () => {
      const { result } = renderHook(() => useCanvasStore())
      
      act(() => {
        result.current.open('markdown', '# Original')
        result.current.setContent('# Modified')
      })

      expect(result.current.content).toBe('# Modified')
      expect(result.current.isDirty).toBe(true)
    })

    it('should not mark as dirty if content is same', () => {
      const { result } = renderHook(() => useCanvasStore())
      
      act(() => {
        result.current.open('markdown', '# Original')
        result.current.setContent('# Original')
      })

      expect(result.current.isDirty).toBe(false)
    })
  })

  describe('canvas type switching', () => {
    it('should switch canvas type and convert content', () => {
      const { result } = renderHook(() => useCanvasStore())
      
      act(() => {
        result.current.open('markdown', '# Hello World')
        result.current.switchType('code')
      })

      expect(result.current.activeType).toBe('code')
      expect(result.current.content).toBe('converted-code: # Hello World')
    })

    it('should handle type switching with empty content', () => {
      const { result } = renderHook(() => useCanvasStore())
      
      act(() => {
        result.current.open('markdown', '')
        result.current.switchType('web')
      })

      expect(result.current.activeType).toBe('web')
      expect(result.current.content).toBe('converted-web: ')
    })

    it('should maintain content when switching to same type', () => {
      const { result } = renderHook(() => useCanvasStore())
      
      act(() => {
        result.current.open('markdown', '# Test')
        result.current.switchType('markdown')
      })

      expect(result.current.content).toBe('# Test')
    })
  })

  describe('version management', () => {
    it('should create version when saving', async () => {
      const { result } = renderHook(() => useCanvasStore())
      
      act(() => {
        result.current.open('markdown', '# Version 1')
        result.current.setContent('# Modified Version 1')
      })

      await act(async () => {
        await result.current.save()
      })

      expect(result.current.versions).toHaveLength(1)
      expect(result.current.versions[0].content).toBe('# Modified Version 1')
      expect(result.current.versions[0].type).toBe('markdown')
      expect(result.current.isDirty).toBe(false)
    })

    it('should create manual version with description', () => {
      const { result } = renderHook(() => useCanvasStore())
      
      act(() => {
        result.current.open('markdown', '# Test')
        result.current.createVersion('Initial version')
      })

      expect(result.current.versions).toHaveLength(1)
      expect(result.current.versions[0].description).toBe('Initial version')
      expect(result.current.versions[0].author).toBe('user')
    })

    it('should load previous version', () => {
      const { result } = renderHook(() => useCanvasStore())
      
      act(() => {
        result.current.open('markdown', '# Version 1')
        result.current.createVersion('First version')
        result.current.setContent('# Version 2')
        result.current.createVersion('Second version')
      })

      const firstVersionId = result.current.versions[0].id

      act(() => {
        result.current.loadVersion(firstVersionId)
      })

      expect(result.current.content).toBe('# Version 1')
      expect(result.current.currentVersionId).toBe(firstVersionId)
    })

    it('should limit version history to 50 versions', () => {
      const { result } = renderHook(() => useCanvasStore())
      
      act(() => {
        result.current.open('markdown', '# Test')
        
        // Create 60 versions
        for (let i = 0; i < 60; i++) {
          result.current.setContent(`# Version ${i}`)
          result.current.createVersion(`Version ${i}`)
        }
      })

      expect(result.current.versions.length).toBeLessThanOrEqual(50)
    })
  })

  describe('error handling', () => {
    it('should handle save errors gracefully', async () => {
      const { api } = await import('@/lib/api')
      vi.mocked(api.saveCanvas).mockRejectedValue(new Error('Save failed'))
      
      const { result } = renderHook(() => useCanvasStore())
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      act(() => {
        result.current.open('markdown', '# Test')
        result.current.setContent('# Modified')
      })

      await act(async () => {
        await result.current.save()
      })

      expect(consoleSpy).toHaveBeenCalledWith('Failed to save canvas:', expect.any(Error))
      expect(result.current.isDirty).toBe(true) // Should remain dirty on error
      
      consoleSpy.mockRestore()
    })

    it('should handle version loading with invalid ID', () => {
      const { result } = renderHook(() => useCanvasStore())
      
      act(() => {
        result.current.open('markdown', '# Test')
        result.current.loadVersion('invalid-version-id')
      })

      // Should not crash and should maintain current state
      expect(result.current.content).toBe('# Test')
    })
  })

  describe('canvas state persistence', () => {
    it('should maintain state across canvas type switches', () => {
      const { result } = renderHook(() => useCanvasStore())
      
      act(() => {
        result.current.open('markdown', '# Test')
        result.current.createVersion('Initial version')
        result.current.switchType('code')
      })

      expect(result.current.versions).toHaveLength(1)
      expect(result.current.isOpen).toBe(true)
    })

    it('should handle rapid content updates without race conditions', async () => {
      const { result } = renderHook(() => useCanvasStore())
      
      act(() => {
        result.current.open('markdown', '# Test')
      })

      // Rapid content updates
      await act(async () => {
        for (let i = 0; i < 10; i++) {
          result.current.setContent(`# Test ${i}`)
        }
      })

      expect(result.current.content).toBe('# Test 9')
      expect(result.current.isDirty).toBe(true)
    })
  })
})