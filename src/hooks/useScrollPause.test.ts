import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScrollPause } from './useScrollPause'

describe('useScrollPause', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return isScrolling as false initially', () => {
    const { result } = renderHook(() => useScrollPause())
    expect(result.current.isScrolling).toBe(false)
  })

  it('should set isScrolling to true on scroll event', () => {
    const { result } = renderHook(() => useScrollPause())

    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    expect(result.current.isScrolling).toBe(true)
  })

  it('should set isScrolling back to false after debounce delay', () => {
    const { result } = renderHook(() => useScrollPause(150))

    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    expect(result.current.isScrolling).toBe(true)

    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(result.current.isScrolling).toBe(false)
  })

  it('should reset debounce timer on subsequent scroll events', () => {
    const { result } = renderHook(() => useScrollPause(150))

    // First scroll
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    expect(result.current.isScrolling).toBe(true)

    // Advance 100ms
    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Still scrolling (hasn't reached 150ms yet)
    expect(result.current.isScrolling).toBe(true)

    // Another scroll event (resets timer)
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    // Advance another 100ms (total 200ms from first scroll, but only 100ms from second)
    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Should still be scrolling (hasn't reached 150ms from second scroll)
    expect(result.current.isScrolling).toBe(true)

    // Advance final 50ms (150ms from second scroll)
    act(() => {
      vi.advanceTimersByTime(50)
    })

    // Now should be done scrolling
    expect(result.current.isScrolling).toBe(false)
  })

  it('should detect touchmove events', () => {
    const { result } = renderHook(() => useScrollPause())

    act(() => {
      window.dispatchEvent(new Event('touchmove'))
    })

    expect(result.current.isScrolling).toBe(true)

    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(result.current.isScrolling).toBe(false)
  })

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useScrollPause())

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function))
  })

  it('should respect custom debounce time', () => {
    const { result } = renderHook(() => useScrollPause(300))

    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    expect(result.current.isScrolling).toBe(true)

    act(() => {
      vi.advanceTimersByTime(150)
    })

    // Should still be scrolling (custom 300ms delay)
    expect(result.current.isScrolling).toBe(true)

    act(() => {
      vi.advanceTimersByTime(150)
    })

    // Now should be done (300ms total)
    expect(result.current.isScrolling).toBe(false)
  })
})
