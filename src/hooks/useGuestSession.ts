import { useState, useEffect, useCallback } from "react";

const GUEST_SESSION_KEY = "vana_guest_session";
const MAX_GUEST_MESSAGES = 20; // Updated from 10
const SESSION_DURATION = 5 * 60 * 60 * 1000; // 5 hours (updated from 24)
const WARNING_THRESHOLD = 0.75; // Show warning at 75% (15/20 messages)

export interface GuestSession {
  id: string;
  messageCount: number;
  createdAt: number;
  sessionExpiry: number;
}

interface GuestSessionReturn {
  isGuest: boolean;
  messageCount: number;
  maxMessages: number;
  canSendMessage: boolean;
  incrementMessageCount: () => void;
  resetSession: () => void;
  hasReachedLimit: boolean;
  showWarning: boolean; // True when at 75% threshold (15/20 messages)
  resetTime: number | null; // Timestamp when the session resets
}

/**
 * Manages guest user session tracking for message limits
 * Allows 20 free messages per 5-hour window before requiring authentication
 * Shows warning at 75% threshold (15/20 messages)
 */
export const useGuestSession = (isAuthenticated: boolean): GuestSessionReturn => {
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);

  /**
   * Initialize or load guest session with comprehensive error handling
   * Handles: private browsing, quota exceeded, access denied
   */
  useEffect(() => {
    if (isAuthenticated) {
      // Clear guest session when user authenticates
      try {
        localStorage.removeItem(GUEST_SESSION_KEY);
      } catch (error) {
        console.error("Failed to remove guest session from localStorage:", error);
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
        };
        setGuestSession(inMemorySession);
        return;
      }

      if (stored) {
        try {
          const session: GuestSession = JSON.parse(stored);

          // Check if session has expired
          if (Date.now() < session.sessionExpiry) {
            setGuestSession(session);
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
  }, [isAuthenticated]);

  /**
   * Increment message count with error handling
   */
  const incrementMessageCount = useCallback(() => {
    if (!guestSession || isAuthenticated) return;

    const updated: GuestSession = {
      ...guestSession,
      messageCount: Math.min(guestSession.messageCount + 1, MAX_GUEST_MESSAGES),
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
   * Reset session with error handling
   */
  const resetSession = useCallback(() => {
    try {
      localStorage.removeItem(GUEST_SESSION_KEY);
    } catch (error) {
      console.error("Failed to remove guest session from localStorage:", error);
    }
    setGuestSession(null);
  }, []);

  const messageCount = guestSession?.messageCount || 0;
  const hasReachedLimit = messageCount >= MAX_GUEST_MESSAGES;
  const canSendMessage = isAuthenticated || !hasReachedLimit;
  const showWarning = messageCount >= Math.floor(MAX_GUEST_MESSAGES * WARNING_THRESHOLD);
  const resetTime = guestSession?.sessionExpiry || null;

  return {
    isGuest: !isAuthenticated,
    messageCount,
    maxMessages: MAX_GUEST_MESSAGES,
    canSendMessage,
    incrementMessageCount,
    resetSession,
    hasReachedLimit,
    showWarning,
    resetTime,
  };
};
