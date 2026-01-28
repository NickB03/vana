import { renderHook, act } from "@testing-library/react";
import { useGuestSession } from "./useGuestSession";
import { ChatMessage } from "./useChatMessages";
import { vi, beforeEach, describe, it, expect } from "vitest";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("useGuestSession", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("Message Persistence", () => {
    it("should save and load messages correctly", () => {
      const { result } = renderHook(() => useGuestSession(false));

      const testMessages: ChatMessage[] = [
        {
          id: "1",
          session_id: result.current.sessionId!,
          role: "user",
          content: "Hello",
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          session_id: result.current.sessionId!,
          role: "assistant",
          content: "Hi there!",
          created_at: new Date().toISOString(),
        },
      ];

      // Save messages
      act(() => {
        result.current.saveMessages(testMessages);
      });

      // Verify localStorage was called
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "vana_guest_messages",
        JSON.stringify(testMessages)
      );

      // Load messages from a new hook instance
      const { result: result2 } = renderHook(() => useGuestSession(false));
      const loadedMessages = result2.current.loadMessages();

      expect(loadedMessages).toEqual(testMessages);
    });

    it("should limit messages to MAX_STORED_MESSAGES", () => {
      const { result } = renderHook(() => useGuestSession(false));

      // Create more than the maximum allowed messages
      const messages: ChatMessage[] = Array.from({ length: 60 }, (_, i) => ({
        id: `msg-${i}`,
        session_id: result.current.sessionId!,
        role: "user" as const,
        content: `Message ${i}`,
        created_at: new Date().toISOString(),
      }));

      act(() => {
        result.current.saveMessages(messages);
      });

      // Should only save the last 50 messages
      const savedMessages = JSON.parse(
        (localStorageMock.setItem as jest.Mock).mock.calls.find(
          ([key]) => key === "vana_guest_messages"
        )[1]
      );

      expect(savedMessages).toHaveLength(50);
      expect(savedMessages[0].content).toBe("Message 10"); // First saved is index 10
      expect(savedMessages[49].content).toBe("Message 59");
    });

    it("should clear messages correctly", () => {
      const { result } = renderHook(() => useGuestSession(false));

      const testMessages: ChatMessage[] = [
        {
          id: "1",
          session_id: result.current.sessionId!,
          role: "user",
          content: "Hello",
          created_at: new Date().toISOString(),
        },
      ];

      // Save messages first
      act(() => {
        result.current.saveMessages(testMessages);
      });

      // Clear messages
      act(() => {
        result.current.clearMessages();
      });

      // Verify localStorage was cleared
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("vana_guest_messages");
    });

    it("should handle localStorage errors gracefully", () => {
      // Mock localStorage to throw an error
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      });

      const { result } = renderHook(() => useGuestSession(false));

      const testMessages: ChatMessage[] = [
        {
          id: "1",
          session_id: result.current.sessionId!,
          role: "user",
          content: "Hello",
          created_at: new Date().toISOString(),
        },
      ];

      // Should not throw an error
      expect(() => {
        act(() => {
          result.current.saveMessages(testMessages);
        });
      }).not.toThrow();
    });

    it("should not save messages when authenticated", () => {
      const { result } = renderHook(() => useGuestSession(true));

      const testMessages: ChatMessage[] = [
        {
          id: "1",
          session_id: result.current.sessionId!,
          role: "user",
          content: "Hello",
          created_at: new Date().toISOString(),
        },
      ];

      // Save messages
      act(() => {
        result.current.saveMessages(testMessages);
      });

      // Should not save to localStorage when authenticated
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        "vana_guest_messages",
        expect.any(String)
      );
    });

    it("should clear messages when user authenticates", () => {
      const { result, rerender } = renderHook(
        ({ isAuthenticated }) => useGuestSession(isAuthenticated),
        {
          initialProps: { isAuthenticated: false },
        }
      );

      // Save messages as guest
      const testMessages: ChatMessage[] = [
        {
          id: "1",
          session_id: result.current.sessionId!,
          role: "user",
          content: "Hello",
          created_at: new Date().toISOString(),
        },
      ];

      act(() => {
        result.current.saveMessages(testMessages);
      });

      // Authenticate user
      rerender({ isAuthenticated: true });

      // Should clear messages from localStorage
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("vana_guest_messages");
    });
  });

  describe("Backward Compatibility", () => {
    it("should maintain existing rate limiting behavior", () => {
      const { result } = renderHook(() => useGuestSession(false));

      expect(result.current.messageCount).toBe(0);
      expect(result.current.maxMessages).toBe(20);
      expect(result.current.canSendMessage).toBe(true);
      expect(result.current.hasReachedLimit).toBe(false);
      expect(result.current.showWarning).toBe(false);

      // Increment message count
      act(() => {
        result.current.incrementMessageCount();
      });

      expect(result.current.messageCount).toBe(1);
      expect(result.current.canSendMessage).toBe(true);
    });
  });
});