/**
 * Unit Tests for AI Commentator (Sidecar)
 *
 * Tests the buffer management, throttling, and status emission logic.
 * Note: These tests mock the GLM API to avoid actual network calls.
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { stub, type Stub } from "https://deno.land/std@0.168.0/testing/mock.ts";

import { AICommentator } from "../ai-commentator.ts";

// Helper to create a delayed promise
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to create a mock fetch that returns a status
function createMockFetch(status: string, delayMs = 50): Stub {
  return stub(globalThis, "fetch", async () => {
    await delay(delayMs);
    return new Response(JSON.stringify({
      choices: [{ message: { content: status } }]
    }), { status: 200 });
  });
}

Deno.test("AICommentator - initialization", async (t) => {
  await t.step("should initialize with default config", () => {
    const updates: string[] = [];
    const commentator = new AICommentator(
      (status) => { updates.push(status); },
      "test-request-id",
      { _forceEnabled: true }
    );

    assertExists(commentator);
    assertEquals(updates.length, 0);
  });

  await t.step("should accept custom config", () => {
    const commentator = new AICommentator(
      () => {},
      "test-request-id",
      {
        minBufferChars: 100,
        maxBufferChars: 300,
        maxWaitMs: 2000,
        minUpdateIntervalMs: 1000,
        timeoutMs: 1500,
        _forceEnabled: true,
      }
    );

    assertExists(commentator);
  });
});

Deno.test("AICommentator - buffer management", async (t) => {
  await t.step("should not trigger call for small buffers", async () => {
    const updates: string[] = [];
    const fetchStub = createMockFetch("Test status");

    try {
      const commentator = new AICommentator(
        (status) => { updates.push(status); },
        "test-request-id",
        { minBufferChars: 150, _forceEnabled: true }
      );

      // Push small chunk (below threshold)
      commentator.push("Short text");

      // Wait a bit for any async calls
      await delay(200);

      // Should not have called fetch (buffer too small)
      assertEquals(fetchStub.calls.length, 0);
      assertEquals(updates.length, 0);
    } finally {
      fetchStub.restore();
    }
  });

  await t.step("should trigger on sentence boundary after minBufferChars", async () => {
    const updates: string[] = [];
    const fetchStub = createMockFetch("Analyzing code");

    try {
      const commentator = new AICommentator(
        (status) => { updates.push(status); },
        "test-request-id",
        {
          minBufferChars: 50,
          minUpdateIntervalMs: 0, // Disable anti-flicker for testing
          _forceEnabled: true
        }
      );

      // Push enough content with sentence boundary
      commentator.push("I am analyzing the database schema for this component. ");

      // Wait for async call
      await delay(300);

      // Should have triggered a call
      assertEquals(fetchStub.calls.length, 1);
      assertEquals(updates.length, 1);
      assertEquals(updates[0], "Analyzing code");
    } finally {
      fetchStub.restore();
    }
  });

  await t.step("should force flush at maxBufferChars", async () => {
    const updates: string[] = [];
    const fetchStub = createMockFetch("Processing");

    try {
      const commentator = new AICommentator(
        (status) => { updates.push(status); },
        "test-request-id",
        {
          minBufferChars: 50,
          maxBufferChars: 100,
          minUpdateIntervalMs: 0,
          _forceEnabled: true
        }
      );

      // Push content over maxBufferChars (no sentence boundary)
      commentator.push("x".repeat(120));

      await delay(300);

      // Should have triggered despite no sentence boundary
      assertEquals(fetchStub.calls.length, 1);
    } finally {
      fetchStub.restore();
    }
  });
});

Deno.test("AICommentator - anti-flicker", async (t) => {
  await t.step("should respect minUpdateIntervalMs", async () => {
    const updates: string[] = [];
    let callCount = 0;

    const fetchStub = stub(globalThis, "fetch", async () => {
      callCount++;
      return new Response(JSON.stringify({
        choices: [{ message: { content: `Status ${callCount}` } }]
      }), { status: 200 });
    });

    try {
      const commentator = new AICommentator(
        (status) => { updates.push(status); },
        "test-request-id",
        {
          minBufferChars: 20,
          maxBufferChars: 50,
          minUpdateIntervalMs: 500, // 500ms cooldown
          _forceEnabled: true
        }
      );

      // First update - should emit
      commentator.push("First chunk of text that is long enough. ");
      await delay(200);

      // Second update too soon - should be skipped
      commentator.push("Second chunk of text that is also long enough. ");
      await delay(200);

      // API calls happen, but updates should be throttled
      assertEquals(updates.length, 1);
      assertEquals(updates[0], "Status 1");
    } finally {
      fetchStub.restore();
    }
  });

  await t.step("should deduplicate identical statuses", async () => {
    const updates: string[] = [];

    const fetchStub = stub(globalThis, "fetch", async () => {
      return new Response(JSON.stringify({
        choices: [{ message: { content: "Same status" } }]
      }), { status: 200 });
    });

    try {
      const commentator = new AICommentator(
        (status) => { updates.push(status); },
        "test-request-id",
        {
          minBufferChars: 20,
          maxBufferChars: 40,
          minUpdateIntervalMs: 0, // Disable anti-flicker
          maxWaitMs: 100,
          _forceEnabled: true
        }
      );

      // Two calls returning same status
      commentator.push("First chunk that is long enough. ");
      await delay(200);
      commentator.push("Second chunk that is also long. ");
      await delay(200);

      // Should only have one update (second deduplicated)
      assertEquals(updates.length, 1);
    } finally {
      fetchStub.restore();
    }
  });
});

Deno.test("AICommentator - error handling", async (t) => {
  await t.step("should handle API errors gracefully", async () => {
    const updates: string[] = [];

    const fetchStub = stub(globalThis, "fetch", async () => {
      return new Response("Internal Server Error", { status: 500 });
    });

    try {
      const commentator = new AICommentator(
        (status) => { updates.push(status); },
        "test-request-id",
        { minBufferChars: 20, maxBufferChars: 40, _forceEnabled: true }
      );

      commentator.push("Text that triggers API call. ");
      await delay(200);

      // Should not throw, just skip the update
      assertEquals(updates.length, 0);
    } finally {
      fetchStub.restore();
    }
  });

  await t.step("should handle timeout gracefully", async () => {
    const updates: string[] = [];

    // Use AbortController to properly cancel the long-running fetch
    let abortController: AbortController | null = null;

    // Create fetch that takes too long but respects abort
    const fetchStub = stub(globalThis, "fetch", async (_url, options) => {
      abortController = new AbortController();
      const signal = (options as RequestInit)?.signal;

      // Wait until aborted or 5 seconds
      return new Promise<Response>((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(new Response(JSON.stringify({
            choices: [{ message: { content: "Delayed status" } }]
          }), { status: 200 }));
        }, 5000);

        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }
      });
    });

    try {
      const commentator = new AICommentator(
        (status) => { updates.push(status); },
        "test-request-id",
        {
          minBufferChars: 20,
          maxBufferChars: 40,
          timeoutMs: 100, // Very short timeout
          _forceEnabled: true
        }
      );

      commentator.push("Text that triggers API call. ");

      // Wait for timeout + some buffer
      await delay(300);

      // Should have timed out, no update
      assertEquals(updates.length, 0);

      // Clean up: flush to clear any pending state
      await commentator.flush();
    } finally {
      fetchStub.restore();
    }
  });
});

Deno.test("AICommentator - flush", async (t) => {
  await t.step("should flush remaining buffer on flush()", async () => {
    const updates: string[] = [];
    const fetchStub = createMockFetch("Final status");

    try {
      const commentator = new AICommentator(
        (status) => { updates.push(status); },
        "test-request-id",
        {
          minBufferChars: 200, // High threshold
          minUpdateIntervalMs: 0,
          _forceEnabled: true
        }
      );

      // Push content below threshold
      commentator.push("Some partial content that is about fifty characters long");

      // No auto-trigger yet
      assertEquals(updates.length, 0);

      // Explicit flush
      await commentator.flush();

      // Should have emitted the status
      assertEquals(updates.length, 1);
      assertEquals(updates[0], "Final status");
    } finally {
      fetchStub.restore();
    }
  });

  await t.step("should wait for pending calls on flush()", async () => {
    const updates: string[] = [];

    const fetchStub = stub(globalThis, "fetch", async () => {
      await delay(100); // Simulated API latency
      return new Response(JSON.stringify({
        choices: [{ message: { content: "Delayed status" } }]
      }), { status: 200 });
    });

    try {
      const commentator = new AICommentator(
        (status) => { updates.push(status); },
        "test-request-id",
        {
          minBufferChars: 20,
          maxBufferChars: 40,
          minUpdateIntervalMs: 0,
          _forceEnabled: true
        }
      );

      // Trigger a call
      commentator.push("Text that triggers the API call now. ");

      // Immediately check - should be pending
      assertEquals(updates.length, 0);

      // Flush waits for pending
      await commentator.flush();

      // Now should have the update
      assertEquals(updates.length, 1);
    } finally {
      fetchStub.restore();
    }
  });
});

Deno.test("AICommentator - stats", async (t) => {
  await t.step("should track stats correctly", () => {
    const commentator = new AICommentator(
      () => {},
      "test-request-id",
      { _forceEnabled: true }
    );

    const initialStats = commentator.getStats();
    assertEquals(initialStats.pendingCalls, 0);
    assertEquals(initialStats.sequenceId, 0);
    assertEquals(initialStats.bufferLength, 0);

    // Push some content
    commentator.push("Some content");

    const afterPushStats = commentator.getStats();
    assertEquals(afterPushStats.bufferLength, 12);
  });
});

Deno.test("AICommentator - status cleaning", async (t) => {
  await t.step("should clean quotes and trailing periods from status", async () => {
    const updates: string[] = [];

    const fetchStub = stub(globalThis, "fetch", async () => {
      return new Response(JSON.stringify({
        choices: [{ message: { content: '"Analyzing code."' } }]
      }), { status: 200 });
    });

    try {
      const commentator = new AICommentator(
        (status) => { updates.push(status); },
        "test-request-id",
        { minBufferChars: 20, maxBufferChars: 40, minUpdateIntervalMs: 0, _forceEnabled: true }
      );

      commentator.push("Text that triggers API call. ");
      await delay(200);

      // Should have cleaned the status
      assertEquals(updates.length, 1);
      assertEquals(updates[0], "Analyzing code");
    } finally {
      fetchStub.restore();
    }
  });
});
