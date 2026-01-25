import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTypewriter, useTypewriterWithStatus } from '../useTypewriter';

describe('useTypewriter', () => {
  beforeEach(() => {
    // Mock requestAnimationFrame and cancelAnimationFrame
    let frameId = 0;
    const rafCallbacks = new Map<number, FrameRequestCallback>();

    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frameId++;
      rafCallbacks.set(frameId, callback);
      // Execute immediately for testing
      setTimeout(() => {
        const cb = rafCallbacks.get(frameId);
        if (cb) {
          cb(performance.now());
          rafCallbacks.delete(frameId);
        }
      }, 0);
      return frameId;
    });

    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      rafCallbacks.delete(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return empty string initially when enabled', () => {
    const { result } = renderHook(() => useTypewriter('Hello, World!', { enabled: true }));
    expect(result.current).toBe('');
  });

  it('should return full text immediately when disabled from start', () => {
    const { result } = renderHook(() => useTypewriter('Hello, World!', { enabled: false }));
    expect(result.current).toBe('Hello, World!');
  });

  it('should progressively reveal text when enabled', async () => {
    // Use character mode for predictable testing
    const { result } = renderHook(() =>
      useTypewriter('Hello world this is a test', { enabled: true, charsPerFrame: 1, mode: 'character' })
    );

    // Initial state
    expect(result.current).toBe('');

    // Wait for animation to progress
    await waitFor(() => {
      expect(result.current.length).toBeGreaterThan(0);
    }, { timeout: 2000 });

    // Eventually shows full text
    await waitFor(() => {
      expect(result.current).toBe('Hello world this is a test');
    }, { timeout: 5000 });
  });

  it('should continue animation after enabled becomes false (CRITICAL FIX)', async () => {
    // This tests the bug fix: when streaming ends mid-animation,
    // the typewriter should COMPLETE the animation, not jump to full text
    // Use character mode for predictable testing
    const { result, rerender } = renderHook(
      ({ text, enabled }) => useTypewriter(text, { enabled, charsPerFrame: 1, mode: 'character' }),
      { initialProps: { text: 'Hello, World! This is a long text that takes time to reveal.', enabled: true } }
    );

    // Initial state - starts empty
    expect(result.current).toBe('');

    // Wait for partial reveal
    await waitFor(() => {
      expect(result.current.length).toBeGreaterThan(0);
      expect(result.current.length).toBeLessThan(60); // Not fully revealed
    }, { timeout: 2000 });

    const partialLength = result.current.length;
    expect(partialLength).toBeGreaterThan(0);
    expect(partialLength).toBeLessThan(60);

    // Simulate streaming ending (enabled becomes false)
    rerender({ text: 'Hello, World! This is a long text that takes time to reveal.', enabled: false });

    // CRITICAL: Text should NOT jump to completion immediately
    // It should continue animating from where it was (allow 1-2 chars variance due to RAF timing)
    const textAfterDisable = result.current;
    expect(textAfterDisable.length).toBeGreaterThanOrEqual(partialLength);
    expect(textAfterDisable.length).toBeLessThanOrEqual(partialLength + 2);

    // Wait a bit more - animation should continue
    await waitFor(() => {
      expect(result.current.length).toBeGreaterThan(partialLength);
    }, { timeout: 2000 });

    // Eventually completes
    await waitFor(() => {
      expect(result.current).toBe('Hello, World! This is a long text that takes time to reveal.');
    }, { timeout: 5000 });
  });

  it('should reset when target text changes completely', async () => {
    // Use character mode for predictable testing
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriter(text, { enabled: true, charsPerFrame: 1, mode: 'character' }),
      { initialProps: { text: 'First message that is long enough to take time to reveal fully' } }
    );

    // Wait for some progress but not completion
    await waitFor(() => {
      expect(result.current.length).toBeGreaterThan(0);
      expect(result.current.length).toBeLessThan('First message that is long enough to take time to reveal fully'.length);
    }, { timeout: 2000 });

    // Change to completely different text
    rerender({ text: 'Second message also long enough' });

    // Should reset to empty and start revealing new text
    // The reset happens immediately, then animation starts
    await waitFor(() => {
      expect(result.current).toMatch(/^Second/);
    }, { timeout: 2000 });
  });

  it('should handle text growing during streaming', async () => {
    const { result, rerender } = renderHook(
      ({ text }) => useTypewriter(text, { enabled: true, charsPerFrame: 2, mode: 'character' }),
      { initialProps: { text: 'Hello there friend' } }
    );

    // Wait for partial reveal
    await waitFor(() => {
      expect(result.current.length).toBeGreaterThan(0);
    }, { timeout: 2000 });

    // Simulate streaming adding more content
    rerender({ text: 'Hello there friend, how are you today?' });

    // Should continue revealing the extended text
    await waitFor(() => {
      expect(result.current).toBe('Hello there friend, how are you today?');
    }, { timeout: 5000 });
  });

  it('should reveal at word boundaries in word mode', async () => {
    // Word mode should never cut mid-word
    const { result } = renderHook(() =>
      useTypewriter('Hello world testing word boundaries here', { enabled: true, charsPerFrame: 3, mode: 'word' })
    );

    // Wait for some progress
    await waitFor(() => {
      expect(result.current.length).toBeGreaterThan(0);
    }, { timeout: 2000 });

    // In word mode, revealed text should end at a word boundary (space or end)
    // Should NOT be something like "Hello wor" (mid-word)
    const revealed = result.current;
    if (revealed.length < 'Hello world testing word boundaries here'.length) {
      // Check it ends with space or is a complete word up to space
      const endsAtBoundary = revealed.endsWith(' ') ||
        revealed === 'Hello world testing word boundaries here' ||
        'Hello world testing word boundaries here'.substring(revealed.length).startsWith(' ') ||
        'Hello world testing word boundaries here'.substring(revealed.length - 1, revealed.length) === ' ';
      expect(endsAtBoundary).toBe(true);
    }

    // Eventually completes
    await waitFor(() => {
      expect(result.current).toBe('Hello world testing word boundaries here');
    }, { timeout: 5000 });
  });
});

describe('useTypewriterWithStatus', () => {
  beforeEach(() => {
    let frameId = 0;
    const rafCallbacks = new Map<number, FrameRequestCallback>();

    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frameId++;
      rafCallbacks.set(frameId, callback);
      setTimeout(() => {
        const cb = rafCallbacks.get(frameId);
        if (cb) {
          cb(performance.now());
          rafCallbacks.delete(frameId);
        }
      }, 0);
      return frameId;
    });

    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      rafCallbacks.delete(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should provide animation status metadata', async () => {
    const { result } = renderHook(() =>
      useTypewriterWithStatus('Hello', { enabled: true, charsPerFrame: 1 })
    );

    // Initially not complete
    expect(result.current.isComplete).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.remaining).toBe(5);

    // Wait for completion
    await waitFor(() => {
      expect(result.current.isComplete).toBe(true);
      expect(result.current.progress).toBe(1);
      expect(result.current.remaining).toBe(0);
    }, { timeout: 5000 });
  });

  it('should track progress accurately', async () => {
    // Use character mode for predictable testing
    const { result } = renderHook(() =>
      useTypewriterWithStatus('This is a longer text to ensure animation takes sufficient time to complete for testing purposes', { enabled: true, charsPerFrame: 1, mode: 'character' })
    );

    // Wait for partial progress
    await waitFor(() => {
      const progress = result.current.progress;
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(1);
      expect(result.current.remaining).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });
});
