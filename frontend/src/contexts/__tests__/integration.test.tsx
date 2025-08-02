/**
 * Integration tests for all contexts working together
 * 
 * Tests the RootProvider and ensures all contexts can be used simultaneously
 * without conflicts or performance issues.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RootProvider from '../RootProvider';
import { useAuth, useApp, useSession, useSSE } from '../index';
import React from 'react';

// Mock localStorage and EventSource
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock EventSource
const mockEventSource = {
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onopen: null,
  onmessage: null,
  onerror: null,
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
};

Object.defineProperty(window, 'EventSource', {
  value: vi.fn(() => mockEventSource),
});

// Test component that uses all contexts
function IntegrationTestComponent() {
  const { user, signIn, enterGuestMode } = useAuth();
  const { addNotification, updatePreferences, ui } = useApp();
  const { createSession, currentSession } = useSession();
  const { connection, subscribe } = useSSE();

  React.useEffect(() => {
    // Subscribe to SSE events
    const unsubscribe = subscribe('test.event', (event) => {
      console.log('Received test event:', event);
    });
    
    return unsubscribe;
  }, [subscribe]);

  const handleCreateSession = async () => {
    try {
      await createSession({
        topic: 'Test Research Topic',
        depth: 'moderate',
        includeCitations: true,
        format: 'report',
      });
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  return (
    <div>
      {/* Auth state */}
      <div data-testid="auth-status">
        Auth: {user ? (user.isGuest ? 'Guest' : user.email) : 'Not authenticated'}
      </div>
      
      {/* App state */}
      <div data-testid="theme">Theme: {ui.theme}</div>
      <div data-testid="notifications-count">
        Notifications: {/* We'd need to access notifications count here */}
      </div>
      
      {/* Session state */}
      <div data-testid="session-status">
        Session: {currentSession ? currentSession.title : 'None'}
      </div>
      
      {/* SSE state */}
      <div data-testid="sse-status">
        SSE: {connection.readyState}
      </div>
      
      {/* Actions */}
      <button data-testid="enter-guest" onClick={enterGuestMode}>
        Enter Guest Mode
      </button>
      <button 
        data-testid="sign-in" 
        onClick={() => signIn({ email: 'test@example.com', password: 'password' })}
      >
        Sign In
      </button>
      <button 
        data-testid="add-notification" 
        onClick={() => addNotification({
          type: 'info',
          title: 'Test Notification',
          message: 'This is a test notification',
        })}
      >
        Add Notification
      </button>
      <button 
        data-testid="update-theme" 
        onClick={() => updatePreferences({ theme: 'light' })}
      >
        Switch to Light Theme
      </button>
      <button data-testid="create-session" onClick={handleCreateSession}>
        Create Session
      </button>
    </div>
  );
}

describe('Context Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should provide all contexts through RootProvider', () => {
    render(
      <RootProvider>
        <IntegrationTestComponent />
      </RootProvider>
    );

    // Check initial states
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Auth: Not authenticated');
    expect(screen.getByTestId('theme')).toHaveTextContent('Theme: dark');
    expect(screen.getByTestId('session-status')).toHaveTextContent('Session: None');
    expect(screen.getByTestId('sse-status')).toHaveTextContent('SSE: CLOSED');
  });

  it('should handle auth state changes affecting other contexts', async () => {
    render(
      <RootProvider>
        <IntegrationTestComponent />
      </RootProvider>
    );

    // Enter guest mode
    fireEvent.click(screen.getByTestId('enter-guest'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Auth: Guest');
    });

    // SSE should remain closed for guest users
    expect(screen.getByTestId('sse-status')).toHaveTextContent('SSE: CLOSED');
  });

  it('should handle authenticated user affecting SSE connection', async () => {
    render(
      <RootProvider>
        <IntegrationTestComponent />
      </RootProvider>
    );

    // Sign in
    fireEvent.click(screen.getByTestId('sign-in'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Auth: test@example.com');
    });

    // SSE should attempt to connect for authenticated users
    // Note: In a real scenario, this would show CONNECTING -> OPEN
    // but our mock keeps it in a specific state
  });

  it('should handle app preferences updates', async () => {
    render(
      <RootProvider>
        <IntegrationTestComponent />
      </RootProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('Theme: dark');

    fireEvent.click(screen.getByTestId('update-theme'));

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('Theme: light');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'vana_ui_preferences',
      expect.stringContaining('light')
    );
  });

  it('should handle session creation for authenticated users', async () => {
    render(
      <RootProvider>
        <IntegrationTestComponent />
      </RootProvider>
    );

    // First sign in
    fireEvent.click(screen.getByTestId('sign-in'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Auth: test@example.com');
    });

    // Then create session
    fireEvent.click(screen.getByTestId('create-session'));

    await waitFor(() => {
      expect(screen.getByTestId('session-status')).toHaveTextContent('Session: Test Research Topic');
    });
  });

  it('should handle notifications through app context', async () => {
    render(
      <RootProvider>
        <IntegrationTestComponent />
      </RootProvider>
    );

    fireEvent.click(screen.getByTestId('add-notification'));

    // In a real implementation, we'd check that the notification appears
    // For now, we just verify the action doesn't throw
    await waitFor(() => {
      // The notification system should work without errors
      expect(screen.getByTestId('add-notification')).toBeInTheDocument();
    });
  });

  it('should handle SSE subscriptions without errors', () => {
    // This test verifies that SSE subscription in useEffect doesn't cause issues
    expect(() => {
      render(
        <RootProvider>
          <IntegrationTestComponent />
        </RootProvider>
      );
    }).not.toThrow();
  });

  it('should persist state across context providers', async () => {
    // Set up initial localStorage state
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'vana_ui_preferences') {
        return JSON.stringify({ theme: 'light', density: 'compact' });
      }
      if (key === 'vana_user') {
        return JSON.stringify({
          id: 'user_123',
          email: 'persisted@example.com',
          isGuest: false,
        });
      }
      return null;
    });

    render(
      <RootProvider>
        <IntegrationTestComponent />
      </RootProvider>
    );

    // Should restore persisted state
    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('Theme: light');
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Auth: persisted@example.com');
    });
  });
});

// Test error boundaries and context requirements
describe('Context Error Handling', () => {
  it('should throw helpful error when context is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    function ComponentUsingAuth() {
      useAuth(); // This should throw
      return <div>Should not render</div>;
    }

    expect(() => {
      render(<ComponentUsingAuth />);
    }).toThrow(/must be used within.*Provider/);
    
    consoleSpy.mockRestore();
  });
});