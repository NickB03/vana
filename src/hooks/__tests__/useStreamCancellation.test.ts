import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStreamCancellation } from "../useStreamCancellation";

describe("useStreamCancellation", () => {
  beforeEach(() => {
    // Reset any mocked timers
    vi.clearAllMocks();
  });

  it("should initialize with isStreaming false", () => {
    const { result } = renderHook(() => useStreamCancellation());

    expect(result.current.isStreaming).toBe(false);
  });

  it("should return cancelStream function", () => {
    const { result } = renderHook(() => useStreamCancellation());

    expect(typeof result.current.cancelStream).toBe("function");
  });

  it("should return startStream function", () => {
    const { result } = renderHook(() => useStreamCancellation());

    expect(typeof result.current.startStream).toBe("function");
  });

  it("should return completeStream function", () => {
    const { result } = renderHook(() => useStreamCancellation());

    expect(typeof result.current.completeStream).toBe("function");
  });

  it("should set isStreaming to true when startStream is called", () => {
    const { result } = renderHook(() => useStreamCancellation());

    act(() => {
      result.current.startStream();
    });

    expect(result.current.isStreaming).toBe(true);
  });

  it("should return AbortController from startStream", () => {
    const { result } = renderHook(() => useStreamCancellation());

    let controller: AbortController;
    act(() => {
      controller = result.current.startStream();
    });

    expect(controller!).toBeInstanceOf(AbortController);
    expect(controller!.signal).toBeDefined();
    expect(controller!.signal.aborted).toBe(false);
  });

  it("should set isStreaming to false when cancelStream is called", () => {
    const { result } = renderHook(() => useStreamCancellation());

    act(() => {
      result.current.startStream();
    });

    expect(result.current.isStreaming).toBe(true);

    act(() => {
      result.current.cancelStream();
    });

    expect(result.current.isStreaming).toBe(false);
  });

  it("should abort the signal when cancelStream is called", () => {
    const { result } = renderHook(() => useStreamCancellation());

    let controller: AbortController;
    act(() => {
      controller = result.current.startStream();
    });

    expect(controller!.signal.aborted).toBe(false);

    act(() => {
      result.current.cancelStream();
    });

    expect(controller!.signal.aborted).toBe(true);
  });

  it("should set isStreaming to false when completeStream is called", () => {
    const { result } = renderHook(() => useStreamCancellation());

    act(() => {
      result.current.startStream();
    });

    expect(result.current.isStreaming).toBe(true);

    act(() => {
      result.current.completeStream();
    });

    expect(result.current.isStreaming).toBe(false);
  });

  it("should not abort signal when completeStream is called", () => {
    const { result } = renderHook(() => useStreamCancellation());

    let controller: AbortController;
    act(() => {
      controller = result.current.startStream();
    });

    act(() => {
      result.current.completeStream();
    });

    // Signal should not be aborted on normal completion
    expect(controller!.signal.aborted).toBe(false);
  });

  it("should abort previous stream when starting new stream", () => {
    const { result } = renderHook(() => useStreamCancellation());

    let controller1: AbortController;
    let controller2: AbortController;

    act(() => {
      controller1 = result.current.startStream();
    });

    act(() => {
      controller2 = result.current.startStream();
    });

    // First controller should be aborted
    expect(controller1!.signal.aborted).toBe(true);
    // Second controller should be active
    expect(controller2!.signal.aborted).toBe(false);
    expect(result.current.isStreaming).toBe(true);
  });

  it("should handle cancelStream when no stream is active", () => {
    const { result } = renderHook(() => useStreamCancellation());

    // Should not throw error when cancelling with no active stream
    expect(() => {
      act(() => {
        result.current.cancelStream();
      });
    }).not.toThrow();

    expect(result.current.isStreaming).toBe(false);
  });

  it("should handle completeStream when no stream is active", () => {
    const { result } = renderHook(() => useStreamCancellation());

    // Should not throw error when completing with no active stream
    expect(() => {
      act(() => {
        result.current.completeStream();
      });
    }).not.toThrow();

    expect(result.current.isStreaming).toBe(false);
  });

  it("should trigger abort event on signal when cancelled", () => {
    const { result } = renderHook(() => useStreamCancellation());

    const abortHandler = vi.fn();
    let controller: AbortController;

    act(() => {
      controller = result.current.startStream();
      controller.signal.addEventListener("abort", abortHandler);
    });

    act(() => {
      result.current.cancelStream();
    });

    expect(abortHandler).toHaveBeenCalledTimes(1);
  });

  it("should return different controllers for multiple streams", () => {
    const { result } = renderHook(() => useStreamCancellation());

    let controller1: AbortController;
    let controller2: AbortController;

    act(() => {
      controller1 = result.current.startStream();
      result.current.completeStream();
    });

    act(() => {
      controller2 = result.current.startStream();
    });

    // Should be different instances
    expect(controller1).not.toBe(controller2);
  });

  it("should maintain stable function references", () => {
    const { result, rerender } = renderHook(() => useStreamCancellation());

    const initialCancelStream = result.current.cancelStream;
    const initialStartStream = result.current.startStream;
    const initialCompleteStream = result.current.completeStream;

    rerender();

    // Function references should remain stable across rerenders
    expect(result.current.cancelStream).toBe(initialCancelStream);
    expect(result.current.startStream).toBe(initialStartStream);
    expect(result.current.completeStream).toBe(initialCompleteStream);
  });

  it("should abort active stream on unmount", () => {
    const { result, unmount } = renderHook(() => useStreamCancellation());

    let controller: AbortController;
    act(() => {
      controller = result.current.startStream();
    });

    expect(controller!.signal.aborted).toBe(false);

    // Unmount should abort the stream
    unmount();

    expect(controller!.signal.aborted).toBe(true);
  });

  it("should handle unmount when no stream is active", () => {
    const { unmount } = renderHook(() => useStreamCancellation());

    // Should not throw error when unmounting with no active stream
    expect(() => {
      unmount();
    }).not.toThrow();
  });
});
