import { useState, useEffect, useCallback } from "react";
import { ChatMessage } from "@/types/chat";

const GUEST_SESSION_KEY = "vana_guest_session";
const GUEST_MESSAGES_KEY = "vana_guest_messages";
const MAX_GUEST_MESSAGES = 20; // Updated from 10
const MAX_STORED_MESSAGES = 50; // Maximum messages to store in localStorage
const SESSION_DURATION = 5 * 60 * 60 * 1000; // 5 hours (updated from 24)
const WARNING_THRESHOLD = 0.75; // Show warning at 75% (15/20 messages)

export interface GuestSession {
  id: string;
  messageCount: number;
  createdAt: number;
  sessionExpiry: number;
  messages: ChatMessage[];
  lastSaved: number;
}

interface GuestSessionReturn {
  isGuest: boolean;
  sessionId: string | null; // UUID for guest session (used for artifact bundling)
  messageCount: number;
  maxMessages: number;
  canSendMessage: boolean;
  incrementMessageCount: () => void;
  resetSession: () => void;
  hasReachedLimit: boolean;
  showWarning: boolean; // True when at 75% threshold (15/20 messages)
  resetTime: number | null; // Timestamp when the session resets
  // Message persistence functions
  saveMessages: (messages: ChatMessage[]) => void;
  loadMessages: () => ChatMessage[];
  clearMessages: () => void;
}

/**
 * Manages guest user session tracking for message limits and persistence
 * Allows 20 free messages per 5-hour window before requiring authentication
 * Shows warning at 75% threshold (15/20 messages)
 *
 * Enhanced with localStorage message persistence:
 * - Stores chat messages locally for guest sessions
 * - Maximum 50 messages stored to prevent overflow
 * - Handles localStorage errors gracefully (private browsing, quota exceeded)
 * - Maintains backward compatibility with existing rate limiting
 */
export const useGuestSession = (isAuthenticated: boolean): GuestSessionReturn => {
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);

  /**
   * Helper function to load messages from localStorage with error handling
   */
  const loadMessagesFromStorage = useCallback((): ChatMessage[] | null => {
    try {
      const stored = localStorage.getItem(GUEST_MESSAGES_KEY);
      if (stored) {
        const messages = JSON.parse(stored);
        // Validate that it's an array of messages
        if (Array.isArray(messages)) {
          return messages;
        }
      }
    } catch (error) {
      console.warn("Failed to load messages from localStorage:", error);
    }
    return null;
  }, []);

  /**
   * Helper function to save messages to localStorage with error handling and size limits
   */
  const saveMessagesToStorage = useCallback((messages: ChatMessage[]): boolean => {
    try {
      // Limit the number of stored messages to prevent localStorage overflow
      const limitedMessages = messages.slice(-MAX_STORED_MESSAGES);

      // Try to save to localStorage
      localStorage.setItem(GUEST_MESSAGES_KEY, JSON.stringify(limitedMessages));
      return true;
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === "QuotaExceededError") {
          console.warn("localStorage quota exceeded while saving messages. Keeping only the most recent messages.");
          // Try again with a smaller batch
          try {
            const reducedMessages = messages.slice(-Math.floor(MAX_STORED_MESSAGES / 2));
            localStorage.setItem(GUEST_MESSAGES_KEY, JSON.stringify(reducedMessages));
            return true;
          } catch (fallbackError) {
            console.error("Even reduced messages couldn't be saved:", fallbackError);
          }
        } else if (error.name === "SecurityError") {
          console.warn("localStorage access denied while saving messages (private browsing)");
        } else {
          console.error("Failed to save messages to localStorage:", error);
        }
      } else {
        console.error("Unexpected error saving messages:", error);
      }
      return false;
    }
  }, []);

  /**
   * Initialize or load guest session with comprehensive error handling
   * Handles: private browsing, quota exceeded, access denied
   */
  useEffect(() => {
    if (isAuthenticated) {
      // Clear guest session and messages when user authenticates
      try {
        localStorage.removeItem(GUEST_SESSION_KEY);
        localStorage.removeItem(GUEST_MESSAGES_KEY);
      } catch (error) {
        console.error("Failed to remove guest session or messages from localStorage:", error);
      }
      setGuestSession(null);
      return;
    }

    // Load existing session or create new one
    const loadOrCreateSession = () => {
      let stored: string | null = null;

      // Try to read from localStorage with error handling
      try {
        stored = localStorage.getItem(GUEST_SESSION_KEY);
      } catch (error) {
        // Private browsing mode or localStorage disabled
        console.warn("localStorage access denied, guest session will be in-memory only:", error);
        // Create in-memory session (won't persist across page reloads)
        const inMemorySession: GuestSession = {
          id: crypto.randomUUID(),
          messageCount: 0,
          createdAt: Date.now(),
          sessionExpiry: Date.now() + SESSION_DURATION,
          messages: [],
          lastSaved: Date.now(),
        };
        setGuestSession(inMemorySession);
        return;
      }

      if (stored) {
        try {
          const session: GuestSession = JSON.parse(stored);

          // Check if session has expired
          if (Date.now() < session.sessionExpiry) {
            // Load messages for the session
            const messages = loadMessagesFromStorage();
            setGuestSession({
              ...session,
              messages: messages || [],
              lastSaved: Date.now(),
            });
            return;
          }
        } catch (error) {
          console.error("Failed to parse guest session, creating new one:", error);
        }
      }

      // Create new session
      const newSession: GuestSession = {
        id: crypto.randomUUID(),
        messageCount: 0,
        createdAt: Date.now(),
        sessionExpiry: Date.now() + SESSION_DURATION,
        messages: [],
        lastSaved: Date.now(),
      };

      // Try to save to localStorage
      try {
        localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(newSession));
      } catch (error) {
        // Handle quota exceeded or other storage errors
        if (error instanceof DOMException) {
          if (error.name === "QuotaExceededError") {
            console.warn("localStorage quota exceeded, guest session in-memory only");
          } else if (error.name === "SecurityError") {
            console.warn("localStorage access denied (private browsing), session in-memory only");
          } else {
            console.error("Failed to save guest session to localStorage:", error);
          }
        } else {
          console.error("Unexpected error saving guest session:", error);
        }
        // Continue with in-memory session
      }

      setGuestSession(newSession);
    };

    loadOrCreateSession();
  }, [isAuthenticated, loadMessagesFromStorage]);

  /**
   * Increment message count with error handling
   */
  const incrementMessageCount = useCallback(() => {
    if (!guestSession || isAuthenticated) return;

    const updated: GuestSession = {
      ...guestSession,
      messageCount: Math.min(guestSession.messageCount + 1, MAX_GUEST_MESSAGES),
      lastSaved: Date.now(),
    };

    try {
      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(updated));
    } catch (error) {
      // Handle storage errors gracefully
      if (error instanceof DOMException) {
        if (error.name === "QuotaExceededError") {
          console.warn("localStorage quota exceeded while incrementing message count");
        } else if (error.name === "SecurityError") {
          console.warn("localStorage access denied while incrementing message count");
        } else {
          console.error("Failed to save message count to localStorage:", error);
        }
      } else {
        console.error("Unexpected error saving message count:", error);
      }
      // Continue with in-memory update
    }

    setGuestSession(updated);
  }, [guestSession, isAuthenticated]);

  /**
   * Save messages to localStorage with error handling
   */
  const saveMessages = useCallback((messages: ChatMessage[]) => {
    if (!guestSession || isAuthenticated) return;

    // Update session with new messages
    const updated: GuestSession = {
      ...guestSession,
      messages: messages.slice(-MAX_STORED_MESSAGES), // Keep only recent messages
      lastSaved: Date.now(),
    };

    // Save messages to localStorage
    saveMessagesToStorage(messages);

    // Update session in localStorage
    try {
      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to save session with messages:", error);
    }

    setGuestSession(updated);
  }, [guestSession, isAuthenticated, saveMessagesToStorage]);

  /**
   * Load messages from localStorage
   */
  const loadMessages = useCallback((): ChatMessage[] => {
    if (isAuthenticated) return [];

    const messages = loadMessagesFromStorage();
    return messages || [];
  }, [isAuthenticated, loadMessagesFromStorage]);

  /**
   * Clear stored messages
   */
  const clearMessages = useCallback(() => {
    if (isAuthenticated) return;

    try {
      localStorage.removeItem(GUEST_MESSAGES_KEY);
    } catch (error) {
      console.error("Failed to clear messages from localStorage:", error);
    }

    // Update session to clear messages
    if (guestSession) {
      const updated: GuestSession = {
        ...guestSession,
        messages: [],
        lastSaved: Date.now(),
      };

      try {
        localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to update session after clearing messages:", error);
      }

      setGuestSession(updated);
    }
  }, [isAuthenticated, guestSession]);

  /**
   * Reset session with error handling
   */
  const resetSession = useCallback(() => {
    try {
      localStorage.removeItem(GUEST_SESSION_KEY);
      localStorage.removeItem(GUEST_MESSAGES_KEY);
    } catch (error) {
      console.error("Failed to remove guest session or messages from localStorage:", error);
    }
    setGuestSession(null);
  }, []);

  const sessionId = guestSession?.id || null;
  const messageCount = guestSession?.messageCount || 0;
  const hasReachedLimit = messageCount >= MAX_GUEST_MESSAGES;
  const canSendMessage = isAuthenticated || !hasReachedLimit;
  const showWarning = messageCount >= Math.floor(MAX_GUEST_MESSAGES * WARNING_THRESHOLD);
  const resetTime = guestSession?.sessionExpiry || null;

  return {
    isGuest: !isAuthenticated,
    sessionId,
    messageCount,
    maxMessages: MAX_GUEST_MESSAGES,
    canSendMessage,
    incrementMessageCount,
    resetSession,
    hasReachedLimit,
    showWarning,
    resetTime,
    // Message persistence functions
    saveMessages,
    loadMessages,
    clearMessages,
  };
};
